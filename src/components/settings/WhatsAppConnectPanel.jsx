import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { database, functions } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';

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

  const status = viewStatus(onboarding, otpRequired);
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
      setError('Only the clinic owner can connect WhatsApp.');
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
            setError('Meta signup was cancelled.');
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
      setError('Start Connect WhatsApp again before entering the code.');
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
    <section className="saas-card p-5 space-y-4 max-w-lg">
      <h2 className="font-bold text-[#111827]">Connect WhatsApp</h2>
      {status === 'connected' && <p className="font-bold">Connected</p>}
      {status === 'pending' && <p className="font-bold">Pending</p>}
      {status === 'otp' && <p className="font-bold">OTP Required</p>}
      {status === 'connected' && (
        <div className="text-sm space-y-1">
          <p dir="ltr">{onboarding?.displayNumber}</p>
          <p dir="ltr">senderStatus: ONLINE</p>
        </div>
      )}
      {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
      {status !== 'connected' && (
        <>
          <label className="block text-sm">
            Phone number
            <input className="mt-1 w-full p-3 border rounded-xl" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9725..." />
          </label>
          <button type="button" disabled={!!busy} onClick={connect} className="px-4 py-2.5 rounded-xl bg-[#10b981] text-white font-bold disabled:opacity-50">
            {busy === 'connect' ? 'Connecting...' : 'Connect WhatsApp'}
          </button>
        </>
      )}
      {status === 'otp' && (
        <div className="space-y-2">
          <label className="block text-sm">
            OTP
            <input className="mt-1 w-full p-3 border rounded-xl" dir="ltr" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
          </label>
          <button type="button" disabled={!!busy || !otp.trim()} onClick={submitOtp} className="px-4 py-2.5 rounded-xl bg-[#111827] text-white font-bold disabled:opacity-50">
            {busy === 'otp' ? 'Checking code...' : 'Submit OTP'}
          </button>
        </div>
      )}
    </section>
  );
};

export default WhatsAppConnectPanel;
