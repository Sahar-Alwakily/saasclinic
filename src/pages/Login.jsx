import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../APIFirebase/firebase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

const Icon = ({ name, className = '' }) => (
  <span className={`ms ${className}`} aria-hidden="true">{name}</span>
);

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, dir, lang, setLang, langs } = useLocale();
  const { user, userMeta, loading: authLoading } = useAuth();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const arabic = lang === 'ar';

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
    <div dir={dir} className="waraf-landing min-h-screen bg-[#FDFBF7] text-[#161D26]">
      <div className="min-h-screen grid lg:grid-cols-12">
        <section className="hidden lg:flex lg:col-span-7 bg-[#111822] text-white relative overflow-hidden flex-col justify-between p-12 xl:p-16 border-s border-white/5">
          <div className="absolute -top-32 end-10 w-96 h-96 bg-[#1F5C4D]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 start-10 w-80 h-80 bg-[#C5A880]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1F5C4D] to-[#0F382E] text-[#F8F4EE] flex items-center justify-center font-bold text-2xl border border-[#C5A880]/30">و</span>
              <span>
                <span className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">وَرَف</span>
                  <span className="text-xs text-[#C5A880] italic tracking-widest font-semibold">| WARAF</span>
                </span>
                <span className="block text-[10.5px] tracking-wider text-white/50 uppercase">Aesthetic Clinic Operating System</span>
              </span>
            </Link>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#C5A880]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              منظومة تشغيل العيادات السريرية
            </span>
          </div>
          <div className="relative z-10 my-auto py-12 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1F5C4D]/25 border border-[#1F5C4D]/40 text-[#F8F4EE] text-xs font-semibold mb-6">
              <Icon name="auto_awesome" className="!text-[15px] text-[#C5A880]" />
              {arabic ? 'الجيل الرقمي الأرقى لإدارة مراكز التجميل' : t('os')}
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.25] tracking-tight mb-6 whitespace-pre-line">{t('login.h1')}</h1>
            <p className="text-white/70 text-base leading-relaxed mb-10 max-w-lg">
              {arabic ? 'كونسول موحّد يجمع المواعيد المجدولة، قائمة الانتظار الذكية لملء الفراغات، واسترجاع العميلات مع السجل السريري الرقمي.' : t('login.lead')}
            </p>
            <div className="grid grid-cols-3 gap-3.5">
              <Feature icon="calendar_month" title={arabic ? 'إدارة المواعيد' : 'Schedule'} body={arabic ? 'جدولة الغرف وتأكيد العربون' : 'Rooms and deposits'} />
              <Feature icon="auto_awesome" title={arabic ? 'استرجاع ذكي' : 'Win-back'} body={arabic ? 'إعادة المريضات المنقطعات' : 'Bring clients back'} gold />
              <Feature icon="clinical_notes" title={arabic ? 'الملف السريري' : 'Chart'} body={arabic ? 'توثيق الجرعات والإقرارات' : 'Doses and consent'} />
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-between text-xs text-white/45 pt-6 border-t border-white/10">
            <span>{t('login.foot')}</span>
            <span className="italic tracking-wider text-[#C5A880]/70">WARAF © {new Date().getFullYear()}</span>
          </div>
        </section>

        <main className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-[#FDFBF7]">
          <header className="flex items-center justify-between w-full mb-8">
            <Link to="/" className="flex items-center gap-2.5 lg:hidden">
              <span className="w-9 h-9 rounded-xl bg-[#1F5C4D] text-[#F8F4EE] flex items-center justify-center font-bold text-xl">و</span>
              <span>
                <span className="font-bold text-base text-[#161D26]">وَرَف</span>
                <span className="block text-[9px] text-[#717985]">Aesthetic Clinic OS</span>
              </span>
            </Link>
            <LangPill lang={lang} langs={langs} setLang={setLang} />
          </header>

          <div className="w-full max-w-md mx-auto my-auto">
            <div className="mb-7">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EDF5F2] text-[#1F5C4D] text-xs font-bold mb-3">
                <Icon name="lock" className="!text-[14px]" />
                {arabic ? 'بوابة طاقم العيادة' : t('login.title')}
              </div>
              <h2 className="text-2xl sm:text-[27px] font-bold text-[#161D26] tracking-tight">
                {arabic ? 'تسجيل الدخول إلى كونسول العيادة' : t('login.title')}
              </h2>
              <p className="text-xs sm:text-sm text-[#717985] mt-2 leading-relaxed">
                {arabic ? 'أدخلي بريدكِ الإلكتروني وكلمة المرور لمتابعة تشغيل العيادة ومواعيد اليوم.' : t('login.lead')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-7 border border-[#EAE6DF] shadow-[0_25px_60px_-20px_rgba(22,29,38,0.09)] space-y-5">
              {error && <div className="bg-[#FDF2F0] text-[#B83A2E] text-sm p-3 rounded-xl" role="alert">{error}</div>}
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold text-[#161D26]">{arabic ? 'البريد الإلكتروني المهني' : t('login.email')}</span>
                <span className="relative block">
                  <Icon name="mail" className="!text-[19px] absolute top-1/2 -translate-y-1/2 end-3.5 text-[#717985] pointer-events-none" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" autoComplete="email" placeholder="name@clinic.com" className="w-full bg-white border border-[#EAE6DF] rounded-xl pe-10 ps-3.5 py-2.5 text-sm text-[#161D26] outline-none focus:border-[#1F5C4D] focus:ring-2 focus:ring-[#1F5C4D]/20" />
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold text-[#161D26]">{t('login.password')}</span>
                <span className="relative block">
                  <Icon name="key" className="!text-[19px] absolute top-1/2 -translate-y-1/2 right-3.5 text-[#717985] pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" autoComplete="current-password" className="w-full bg-white border border-[#EAE6DF] rounded-xl pr-10 pl-10 py-2.5 text-sm text-[#161D26] outline-none focus:border-[#1F5C4D] focus:ring-2 focus:ring-[#1F5C4D]/20" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 -translate-y-1/2 left-3 text-[#717985]" aria-label={showPassword ? 'hide' : 'show'}>
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="!text-[18px]" />
                  </button>
                </span>
              </label>
              <button type="submit" disabled={loading || authLoading} className="w-full py-3 rounded-xl bg-[#1F5C4D] hover:bg-[#164439] text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
                <span>{loading || (user && authLoading) ? t('login.opening') : (arabic ? 'دخول مساحة العمل' : t('login.submit'))}</span>
                <Icon name="arrow_back" className="!text-base" />
              </button>
              <p className="pt-3 border-t border-[#F2EFEA] text-center text-xs text-[#717985]">
                {arabic ? 'ليس لديكِ حساب عيادة؟' : t('login.noAccount')}{' '}
                <Link to="/register" className="font-bold text-[#1F5C4D] underline">{arabic ? 'أنشئي مساحة عمل جديدة' : t('login.create')}</Link>
              </p>
            </form>
          </div>
          <footer className="mt-8 pt-4 text-center text-[11px] text-[#717985]/70">
            وَرَف | WARAF • {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, body, gold = false }) => (
  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${gold ? 'bg-[#C5A880]/20 text-[#C5A880]' : 'bg-[#1F5C4D]/30 text-emerald-300'}`}>
      <Icon name={icon} className="!text-[18px]" />
    </div>
    <p className="text-sm font-bold text-white mb-1">{title}</p>
    <p className="text-[11.5px] text-white/50 leading-snug">{body}</p>
  </div>
);

const LangPill = ({ lang, langs, setLang }) => (
  <div className="ms-auto flex items-center bg-white border border-[#EAE6DF] rounded-full p-1 text-xs font-semibold" role="navigation" aria-label="Language">
    {langs.map((item) => (
      <button key={item.id} type="button" onClick={() => setLang(item.id)} className={`px-2.5 py-1 rounded-full ${lang === item.id ? 'bg-[#1F5C4D] text-white' : 'text-[#717985] hover:text-[#161D26]'}`}>
        {item.id === 'ar' ? 'العربية' : item.id.toUpperCase()}
      </button>
    ))}
  </div>
);

export default Login;
