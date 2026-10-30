import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { database, functions } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { toast } from 'react-toastify';

const field = 'w-full p-3 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200';

const STATUS = {
  online: 'متصل',
  registering: 'بانتظار اعتماد المرسل',
  pending_signup: 'بانتظار إكمال ميتا',
  disconnected: 'غير متصل',
  suspended: 'موقوف من المنصة',
  error: 'تعذّر التسجيل',
};

function loadFacebookSdk(appId, version) {
  return new Promise((resolve, reject) => {
    const init = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
      resolve(window.FB);
    };
    if (window.FB) {
      init();
      return;
    }
    window.fbAsyncInit = init;
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.onerror = () => reject(new Error('تعذّر تحميل نافذة ميتا'));
    document.body.appendChild(script);
  });
}

const WhatsAppConnectPanel = () => {
  const { clinicId, isAdmin } = useClinic();
  const [messaging, setMessaging] = useState(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clinicId) return undefined;
    return onValue(ref(database, `clinics/${clinicId}/messaging`), (snap) => {
      const value = snap.val();
      setMessaging(value);
      if (value?.onboarding?.displayNumber) setPhone(value.onboarding.displayNumber);
    });
  }, [clinicId]);

  const onboarding = messaging?.onboarding || {};
  const status = onboarding.status || 'disconnected';
  const connected = status === 'online';

  const call = (name, data) => httpsCallable(functions, name)(data);

  const connect = async () => {
    if (!isAdmin) return toast.error('ربط واتساب لصاحب العيادة');
    setBusy(true);
    try {
      const prepared = await call('prepareWhatsAppConnect', { clinicId, phoneE164: phone.trim() });
      const data = prepared.data || {};
      if (!data.ok) {
        toast.error(data.error || 'تعذّر بدء الربط');
        return;
      }
      const FB = await loadFacebookSdk(data.embedded.appId, data.embedded.graphVersion);
      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener('message', onMessage);
          resolve();
        };
        const onMessage = async (event) => {
          if (!String(event.origin || '').endsWith('facebook.com')) return;
          let payload;
          try { payload = JSON.parse(event.data); } catch { return; }
          if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
          if (payload.event === 'FINISH' || payload.event === 'FINISH_ONLY_WABA') {
            const done = await call('completeWhatsAppOnboarding', {
              clinicId,
              state: data.state,
              phoneE164: data.phoneE164,
              wabaId: payload.data?.waba_id,
              phoneNumberId: payload.data?.phone_number_id,
            });
            const result = done.data || {};
            if (result.connected) toast.success('واتساب متصل وجاهز للإرسال');
            else if (result.ok) toast.info(`سجّلت Twilio المرسل بحالة ${result.senderStatus || 'غير مكتملة'}. حدّث الحالة بعد الاعتماد.`);
            else toast.error(result.error || 'لم يكتمل تسجيل المرسل');
          } else if (payload.event === 'CANCEL') {
            toast.info('أُلغي التسجيل في ميتا قبل اكتماله');
          } else if (payload.event === 'ERROR') {
            toast.error(payload.data?.error_message || 'أعادت ميتا خطأ أثناء التسجيل');
          }
          finish();
        };
        window.addEventListener('message', onMessage);
        FB.login(() => setTimeout(finish, 8000), {
          config_id: data.embedded.configId,
          auth_type: 'rerequest',
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            sessionInfoVersion: 3,
            setup: { solutionID: data.embedded.solutionId },
          },
        });
      });
    } catch (err) {
      toast.error(err.message || 'تعذّر الربط');
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const res = await call('syncWhatsAppSender', { clinicId });
      const data = res.data || {};
      if (data.connected) toast.success('المرسل متصل');
      else toast.info(data.error || `حالة Twilio: ${data.senderStatus || 'غير متصلة'}`);
    } catch (err) {
      toast.error(err.message || 'تعذّر التحديث');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('فصل رقم واتساب هذه العيادة؟ الحساب الفرعي يبقى لإعادة الربط.')) return;
    setBusy(true);
    try {
      const res = await call('disconnectWhatsApp', { clinicId });
      if (res.data?.error) toast.error(res.data.error);
      else toast.success('تم فصل واتساب');
    } catch (err) {
      toast.error(err.message || 'تعذّر الفصل');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="saas-card p-5 space-y-4">
      <div>
        <h2 className="font-bold text-[#111827]">واتساب العيادة</h2>
        <p className="text-sm text-[#8a9199] mt-1">الربط يتم عبر حساب المنصة. لا حاجة لحساب Twilio أو رموز دخول.</p>
      </div>
      <p className="text-sm">
        <span className={`nura-chip ${connected ? 'nura-chip-mint' : status === 'error' || status === 'suspended' ? 'nura-chip-rose' : 'nura-chip-gold'}`}>
          {STATUS[status] || status}
        </span>
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div><dt className="text-[#8a9199]">الرقم</dt><dd className="font-bold" dir="ltr">{onboarding.displayNumber || '—'}</dd></div>
        <div><dt className="text-[#8a9199]">اسم النشاط</dt><dd className="font-bold">{onboarding.businessName || '—'}</dd></div>
        <div><dt className="text-[#8a9199]">حالة المرسل</dt><dd className="font-bold" dir="ltr">{onboarding.senderStatus || '—'}</dd></div>
      </dl>
      {onboarding.lastError && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{onboarding.lastError}</p>}
      {!connected && (
        <label className="block text-sm font-bold text-[#111827]">
          رقم واتساب العيادة
          <input className={`${field} mt-1`} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9725..." />
          <span className="block text-xs font-normal text-[#8a9199] mt-1">صيغة دولية. ميتا تتحقق من ملكية الرقم أثناء التسجيل، وTwilio تحتاج الرقم كاملاً.</span>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {!connected && (
          <button type="button" disabled={busy || !isAdmin} onClick={connect} className="px-4 py-2.5 rounded-xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-50">
            {status === 'disconnected' ? 'ربط واتساب' : 'إعادة الربط'}
          </button>
        )}
        <button type="button" disabled={busy} onClick={refresh} className="px-4 py-2.5 rounded-xl bg-[#f8faf9] border border-[#e4eee8] text-sm font-bold">تحديث الحالة</button>
        {status !== 'disconnected' && (
          <button type="button" disabled={busy || !isAdmin} onClick={disconnect} className="px-4 py-2.5 rounded-xl text-sm font-bold text-rose-700">فصل</button>
        )}
      </div>
    </section>
  );
};

export default WhatsAppConnectPanel;
