import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { database, functions } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { toast } from 'react-toastify';
import {
  WA_REMINDER_EVENTS, SAMPLE_TEMPLATE_VARS, STATUS_LABELS_AR,
  bodyHasRequiredVars, mergeTemplateRecord, previewTemplateBody, policyBindingForEvent,
  parseReminderHours,
} from '../../utils/waReminderTemplates';

const field = 'w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 outline-none dark:text-white';

const VAR_HINT = {
  waitlist: '{{1}} الاسم · {{2}} العيادة · {{3}} التاريخ والساعة · {{4}} رابط القبول',
  followup: '{{1}} الاسم · {{2}} العيادة · {{3}} آخر زيارة · {{4}} رابط الحجز',
};

const SAMPLE_BY_EVENT = {
  waitlist: { 3: '28/10/2026 10:00 ص', 4: 'رابط القبول' },
  followup: { 3: 'زيارة سابقة', 4: 'رابط الحجز' },
};

const statusTone = {
  draft: 'bg-stone-100 text-stone-600',
  pending: 'bg-amber-50 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-800',
  rejected: 'bg-rose-50 text-rose-700',
  unavailable: 'bg-gray-100 text-gray-500',
};

const WhatsAppRemindersPanel = ({ policy = {} }) => {
  const { clinicPath, clinicId, clinicInfo } = useClinic();
  const [messaging, setMessaging] = useState(null);
  const [records, setRecords] = useState({});
  const [busy, setBusy] = useState('');
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u1 = onValue(ref(database, clinicPath('messaging')), (s) => setMessaging(s.val()));
    const u2 = onValue(ref(database, clinicPath('waReminderTemplates')), (s) => setRecords(s.val() || {}));
    return () => { u1(); u2(); };
  }, [clinicPath]);

  const connected = Boolean(messaging?.twilio?.hasAuthToken && messaging?.twilio?.whatsappFrom && messaging?.numberActive);
  const sender = messaging?.twilio?.whatsappFrom || messaging?.displayNumber || '';

  const cards = useMemo(
    () => WA_REMINDER_EVENTS.map((ev) => {
      const rec = mergeTemplateRecord(ev.id, records[ev.id]);
      const body = drafts[ev.id] != null ? drafts[ev.id] : rec.body;
      return { ev, rec: { ...rec, body } };
    }),
    [records, drafts],
  );

  const saveLocal = async (eventId, patch) => {
    await update(ref(database, clinicPath(`waReminderTemplates/${eventId}`)), {
      ...mergeTemplateRecord(eventId, records[eventId]),
      ...patch,
      eventId,
    });
  };

  const submit = async (eventId, body) => {
    if (!bodyHasRequiredVars(body)) return toast.error('أبقي المتغيرات {{1}} {{2}} {{3}} {{4}} في النص');
    setBusy(eventId);
    try {
      const fn = httpsCallable(functions, 'submitWaReminderTemplate');
      const res = await fn({ clinicId, eventId, body });
      if (res.data?.ok) toast.success('أُرسل القالب لاعتماد واتساب عبر Twilio');
      else toast.info(res.data?.error || 'لم يؤكد Twilio الاعتماد بعد');
    } catch (err) {
      toast.error(err.message || 'تعذّر الإرسال إلى Twilio — الخادم غير منشور بعد');
    } finally {
      setBusy('');
    }
  };

  const sync = async (eventId) => {
    setBusy(`sync-${eventId}`);
    try {
      const fn = httpsCallable(functions, 'syncWaReminderTemplate');
      const res = await fn({ clinicId, eventId });
      if (!res.data?.ok) toast.info(res.data?.error || 'تعذّر مزامنة الحالة من Twilio');
      else toast.success('حُدّثت حالة الاعتماد من Twilio');
    } catch (err) {
      toast.error(err.message || 'المزامنة تحتاج Cloud Functions');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="font-product text-2xl">قوالب تذكير واتساب</h3>
        <p className="text-sm text-stone-500 mt-1">
          هذه القوالب مربوطة بقواعد العيادة أعلاه: ساعات التذكير ({parseReminderHours(policy).join('، ') || '—'}) · سقف {policy.reminderCap ?? 3} رسائل لكل موعد.
        </p>
        <div className="mt-4 rounded-2xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-4 text-sm">
          {connected ? (
            <p>واتساب مربوط · المرسل <span dir="ltr" className="font-mono">{sender}</span></p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p>واتساب غير مربوط — القالب ما بينرسل قبل تفعيل الربط.</p>
              <Link to="/settings?tab=whatsapp" className="text-xs font-bold text-emerald-700">الإعدادات ← واتساب</Link>
            </div>
          )}
        </div>
      </div>

      {cards.map(({ ev, rec }) => {
        const preview = previewTemplateBody(rec.body, {
          ...SAMPLE_TEMPLATE_VARS,
          2: clinicInfo?.name || SAMPLE_TEMPLATE_VARS[2],
          ...(SAMPLE_BY_EVENT[ev.id] || {}),
        });
        const status = rec.approvalStatus || 'draft';
        return (
          <article key={ev.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold">{ev.label}</h4>
                {(() => {
                  const bind = policyBindingForEvent(ev.id, policy);
                  return (
                    <p className={`text-xs mt-1 ${bind.bound ? 'text-[#3F5E57]' : 'text-amber-700'}`}>{bind.rule}</p>
                  );
                })()}
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusTone[status] || statusTone.draft}`}>
                {STATUS_LABELS_AR[status] || status}
              </span>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={rec.enabled !== false}
                  onChange={(e) => saveLocal(ev.id, { enabled: e.target.checked, body: rec.body })}
                />
                تفعيل
              </label>
            </div>
            <textarea
              dir="rtl"
              className={field}
              rows={3}
              value={rec.body}
              onChange={(e) => setDrafts((d) => ({ ...d, [ev.id]: e.target.value }))}
              onBlur={() => saveLocal(ev.id, { body: rec.body, enabled: rec.enabled !== false })}
            />
            <p className="text-[11px] text-stone-400">المتغيرات: {VAR_HINT[ev.id] || '{{1}} الاسم · {{2}} العيادة · {{3}} التاريخ · {{4}} الساعة'}</p>
            <div className="rounded-2xl bg-[#042f24] text-[#5eead4] p-4 text-sm leading-relaxed" dir="rtl">
              <p className="text-[10px] tracking-widest uppercase text-white/40 mb-1">معاينة</p>
              {preview}
            </div>
            {status === 'pending' && <p className="text-xs text-amber-700">بانتظار اعتماد واتساب — لن يُرسل هذا القالب حتى يؤكد Twilio الحالة «معتمد».</p>}
            {status === 'rejected' && <p className="text-xs text-rose-700">مرفوض{rec.rejectionReason ? `: ${rec.rejectionReason}` : ''}. عدّلي النص وأعيدي الإرسال.</p>}
            {status === 'unavailable' && <p className="text-xs text-stone-500">غير متاح لهذا المرسل. اربطي واتساب أو زامني الحالة من Twilio.</p>}
            {rec.contentSid && <p className="text-[11px] font-mono text-stone-400" dir="ltr">ContentSid {rec.contentSid}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!busy || !connected} onClick={() => submit(ev.id, rec.body)} className="px-4 py-2 rounded-xl bg-[#172B3A] text-white text-sm font-bold disabled:opacity-40">
                {busy === ev.id ? 'جاري الإرسال…' : rec.contentSid ? 'إعادة الإرسال للاعتماد' : 'إنشاء وإرسال للاعتماد'}
              </button>
              <button type="button" disabled={!!busy || !rec.contentSid} onClick={() => sync(ev.id)} className="px-4 py-2 rounded-xl bg-[#F7F8F6] text-sm font-bold disabled:opacity-40">
                مزامنة الحالة
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default WhatsAppRemindersPanel;
