import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, set } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { database, functions } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { toast } from 'react-toastify';
import { FaWhatsapp, FaSave } from 'react-icons/fa';
import {
  DEFAULT_MESSAGING, mergeMessaging, providerReady, makeVerifyToken,
} from '../../utils/messaging';

const field = 'w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 outline-none dark:text-white';

const WhatsAppProviderPanel = () => {
  const { clinicPath, clinicId, clinicInfo } = useClinic();
  const [form, setForm] = useState(DEFAULT_MESSAGING);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicPath) return undefined;
    return onValue(ref(database, clinicPath('messaging')), (snap) => {
      const merged = mergeMessaging(snap.val());
      if (!merged.autoReply.greeting) {
        merged.autoReply.greeting = `مرحباً بكِ في ${clinicInfo?.name || 'العيادة'}. هذا الرد الآلي — اكتبي «حجز» أو انتظري رد الفريق في ساعات العمل.`;
      }
      setForm(merged);
    });
  }, [clinicPath, clinicInfo?.name]);

  const ready = providerReady(form);
  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const patchTwilio = (key, value) => setForm((prev) => ({ ...prev, twilio: { ...prev.twilio, [key]: value } }));
  const patchMeta = (key, value) => setForm((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  const patchReply = (key, value) => setForm((prev) => ({ ...prev, autoReply: { ...prev.autoReply, [key]: value } }));

  const webhookHint = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/book/${clinicId || 'clinic'}/wa-webhook`;
  }, [clinicId]);

  const save = async (extra = {}) => {
    if (!clinicPath) return false;
    setLoading(true);
    try {
      const payload = mergeMessaging({ ...form, ...extra, updatedAt: Date.now() });
      if (!payload.meta.verifyToken) payload.meta.verifyToken = makeVerifyToken(clinicId);
      const typedToken = String(payload.twilio?.authToken || '').trim();
      payload.twilio = {
        accountSid: payload.twilio.accountSid,
        whatsappFrom: payload.twilio.whatsappFrom,
        hasAuthToken: Boolean(payload.twilio.hasAuthToken || typedToken),
      };
      if (payload.provider === 'twilio' && typedToken) {
        try {
          const fn = httpsCallable(functions, 'saveTwilioConnection');
          const res = await fn({
            clinicId,
            accountSid: form.twilio.accountSid,
            authToken: typedToken,
            whatsappFrom: form.twilio.whatsappFrom,
            displayNumber: payload.displayNumber,
          });
          if (!res.data?.ok) {
            toast.error(res.data?.error || 'Twilio لم يؤكد الحساب');
            return false;
          }
          payload.numberActive = true;
          payload.twilio.hasAuthToken = true;
          payload.twilio.authToken = '';
        } catch (err) {
          toast.error(err.message || 'تعذّر حفظ التوكن على الخادم. لا يُحفظ Auth Token في المتصفح.');
          return false;
        }
      }
      await set(ref(database, clinicPath('messaging')), payload);
      setForm({ ...payload, twilio: { ...payload.twilio, authToken: '' } });
      toast.success('حُفظت إعدادات واتساب — ليست جزءاً من الموقع العام');
      return true;
    } catch {
      toast.error('تعذّر الحفظ');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const activate = async () => {
    if (form.provider === 'twilio') {
      if (!form.twilio.accountSid || !form.twilio.whatsappFrom) return toast.info('كمّلي بيانات Twilio');
      if (!form.twilio.hasAuthToken && !form.twilio.authToken) return toast.info('أدخلي Auth Token ليُحفظ على الخادم');
      if (!form.displayNumber) return toast.info('أدخلي رقم الواتساب الذي سيُفعَّل');
      await save({ numberActive: true, autoReply: { ...form.autoReply, enabled: true } });
      return;
    }
    if (!ready) return toast.info('كمّلي بيانات المزود المختار قبل تفعيل الرقم');
    if (!form.displayNumber) return toast.info('أدخلي رقم الواتساب الذي سيُفعَّل');
    await save({ numberActive: true, autoReply: { ...form.autoReply, enabled: true } });
  };

  return (
    <div className="space-y-5 max-w-3xl" dir="rtl">
      <div className="rounded-[1.6rem] p-6 text-white" style={{ background: 'linear-gradient(135deg,#042f24,#12352e 55%,#172B3A)' }}>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#5eead4]">تشغيل · ليس الموقع</p>
        <h2 className="font-product text-2xl md:text-3xl mt-1 flex items-center gap-2"><FaWhatsapp /> واتساب والرد الآلي</h2>
        <p className="text-white/65 text-sm mt-2">
          هنا تُربَط العيادة بمزوّد Twilio أو ميتا لتفعيل رقم الواتساب.{' '}
          <Link to="/appointments/reminders" className="text-[#5eead4] font-bold underline">قوالب التذكير من التذكيرات والقواعد</Link>
        </p>
        <p className="text-xs mt-3">
          {form.numberActive && ready
            ? <span className="text-[#5eead4] font-bold">الرقم مفعّل للرد الآلي</span>
            : ready
              ? <span className="text-[#fde68a]">المزوّد مكتمل — فعّلي الرقم</span>
              : <span className="text-white/50">المزوّد غير مكتمل بعد</span>}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
        <p className="text-sm font-bold">المزوّد</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'meta', label: 'ميتا · Cloud API' },
            { id: 'twilio', label: 'Twilio' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => patch('provider', p.id)}
              className={`py-3 rounded-xl text-sm font-bold border ${form.provider === p.id ? 'bg-[#042f24] text-white border-[#042f24]' : 'border-gray-200 text-gray-500'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="block text-sm font-bold">رقم الواتساب للتفعيل
          <input
            value={form.displayNumber}
            onChange={(e) => patch('displayNumber', e.target.value)}
            className={`${field} mt-1`}
            dir="ltr"
            placeholder="9725..."
          />
        </label>
      </div>

      {form.provider === 'meta' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
          <h3 className="font-bold">ميتا · WhatsApp Business</h3>
          <p className="text-xs text-gray-500">من Meta for Developers: رقم الهاتف (Phone number ID) وحساب واتساب للأعمال (WABA) ورمز الوصول الدائم.</p>
          <label className="block text-sm">Phone number ID<input value={form.meta.phoneNumberId} onChange={(e) => patchMeta('phoneNumberId', e.target.value)} className={`${field} mt-1`} dir="ltr" /></label>
          <label className="block text-sm">WABA ID<input value={form.meta.wabaId} onChange={(e) => patchMeta('wabaId', e.target.value)} className={`${field} mt-1`} dir="ltr" /></label>
          <label className="block text-sm">رمز الوصول<input type="password" value={form.meta.accessToken} onChange={(e) => patchMeta('accessToken', e.target.value)} className={`${field} mt-1`} dir="ltr" autoComplete="off" /></label>
          <label className="block text-sm">App secret<input type="password" value={form.meta.appSecret} onChange={(e) => patchMeta('appSecret', e.target.value)} className={`${field} mt-1`} dir="ltr" autoComplete="off" /></label>
          <label className="block text-sm">Verify token (للويب هوك)
            <div className="flex gap-2 mt-1">
              <input value={form.meta.verifyToken} onChange={(e) => patchMeta('verifyToken', e.target.value)} className={field} dir="ltr" />
              <button type="button" className="px-3 rounded-xl bg-[#F7F8F6] text-xs font-bold" onClick={() => patchMeta('verifyToken', makeVerifyToken(clinicId))}>توليد</button>
            </div>
          </label>
        </div>
      )}

      {form.provider === 'twilio' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
          <h3 className="font-bold">Twilio · WhatsApp sender</h3>
          <p className="text-xs text-gray-500">Account SID وAuth Token ورقم واتساب المعتمد لدى Twilio (مثل whatsapp:+14155238886).</p>
          <label className="block text-sm">Account SID<input value={form.twilio.accountSid} onChange={(e) => patchTwilio('accountSid', e.target.value)} className={`${field} mt-1`} dir="ltr" /></label>
          <label className="block text-sm">Auth Token<input type="password" value={form.twilio.authToken} onChange={(e) => patchTwilio('authToken', e.target.value)} className={`${field} mt-1`} dir="ltr" autoComplete="off" /></label>
          <label className="block text-sm">رقم الإرسال WhatsApp From<input value={form.twilio.whatsappFrom} onChange={(e) => patchTwilio('whatsappFrom', e.target.value)} className={`${field} mt-1`} dir="ltr" placeholder="whatsapp:+9725..." /></label>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
        <h3 className="font-bold">الرد الآلي</h3>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={!!form.autoReply.enabled} onChange={(e) => patchReply('enabled', e.target.checked)} />
          تفعيل الرد الآلي على الرسائل الواردة
        </label>
        <label className="block text-sm">رسالة الترحيب
          <textarea value={form.autoReply.greeting} onChange={(e) => patchReply('greeting', e.target.value)} className={`${field} mt-1`} rows={3} />
        </label>
        <label className="block text-sm">إن لم تُفهم الرسالة
          <textarea value={form.autoReply.fallback} onChange={(e) => patchReply('fallback', e.target.value)} className={`${field} mt-1`} rows={2} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">هدوء من<input type="number" value={form.autoReply.quietStart} onChange={(e) => patchReply('quietStart', Number(e.target.value))} className={`${field} mt-1`} /></label>
          <label className="text-sm">هدوء حتى<input type="number" value={form.autoReply.quietEnd} onChange={(e) => patchReply('quietEnd', Number(e.target.value))} className={`${field} mt-1`} /></label>
        </div>
        <p className="text-xs text-gray-400">الرد الآلي يُحفَظ هنا. الإرسال الفعلي يتم بعد ربط الويب هوك عند ميتا أو Twilio.</p>
      </div>

      <div className="bg-[#F7F8F6] dark:bg-slate-800 rounded-3xl p-5 text-sm space-y-1">
        <p className="font-bold">ويب هوك (عند المزود)</p>
        <p className="text-xs text-gray-500">انسخيه في Twilio أو ميتا بعد تجهيز الخادم. رمز التحقق أعلاه لميتا.</p>
        <p className="font-mono text-xs break-all" dir="ltr">{webhookHint}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" disabled={loading} onClick={() => save()} className="flex-1 py-3 rounded-xl bg-white border border-gray-200 font-bold">
          <FaSave className="inline ml-2" /> حفظ بدون تفعيل
        </button>
        <button type="button" disabled={loading} onClick={activate} className="flex-1 py-3 rounded-xl bg-[#25D366] text-[#042f24] font-bold">
          تفعيل الرقم للرد الآلي
        </button>
      </div>
    </div>
  );
};

export default WhatsAppProviderPanel;
