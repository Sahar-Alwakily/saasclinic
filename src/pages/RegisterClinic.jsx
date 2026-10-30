import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, push } from 'firebase/database';
import { auth, database } from '../APIFirebase/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { getPlan } from '../config/plans';
import { createDefaultSections } from '../sections/defaultSections';
import { useLocale } from '../context/LocaleContext';
import LangSwitcher from '../components/i18n/LangSwitcher';

const RegisterClinic = () => {
  const navigate = useNavigate();
  const { t, dir } = useLocale();
  const [form, setForm] = useState({
    clinicName: '', ownerName: '', email: '', password: '', phone: '',
  });
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
      // 1. إنشاء مستخدم Auth
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const uid = cred.user.uid;

      // 2. تجهيز البيانات
      const clinicId = `clinic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const trialEndsAt = now + getPlan('trial').durationDays * 24 * 60 * 60 * 1000;

      // 3. معلومات العيادة
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

      // 4. المستخدم كأدمن داخل العيادة
      await set(ref(database, `clinics/${clinicId}/users/${uid}`), {
        email: form.email.trim(), name: form.ownerName.trim(), role: 'admin', createdAt: now,
      });

      // 5. ربط المستخدم بالعيادة (meta)
      await set(ref(database, `meta/users/${uid}`), {
        clinicId, role: 'admin', email: form.email.trim(),
      });

      // 6. فهرس العيادات
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
    <div dir={dir} className="min-h-screen flex items-center justify-center p-4 bg-[#F7F8F6]">
      <div className="w-full max-w-md bg-white rounded-lg p-8 border border-[#E5E9EC]">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="w-9 h-9 rounded-md bg-[#172B3A] text-white text-sm font-semibold flex items-center justify-center mb-3">{t('brandMark')}</div>
            <LangSwitcher tone="light" />
          </div>
          <h1 className="text-xl font-semibold text-[#202A32]">{t('register.title')}</h1>
          <p className="text-sm text-[#75818B] mt-1">{t('register.trial', { n: getPlan('trial').durationDays })}</p>
        </div>

        {error && <div className="bg-[#f8ecea] text-[#9A3F32] text-sm p-3 rounded-md mb-4" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder={t('register.clinic')} onChange={update('clinicName')} required className="w-full p-2.5 border border-[#E5E9EC] rounded-md outline-none focus:border-[#658B83] text-sm" />
          <input type="text" placeholder={t('register.owner')} onChange={update('ownerName')} required className="w-full p-2.5 border rounded-md border-[#E5E9EC] outline-none focus:border-[#658B83] text-sm" />
          <input type="tel" placeholder={t('register.phone')} onChange={update('phone')} className="w-full p-2.5 border border-[#E5E9EC] rounded-md outline-none focus:border-[#658B83] text-sm" />
          <input type="email" placeholder={t('register.email')} onChange={update('email')} required className="w-full p-2.5 border border-[#E5E9EC] rounded-md outline-none focus:border-[#658B83] text-sm" dir="ltr" />
          <input type="password" placeholder={t('register.password')} onChange={update('password')} required className="w-full p-2.5 border border-[#E5E9EC] rounded-md outline-none focus:border-[#658B83] text-sm" dir="ltr" />
          
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-md bg-[#172B3A] text-white text-sm font-semibold hover:bg-[#122330] disabled:opacity-60">
            {loading ? t('register.creating') : t('register.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-stone-500 mt-5">{t('register.hasAccount')} <Link to="/login" className="text-[#172B3A] font-semibold">{t('register.login')}</Link></p>
      </div>
    </div>
  );
};

export default RegisterClinic;