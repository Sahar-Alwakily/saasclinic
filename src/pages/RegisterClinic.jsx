import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, push } from 'firebase/database';
import { auth, database } from '../APIFirebase/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { getPlan } from '../config/plans';
import { createDefaultSections } from '../sections/defaultSections';
import { useLocale } from '../context/LocaleContext';

const Icon = ({ name, className = '' }) => (
  <span className={`ms ${className}`} aria-hidden="true">{name}</span>
);

const fieldClass = 'w-full pe-10 ps-3 py-2.5 bg-[#FDFBF7]/60 border border-[#E8E4DC] rounded-xl text-sm text-[#1E2229] outline-none focus:bg-white focus:border-[#1F5C4D] focus:ring-1 focus:ring-[#1F5C4D]';

const RegisterClinic = () => {
  const navigate = useNavigate();
  const { t, dir, lang, setLang, langs } = useLocale();
  const trialDays = getPlan('trial').durationDays;
  const arabic = lang === 'ar';
  const [form, setForm] = useState({
    clinicName: '', ownerName: '', email: '', password: '', phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) return setError(t('register.shortPass'));
    if (!form.clinicName.trim() || !form.ownerName.trim()) return setError(t('register.required'));

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const uid = cred.user.uid;
      const clinicId = `clinic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const trialEndsAt = now + trialDays * 24 * 60 * 60 * 1000;

      await set(ref(database, `clinics/${clinicId}/info`), {
        name: form.clinicName.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.email.trim(),
        phone: form.phone.trim(),
        plan: 'trial',
        createdAt: now,
        trialStartedAt: now,
        trialEndsAt,
        isActive: true,
        storeTheme: 'beauty',
        websitePublished: true,
        subscriptionStatus: 'trial',
        paymentStatus: 'none',
        sections: createDefaultSections(),
      });

      await set(ref(database, `clinics/${clinicId}/users/${uid}`), {
        email: form.email.trim(), name: form.ownerName.trim(), role: 'admin', createdAt: now,
      });

      await set(ref(database, `meta/users/${uid}`), {
        clinicId, role: 'admin', email: form.email.trim(),
      });

      await set(ref(database, `meta/clinics/${clinicId}`), {
        name: form.clinicName.trim(),
        ownerEmail: form.email.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        plan: 'trial',
        createdAt: now,
        trialStartedAt: now,
        trialEndsAt,
        isActive: true,
        storeTheme: 'beauty',
        websitePublished: true,
        subscriptionStatus: 'trial',
        staffCount: 1,
        bookingCount: 0,
        clientCount: 0,
        orderCount: 0,
        lastActivityAt: now,
      });
      await push(ref(database, 'platform/activity'), {
        type: 'clinic_registered',
        title: 'تسجيل عيادة جديدة',
        clinicId,
        clinicName: form.clinicName.trim(),
        at: now,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? t('register.emailUsed') : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={dir} className="waraf-landing min-h-screen bg-[#FDFBF7] text-[#1E2229] flex flex-col">
      <header className="w-full border-b border-[#E8E4DC] bg-[#FDFBF7]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1F5C4D] to-[#0F382E] text-white flex items-center justify-center font-bold text-xl border border-[#C5A880]/30">و</span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight">وَرَف</span>
                <span className="text-xs text-[#C5A880] italic tracking-widest font-semibold">| WARAF</span>
              </span>
              <span className="block text-[10px] tracking-wider text-[#8C93A0] uppercase">Aesthetic Clinic Operating System</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full p-1 bg-white border border-[#E8E4DC] text-xs font-semibold" role="navigation" aria-label="Language">
              {langs.map((item) => (
                <button key={item.id} type="button" onClick={() => setLang(item.id)} className={`px-2.5 py-1 rounded-full ${lang === item.id ? 'bg-[#1F5C4D] text-white' : 'text-[#6B7280]'}`}>
                  {item.id === 'ar' ? 'العربية' : item.id.toUpperCase()}
                </button>
              ))}
            </div>
            <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold hover:text-[#1F5C4D]">
              {t('register.login')} <Icon name="arrow_back" className="!text-[17px]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6">
        <div className="max-w-6xl w-full grid lg:grid-cols-12 gap-8 items-stretch">
          <aside className="lg:col-span-5 bg-gradient-to-br from-[#0F382E] via-[#164338] to-[#1F5C4D] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-24 -end-24 w-64 h-64 bg-[#C5A880]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-[#F8F4EE]">
                <span className="w-2 h-2 rounded-full bg-[#C5A880]" />
                {arabic ? 'بوابة انضمام العيادات والمراكز التخصصية' : t('register.title')}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
                  {arabic ? <>ابدئي بتشغيل عيادتكِ <br /><span className="text-[#C5A880]">بمعايير فندقية وطبية راقية.</span></> : t('register.title')}
                </h2>
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed mt-3">
                  {arabic ? 'منظومة سحابية تربط جدول المواعيد، السجلات السريرية، وقائمة انتظار تملأ الشاغر.' : t('register.trial', { n: trialDays })}
                </p>
              </div>
              <div className="space-y-4">
                <Perk icon="verified_user" title={arabic ? `تجربة ${trialDays} يوماً بكامل المزايا` : t('register.trial', { n: trialDays })} body={arabic ? 'وصول لكل الوحدات التشغيلية والسريرية.' : ''} />
                <Perk icon="credit_card_off" title={arabic ? 'بدون بطاقة ائتمانية' : t('register.trial', { n: trialDays })} body={arabic ? 'لا وسيلة دفع لبدء التجربة.' : ''} />
                <Perk icon="quickreply" title={arabic ? 'تفعيل الحجز وصفحة العيادة' : 'Booking page'} body={arabic ? 'صفحة حجز خاصة وتأكيدات المواعيد.' : ''} />
              </div>
            </div>
          </aside>

          <section className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-[#E8E4DC] shadow-[0_20px_48px_-12px_rgba(31,92,77,0.08)]">
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#E8E4DC]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1F5C4D]" />
                  <span className="text-[11px] font-bold text-[#1F5C4D] uppercase tracking-wider">{arabic ? 'تهيئة مساحة العمل السحابية' : t('register.title')}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{arabic ? 'إنشاء مساحة عمل للعيادة' : t('register.title')}</h1>
                <p className="text-xs sm:text-[13px] text-[#6B7280] mt-1">{t('register.trial', { n: trialDays })}</p>
              </div>
              <span className="w-11 h-11 rounded-2xl bg-[#EDF5F2] border border-[#1F5C4D]/20 text-[#1F5C4D] flex items-center justify-center font-bold text-xl">و</span>
            </div>

            {error && <div className="bg-[#FDF2F0] text-[#B83A2E] text-sm p-3 rounded-xl mt-4" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field icon="storefront" label={t('register.clinic')} required>
                  <input type="text" onChange={update('clinicName')} required className={fieldClass} />
                </Field>
                <Field icon="person" label={t('register.owner')} required>
                  <input type="text" onChange={update('ownerName')} required className={fieldClass} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field icon="chat" label={t('register.phone')}>
                  <input type="tel" onChange={update('phone')} dir="ltr" className={`${fieldClass} text-start`} />
                </Field>
                <Field icon="mail" label={t('register.email')} required>
                  <input type="email" onChange={update('email')} required dir="ltr" autoComplete="email" className={`${fieldClass} text-start`} />
                </Field>
              </div>
              <Field icon="lock" label={t('register.password')} required>
                <span className="relative block">
                  <Icon name="lock" className="!text-[18px] absolute top-3 right-3 text-[#8C93A0] pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} onChange={update('password')} required dir="ltr" autoComplete="new-password" className="w-full pr-10 pl-10 py-2.5 bg-[#FDFBF7]/60 border border-[#E8E4DC] rounded-xl text-sm text-[#1E2229] outline-none focus:bg-white focus:border-[#1F5C4D] focus:ring-1 focus:ring-[#1F5C4D]" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-3 left-3 text-[#8C93A0]" aria-label={showPassword ? 'hide' : 'show'}>
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="!text-[18px]" />
                  </button>
                </span>
              </Field>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl bg-[#1F5C4D] hover:bg-[#15473B] text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
                <span>{loading ? t('register.creating') : (arabic ? `بدء التجربة المجانية (${trialDays} يوماً)` : t('register.submit'))}</span>
                <Icon name="arrow_back" className="!text-[19px]" />
              </button>
            </form>

            <p className="mt-8 pt-5 border-t border-[#E8E4DC] text-xs text-[#6B7280]">
              {t('register.hasAccount')}{' '}
              <Link to="/login" className="text-[#1F5C4D] font-bold hover:underline">{t('register.login')}</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

const Field = ({ icon, label, required, children }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-[#1E2229] mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    {React.Children.count(children) === 1 && children.props?.className?.includes('relative') ? children : (
      <span className="relative block">
        <Icon name={icon} className="!text-[18px] absolute top-3 end-3 text-[#8C93A0] pointer-events-none" />
        {children}
      </span>
    )}
  </label>
);

const Perk = ({ icon, title, body }) => (
  <div className="flex items-start gap-3.5">
    <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#C5A880] shrink-0">
      <Icon name={icon} className="!text-[19px]" />
    </span>
    <span>
      <span className="block text-xs font-bold text-white">{title}</span>
      {body && <span className="block text-[11px] text-white/70 leading-relaxed mt-0.5">{body}</span>}
    </span>
  </div>
);

export default RegisterClinic;
