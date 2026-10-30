import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../APIFirebase/firebase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import LangSwitcher from '../components/i18n/LangSwitcher';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, dir } = useLocale();
  const { user, userMeta, loading: authLoading } = useAuth();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    if (next) {
      navigate(next, { replace: true });
      return;
    }
    if (userMeta?.clinicId) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setLoading(false);
    if (!userMeta) setError(t('login.noClinic'));
  }, [authLoading, user, userMeta, navigate, t, next]);

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
    <div dir={dir} className="min-h-screen grid md:grid-cols-[1.05fr_1fr] bg-[#F7F8F6]">
      <div className="hidden md:flex flex-col justify-between p-10 text-white bg-[#172B3A]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">{t('brand')}</p>
          <LangSwitcher />
        </div>
        <div className="space-y-4 max-w-md">
          <p className="text-xs text-[#8fafa6]">{t('os')}</p>
          <h1 className="text-4xl leading-tight font-semibold whitespace-pre-line">{t('login.h1')}</h1>
          <p className="text-white/65 text-sm leading-relaxed">{t('login.lead')}</p>
        </div>
        <p className="text-xs text-white/40">{t('login.foot')}</p>
      </div>
      <div className="flex items-center justify-center p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-lg p-6 sm:p-8 border border-[#E5E9EC] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="md:hidden text-lg font-semibold">{t('brand')}</p>
            <div className="md:hidden ms-auto"><LangSwitcher tone="light" /></div>
          </div>
          <h2 className="text-xl font-semibold text-[#202A32]">{t('login.title')}</h2>
          {error && <div className="bg-[#f8ecea] text-[#9A3F32] text-sm p-3 rounded-md" role="alert">{error}</div>}
          <label className="block text-xs text-[#75818B]">{t('login.email')}
            <input type="email" placeholder={t('login.email')} value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full p-2.5 border border-[#E5E9EC] rounded-md outline-none focus:border-[#658B83] bg-white text-sm" dir="ltr" />
          </label>
          <label className="block text-xs text-[#75818B]">{t('login.password')}
            <input type="password" placeholder={t('login.password')} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full p-2.5 border border-[#E5E9EC] rounded-md outline-none focus:border-[#658B83] bg-white text-sm" dir="ltr" />
          </label>
          <button type="submit" disabled={loading || authLoading} className="w-full py-2.5 rounded-md bg-[#172B3A] text-white text-sm font-semibold hover:bg-[#122330] disabled:opacity-60">
            {loading || (user && authLoading) ? t('login.opening') : t('login.submit')}
          </button>
          <p className="text-center text-sm text-[#75818B]">{t('login.noAccount')} <Link to="/register" className="text-[#172B3A] font-semibold">{t('login.create')}</Link></p>
        </form>
      </div>
    </div>
  );
};

export default Login;
