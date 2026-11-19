import React, { useState, useEffect, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaBuilding, FaSave, FaPlug, FaWhatsapp, FaPen, FaTimes } from 'react-icons/fa';
import WhatsAppConnectPanel from '../components/settings/WhatsAppConnectPanel';
import { getGeminiKey, setGeminiKey } from '../utils/geminiKey';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const card = 'rounded-lg border border-[#E4EAEE] bg-white';
const primary = 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#047857] disabled:opacity-60';
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
const pillActive = 'shrink-0 rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-3 py-1.5 text-[11.5px] font-bold text-[#0E7490]';
const pillIdle = 'shrink-0 rounded-full border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3]';

const SOCIAL_LABELS = { whatsapp: 'واتساب', facebook: 'فيسبوك', instagram: 'إنستغرام', tiktok: 'تيك توك' };

const Settings = () => {
  const { clinicInfo, clinicPath } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [geminiKey, setGeminiKeyField] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '', ownerEmail: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [social, setSocial] = useState({ whatsapp: '', facebook: '', instagram: '', tiktok: '' });

  useEffect(() => {
    if (clinicInfo) {
      setProfileData({
        name: clinicInfo.name || '',
        phone: clinicInfo.phone || '',
        ownerEmail: clinicInfo.ownerEmail || '',
      });
      setSocial({
        whatsapp: clinicInfo.whatsapp || '',
        facebook: clinicInfo.facebook || '',
        instagram: clinicInfo.instagram || '',
        tiktok: clinicInfo.tiktok || '',
      });
    }
    setGeminiKeyField(getGeminiKey());
  }, [clinicInfo]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'store') {
      setSearchParams({}, { replace: true });
      setActiveTab('profile');
      return;
    }
    if (t) setActiveTab(t);
    else setActiveTab('profile');
  }, [searchParams, setSearchParams]);

  const goTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'profile' ? {} : { tab });
  };

  const savedProfile = {
    name: clinicInfo?.name || '',
    phone: clinicInfo?.phone || '',
    ownerEmail: clinicInfo?.ownerEmail || '',
  };

  const filledSocial = useMemo(
    () => ['whatsapp', 'facebook', 'instagram', 'tiktok'].filter((k) => String(social[k] || '').trim()).length,
    [social],
  );

  const profileComplete = Boolean(savedProfile.name?.trim() && savedProfile.phone?.trim());

  const kpis = [
    {
      label: 'ملف العيادة',
      value: profileComplete ? 'مكتمل' : 'ناقص',
      note: savedProfile.name || 'اسم العيادة',
      accent: profileComplete ? '#059669' : '#B45309',
    },
    {
      label: 'واتساب',
      value: (social.whatsapp || clinicInfo?.whatsapp)?.trim() ? 'مربوط' : '—',
      note: 'رقم أو ربط رسمي',
      accent: '#0FA3A3',
    },
    {
      label: 'قنوات التواصل',
      value: `${filledSocial}/4`,
      note: 'محفوظة في ملف العيادة',
      accent: '#64748B',
    },
  ];

  const startProfileEdit = () => {
    setProfileData(savedProfile);
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setProfileData(savedProfile);
    setEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!clinicPath) return;
    if (!profileData.name.trim()) return toast.error('اسم العيادة مطلوب');
    setLoading(true);
    try {
      await update(ref(database, clinicPath('info')), {
        name: profileData.name.trim(),
        phone: profileData.phone.trim(),
        ownerEmail: profileData.ownerEmail.trim(),
      });
      setEditingProfile(false);
      toast.success('تم حفظ بيانات العيادة بنجاح!');
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!clinicPath) return;
    setLoading(true);
    try {
      await update(ref(database, clinicPath('info')), social);
      toast.success('تم حفظ التكاملات');
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (searchParams.get('tab') === 'privacy') return <Navigate to="/website?tab=policies" replace />;

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 pb-10 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الإعدادات</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">إعدادات العيادة</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">
            بيانات العيادة وواتساب والتكاملات. السياسات من{' '}
            <Link to="/website?tab=policies" className="font-bold text-[#0E7490] hover:underline">موقع العيادة</Link>.
          </p>
        </div>
      </header>

      <section aria-label="ملخص الإعدادات" className="grid grid-cols-3 border-y border-[#E4EAEE]">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-5 py-4 ${i > 0 ? 'border-s border-[#E4EAEE]' : ''}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
              {k.label}
            </p>
            <p className="mt-2 text-[28px] font-light leading-none tracking-tight sm:text-[32px]">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => goTab('profile')} className={`${activeTab === 'profile' ? pillActive : pillIdle} flex items-center gap-1.5`}>
          <FaBuilding className="text-[11px]" /> بيانات العيادة
        </button>
        <button type="button" onClick={() => goTab('whatsapp')} className={`${activeTab === 'whatsapp' ? pillActive : pillIdle} flex items-center gap-1.5`}>
          <FaWhatsapp className="text-[11px]" /> واتساب
        </button>
        <button type="button" onClick={() => goTab('integrations')} className={`${activeTab === 'integrations' ? pillActive : pillIdle} flex items-center gap-1.5`}>
          <FaPlug className="text-[11px]" /> التكاملات
        </button>
      </div>

      <div className="max-w-3xl space-y-5">
        {activeTab === 'whatsapp' && <WhatsAppConnectPanel />}

        {activeTab === 'integrations' && (
          <section className={`${card} space-y-4 p-4`}>
            <h2 className="text-[15px] font-bold">التكاملات والقنوات</h2>
            <p className="text-[12px] text-[#64748B]">أرقام وروابط القنوات المحفوظة في ملف العيادة.</p>
            {['whatsapp', 'facebook', 'instagram', 'tiktok'].map((key) => (
              <label key={key} className="block text-[12px] font-bold text-[#64748B]">
                {SOCIAL_LABELS[key]}
                <input
                  value={social[key] || ''}
                  onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
                  className={`${field} mt-1`}
                  dir="ltr"
                />
              </label>
            ))}
            <div className="space-y-2 border-t border-[#E4EAEE] pt-4">
              <label className="block text-[12px] font-bold text-[#64748B]">مفتاح Gemini (مساعد الكونسول)</label>
              <p className="text-[11px] text-[#94A3B8]">
                من{' '}
                <a className="font-bold text-[#0E7490] hover:underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  Google AI Studio
                </a>
                . يُحفظ في هذا المتصفح فقط.
              </p>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKeyField(e.target.value)}
                className={field}
                dir="ltr"
                placeholder="AIza..."
              />
              <button
                type="button"
                onClick={() => {
                  setGeminiKey(geminiKey);
                  toast.success('حُفظ مفتاح المساعد على هذا الجهاز');
                }}
                className="w-full rounded-lg bg-[#0F172A] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1E293B]"
              >
                حفظ مفتاح المساعد
              </button>
            </div>
            <button type="button" onClick={handleSaveSocial} disabled={loading} className={primary}>
              حفظ التكاملات
            </button>
          </section>
        )}

        {activeTab === 'profile' && !editingProfile && (
          <section className={`${card} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-[15px] font-bold">بيانات العيادة</h2>
              <button type="button" onClick={startProfileEdit} className={ghost}>
                <FaPen className="text-[10px]" /> تعديل البيانات
              </button>
            </div>
            <dl className="mt-4 space-y-4">
              {[
                ['اسم العيادة', savedProfile.name],
                ['رقم الهاتف', savedProfile.phone, true],
                ['البريد الإلكتروني', savedProfile.ownerEmail, true],
              ].map(([label, val, ltr]) => (
                <div key={label} className="border-b border-[#EDF1F4] pb-3 last:border-0">
                  <dt className="text-[11px] font-bold text-[#64748B]">{label}</dt>
                  <dd className="mt-1 text-[15px] font-bold text-[#0F172A]">
                    {ltr ? <span dir="ltr">{val || '—'}</span> : (val || '—')}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {activeTab === 'profile' && editingProfile && (
          <section className={`${card} space-y-4 p-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold">تعديل بيانات العيادة</h2>
              <button type="button" onClick={cancelProfileEdit} className="inline-flex items-center gap-1 text-[12px] font-bold text-[#B91C1C]">
                <FaTimes className="text-[10px]" /> إلغاء
              </button>
            </div>
            <label className="block text-[12px] font-bold text-[#64748B]">
              اسم العيادة
              <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="block text-[12px] font-bold text-[#64748B]">
              رقم الهاتف
              <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} className={`${field} mt-1`} dir="ltr" />
            </label>
            <label className="block text-[12px] font-bold text-[#64748B]">
              البريد الإلكتروني
              <input type="email" value={profileData.ownerEmail} onChange={(e) => setProfileData({ ...profileData, ownerEmail: e.target.value })} className={`${field} mt-1`} dir="ltr" />
            </label>
            <button type="button" onClick={handleSaveProfile} disabled={loading} className={primary}>
              <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ بيانات العيادة'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;