import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { database, functions } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';

const field = 'mt-1 w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const primary = 'inline-flex items-center justify-center rounded-lg bg-[#059669] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#047857] disabled:opacity-50';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-bold text-[#047857]';
const chipGold = 'rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#B45309]';
const chipSky = 'rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[10px] font-bold text-[#0369A1]';
const chipMuted = 'rounded-full border border-[#E4EAEE] bg-[#F4F7F8] px-2.5 py-0.5 text-[10px] font-bold text-[#64748B]';

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
    script.onerror = () => reject(new Error('Could not load the Meta signup window.'));
    document.body.appendChild(script);
  });
}

function viewStatus(onboarding, otpRequired) {
  const sender = String(onboarding?.senderStatus || '').toUpperCase();
  if (sender === 'ONLINE' || onboarding?.status === 'online') return 'connected';
  if (otpRequired || sender === 'OTP_REQUIRED') return 'otp';
  if (onboarding?.status && onboarding.status !== 'disconnected') return 'pending';
  return 'idle';
}

const STATUS_AR = {
  connected: { label: 'متصل', chip: chipMint },
  pending: { label: 'قيد الربط', chip: chipGold },
  otp: { label: 'يلزم رمز التحقق', chip: chipSky },
  idle: { label: 'غير مربوط', chip: chipMuted },
};

const WhatsAppConnectPanel = () => {
  const { clinicId, isAdmin } = useClinic();
  const [onboarding, setOnboarding] = useState(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [session, setSession] = useState(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clinicId) return undefined;
    return onValue(ref(database, `clinics/${clinicId}/messaging/onboarding`), (snap) => {
      const value = snap.val();
      setOnboarding(value);
      if (value?.displayNumber) setPhone(value.displayNumber);
      if (String(value?.senderStatus || '').toUpperCase() === 'OTP_REQUIRED') setOtpRequired(true);
      if (String(value?.senderStatus || '').toUpperCase() === 'ONLINE' || value?.status === 'online') setOtpRequired(false);
    });
  }, [clinicId]);

  const statusKey = viewStatus(onboarding, otpRequired);
  const statusUi = STATUS_AR[statusKey];
  const call = (name, data) => httpsCallable(functions, name)(data);

  const finishSignup = async (payload) => {
    const done = await call('completeWhatsAppOnboarding', payload);
    const result = done.data || {};
    if (result.senderStatus === 'OTP_REQUIRED') {
      setOtpRequired(true);
      setSession(payload);
      setError(result.error || 'OTP Required');
      return result;
    }
    setOtpRequired(false);
    if (!result.ok && !result.connected) setError(result.error || 'WhatsApp registration failed.');
    else setError('');
    return result;
  };

  const connect = async () => {
    setError('');
    if (!isAdmin) {
      setError('فقط مالكة العيادة يمكنها ربط واتساب.');
      return;
    }
    setBusy('connect');
    try {
      const prepared = await call('prepareWhatsAppConnect', {
        clinicId,
        phoneE164: phone.trim(),
        numberSource: 'clinic',
      });
      const data = prepared.data || {};
      if (!data.ok) {
        setError(data.error || 'Could not start WhatsApp signup.');
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
            await finishSignup({
              clinicId,
              state: data.state,
              phoneE164: data.phoneE164,
              wabaId: payload.data?.waba_id,
              phoneNumberId: payload.data?.phone_number_id,
            });
          } else if (payload.event === 'CANCEL') {
            setError('أُلغي الربط من ميتا.');
          } else if (payload.event === 'ERROR') {
            setError(payload.data?.error_message || 'Meta returned an error.');
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
      setError(err.message || 'Could not connect WhatsApp.');
    } finally {
      setBusy('');
    }
  };

  const submitOtp = async () => {
    setError('');
    if (!session) {
      setError('أعيدي «ربط واتساب» قبل إدخال الرمز.');
      return;
    }
    setBusy('otp');
    try {
      const saved = await call('submitWhatsAppOtp', { clinicId, code: otp.trim() });
      if (!saved.data?.ok) {
        setError(saved.data?.error || 'Could not save the code.');
        return;
      }
      await finishSignup(session);
    } catch (err) {
      setError(err.message || 'Could not submit the code.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="relative max-w-lg overflow-hidden rounded-lg border border-[#E4EAEE] bg-white p-4">
      <span className="absolute inset-y-0 start-0 w-[3px] bg-[#059669]" />
      <div className="ps-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-[#0F172A]">ربط واتساب الرسمي</h2>
          <span className={statusUi.chip}>{statusUi.label}</span>
        </div>
        <p className="mt-1 text-[12px] text-[#64748B]">ربط عبر ميتا لإرسال قوالب التذكير والمتابعة.</p>
        {statusKey === 'connected' && (
          <div className="mt-3 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] p-3 text-[13px]">
            <p className="font-bold" dir="ltr">{onboarding?.displayNumber}</p>
            <p className="mt-1 text-[11px] text-[#64748B]">الحالة: متصل</p>
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]">{error}</p>
        )}
        {statusKey !== 'connected' && (
          <div className="mt-4 space-y-3">
            <label className="block text-[12px] font-bold text-[#64748B]">
              رقم الهاتف
              <input className={field} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9725..." />
            </label>
            <button type="button" disabled={!!busy} onClick={connect} className={primary}>
              {busy === 'connect' ? 'جاري الربط...' : 'ربط واتساب'}
            </button>
          </div>
        )}
        {statusKey === 'otp' && (
          <div className="mt-4 space-y-2">
            <label className="block text-[12px] font-bold text-[#64748B]">
              رمز التحقق
              <input className={field} dir="ltr" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            </label>
            <button
              type="button"
              disabled={!!busy || !otp.trim()}
              onClick={submitOtp}
              className="w-full rounded-lg bg-[#0F172A] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {busy === 'otp' ? 'جاري التحقق...' : 'إرسال الرمز'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default WhatsAppConnectPanel;