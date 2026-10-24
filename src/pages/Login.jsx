import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../APIFirebase/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import LangSwitcher from '../components/i18n/LangSwitcher';

const Login = () => {
  const navigate = useNavigate();
  const { t, dir } = useLocale();
  const { user, userMeta, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    if (userMeta?.clinicId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setLoading(false);
    if (!userMeta) setError(t('login.noClinic'));
  }, [authLoading, user, userMeta, navigate, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError(t('login.badCreds'));
      setLoading(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen grid md:grid-cols-2" style={{ background: '#14121c' }}>
      <div className="hidden md:flex flex-col justify-between p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(77,124,255,.35),transparent_40%),radial-gradient(circle_at_90%_80%,rgba(255,107,74,.28),transparent_42%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="font-product text-3xl">{t('brand')}</p>
          <LangSwitcher />
        </div>
        <div className="relative space-y-4">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#22c9a0]">{t('os')}</p>
          <h1 className="font-product text-5xl leading-[1.05] whitespace-pre-line">{t('login.h1')}</h1>
          <p className="text-white/60 max-w-sm">{t('login.lead')}</p>
        </div>
        <p className="relative text-xs text-white/35">{t('login.foot')}</p>
      </div>
      <div className="flex items-center justify-center p-4 sm:p-6 bg-[#f3efe6]">
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#fffcf7] rounded-[1.75rem] p-6 sm:p-8 border border-[#e4ddd0] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="md:hidden font-product text-xl">{t('brand')}</p>
            <div className="md:hidden ms-auto"><LangSwitcher tone="light" /></div>
          </div>
          <h2 className="font-product text-2xl">{t('login.title')}</h2>
          {error && <div className="bg-[#ff6b4a]/10 text-[#c2410c] text-sm p-3 rounded-xl">{error}</div>}
          <input type="email" placeholder={t('login.email')} value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border border-[#e4ddd0] rounded-xl outline-none focus:border-[#4d7cff] bg-white" dir="ltr" />
          <input type="password" placeholder={t('login.password')} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border border-[#e4ddd0] rounded-xl outline-none focus:border-[#4d7cff] bg-white" dir="ltr" />
          <button type="submit" disabled={loading || authLoading} className="w-full py-3 rounded-xl bg-[#4d7cff] text-white font-bold hover:bg-[#3b6af0] disabled:opacity-60">
            {loading || (user && authLoading) ? t('login.opening') : t('login.submit')}
          </button>
          <p className="text-center text-sm text-stone-500">{t('login.noAccount')} <Link to="/register" className="text-[#4d7cff] font-semibold">{t('login.create')}</Link></p>
        </form>
      </div>
    </div>
  );
};

export default Login;
