import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ref, update, push, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { SUPPORT_TOKEN_KEY, useAuth } from '../context/AuthContext';

export default function SupportAccess() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading, supportSession, userMeta } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    try { sessionStorage.setItem(SUPPORT_TOKEN_KEY, token); } catch { /* ignore */ }
    window.dispatchEvent(new Event('nora-support-token'));
  }, [token]);

  useEffect(() => {
    if (loading || !user || !supportSession) return undefined;
    if (supportSession.adminUid !== user.uid) {
      setError('هذه الجلسة مربوطة بحساب سوبر أدمن آخر.');
      return undefined;
    }
    if (supportSession.status === 'ended' || (supportSession.expiresAt && supportSession.expiresAt < Date.now())) {
      setError('انتهت صلاحية جلسة الدعم.');
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        await update(ref(database, `platform/supportSessions/${token}`), { startedAt: Date.now(), status: 'active' });
        await set(push(ref(database, 'platform/auditLog')), {
          type: 'impersonate_start',
          title: `بدأت جلسة دعم على ${supportSession.clinicName || supportSession.clinicId}`,
          clinicId: supportSession.clinicId,
          clinicName: supportSession.clinicName || '',
          by: user.email,
          at: Date.now(),
        });
        await set(push(ref(database, `clinics/${supportSession.clinicId}/adminAudit`)), {
          action: 'impersonate_start',
          title: 'دخول مسؤولة دعم إلى لوحة العيادة',
          by: user.email,
          at: Date.now(),
        });
      } catch { /* rules may block duplicate writes */ }
      if (!cancelled) navigate('/dashboard', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [loading, user, supportSession, token, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#172B3A] text-white/70">جاري فتح جلسة الدعم...</div>;
  if (!user) return <Navigate to={`/login?next=/impersonate/${token}`} replace />;
  if (userMeta?.role === 'support' && userMeta.clinicId) return <Navigate to="/dashboard" replace />;

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#F7F8F6] p-6">
      <div className="max-w-md bg-white border border-[#E5E9EC] rounded-2xl p-8 space-y-3 text-center">
        <h1 className="text-xl font-semibold">دخول كمسؤولة دعم</h1>
        {error ? <p className="text-sm text-[#9A3F32]">{error}</p> : <p className="text-sm text-[#75818B]">التحقق من الجلسة...</p>}
        <Link to="/login" className="text-sm font-semibold text-[#172B3A]">تسجيل الدخول</Link>
      </div>
    </div>
  );
}
