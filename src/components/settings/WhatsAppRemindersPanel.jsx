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

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]';

const VAR_HINT = {
  waitlist: '{{1}} الاسم · {{2}} العيادة · {{3}} التاريخ والساعة · {{4}} رابط القبول',
  followup: '{{1}} الاسم · {{2}} العيادة · {{3}} آخر زيارة · {{4}} رابط الحجز',
};

const SAMPLE_BY_EVENT = {
  waitlist: { 3: '28/10/2026 10:00 ص', 4: 'رابط القبول' },
  followup: { 3: 'زيارة سابقة', 4: 'رابط الحجز' },
};

const statusTone = {
  draft: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]',
  pending: 'bg-[#FFFBEB] text-[#B45309] border-[#F3E2C2]',
  approved: 'bg-[#ECFDF5] text-[#047857] border-[#C9EEE0]',
  rejected: 'bg-[#FEF2F2] text-[#DC2626] border-[#F7D3D3]',
  unavailable: 'bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]',
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
      <div className="rounded-xl border border-[#E4EAEE] bg-white p-5">
        <h3 className="text-[14px] font-extrabold">قوالب تذكير واتساب</h3>
        <p className="mt-1 text-[11px] text-[#64748B]">
          هذه القوالب مربوطة بقواعد العيادة أعلاه: ساعات التذكير ({parseReminderHours(policy).join('، ') || '—'}) · سقف {policy.reminderCap ?? 3} رسائل لكل موعد.
        </p>
        <div className="mt-3 rounded-lg border border-[#EDF1F4] bg-[#FAFCFC] p-3 text-[11.5px] text-[#334155]">
          {connected ? (
            <p className="flex flex-wrap items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#059669]" /> واتساب مربوط · المرسل <span dir="ltr" className="font-mono text-[#0E7490]">{sender}</span></p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p>واتساب غير مربوط — القالب ما بينرسل قبل تفعيل الربط.</p>
              <Link to="/settings?tab=whatsapp" className="text-[11px] font-bold text-[#0E7490] hover:text-[#059669]">الإعدادات ← واتساب</Link>
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
          <article key={ev.id} className="space-y-3 rounded-xl border border-[#E4EAEE] bg-white p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-extrabold text-[#0F172A]">{ev.label}</h4>
                {(() => {
                  const bind = policyBindingForEvent(ev.id, policy);
                  return (
                    <p className={`mt-1 text-[10.5px] ${bind.bound ? 'text-[#047857]' : 'text-[#B45309]'}`}>{bind.rule}</p>
                  );
                })()}
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone[status] || statusTone.draft}`}>
                {STATUS_LABELS_AR[status] || status}
              </span>
              <label className="flex items-center gap-1 text-[10.5px] text-[#64748B]">
                <input
                  type="checkbox"
                  className="accent-[#059669]"
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
            <p className="text-[10px] text-[#94A3B8]">المتغيرات: {VAR_HINT[ev.id] || '{{1}} الاسم · {{2}} العيادة · {{3}} التاريخ · {{4}} الساعة'}</p>
            <div className="rounded-lg bg-[#0F172A] p-3 text-[12px] leading-relaxed text-[#5EEAD4]" dir="rtl">
              <p className="mb-1 text-[9.5px] uppercase tracking-widest text-white/40">معاينة</p>
              {preview}
            </div>
            {status === 'pending' && <p className="text-[10.5px] text-[#B45309]">بانتظار اعتماد واتساب — لن يُرسل هذا القالب حتى يؤكد Twilio الحالة «معتمد».</p>}
            {status === 'rejected' && <p className="text-[10.5px] text-[#DC2626]">مرفوض{rec.rejectionReason ? `: ${rec.rejectionReason}` : ''}. عدّلي النص وأعيدي الإرسال.</p>}
            {status === 'unavailable' && <p className="text-[10.5px] text-[#94A3B8]">غير متاح لهذا المرسل. اربطي واتساب أو زامني الحالة من Twilio.</p>}
            {rec.contentSid && <p className="font-mono text-[10px] text-[#94A3B8]" dir="ltr">ContentSid {rec.contentSid}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!busy || !connected} onClick={() => submit(ev.id, rec.body)} className="rounded-lg bg-[#059669] px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-40">
                {busy === ev.id ? 'جاري الإرسال…' : rec.contentSid ? 'إعادة الإرسال للاعتماد' : 'إنشاء وإرسال للاعتماد'}
              </button>
              <button type="button" disabled={!!busy || !rec.contentSid} onClick={() => sync(ev.id)} className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490] disabled:opacity-40">
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
