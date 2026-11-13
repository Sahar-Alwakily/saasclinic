import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaBuilding, FaSave, FaPlug, FaWhatsapp, FaPen, FaTimes } from 'react-icons/fa';
import WhatsAppConnectPanel from '../components/settings/WhatsAppConnectPanel';
import { getGeminiKey, setGeminiKey } from '../utils/geminiKey';

const field = 'w-full p-3 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200';

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
    } catch (error) {
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

  const tabCls = (id) => `shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${activeTab === id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`;

  if (searchParams.get('tab') === 'privacy') return <Navigate to="/website?tab=policies" replace />;

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">إعدادات العيادة</h1>
        <p className="text-sm text-[#8a9199] mt-1">بيانات العيادة وواتساب والتكاملات. السياسات من صفحة موقع العيادة.</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => goTab('profile')} className={tabCls('profile')}>
          <FaBuilding /> بيانات العيادة
        </button>
        <button type="button" onClick={() => goTab('whatsapp')} className={tabCls('whatsapp')}>
          <FaWhatsapp /> واتساب
        </button>
        <button type="button" onClick={() => goTab('integrations')} className={tabCls('integrations')}>
          <FaPlug /> التكاملات
        </button>
      </div>

      <div className="max-w-3xl">
        <div className="space-y-5">
          {activeTab === 'whatsapp' && <WhatsAppConnectPanel />}

          {activeTab === 'integrations' && (
            <section className="saas-card p-5 space-y-4">
              <p className="text-sm text-[#8a9199]">أرقام وروابط القنوات المحفوظة في ملف العيادة — لا بوابة واتساب رسمية مربوطة بعد.</p>
              {['whatsapp', 'facebook', 'instagram', 'tiktok'].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-bold text-[#111827] mb-1">{key}</label>
                  <input
                    value={social[key] || ''}
                    onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
                    className={field}
                    dir="ltr"
                  />
                </div>
              ))}
              <div className="pt-4 border-t border-[#e4eee8] space-y-2">
                <label className="block text-sm font-bold text-[#111827]">مفتاح Gemini (مجاني — مساعد الكونسول)</label>
                <p className="text-xs text-[#8a9199]">
                  من <a className="text-emerald-700 font-bold" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>. يُحفظ في هذا المتصفح فقط، لا يُرفع لقاعدة البيانات.
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
                  className="w-full bg-[#111827] text-white py-3 rounded-xl font-bold"
                >
                  حفظ مفتاح المساعد
                </button>
              </div>
              <button type="button" onClick={handleSaveSocial} disabled={loading} className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold">
                حفظ التكاملات
              </button>
            </section>
          )}

          {activeTab === 'profile' && !editingProfile && (
            <section className="saas-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-bold text-[#111827]">بيانات العيادة</h2>
                <button type="button" onClick={startProfileEdit} className="nura-chip nura-chip-lilac">
                  <FaPen className="text-[11px]" /> تعديل البيانات
                </button>
              </div>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs text-[#8a9199]">اسم العيادة</dt>
                  <dd className="font-bold text-[#111827] mt-0.5">{savedProfile.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#8a9199]">رقم الهاتف</dt>
                  <dd className="font-bold text-[#111827] mt-0.5 text-right"><span dir="ltr">{savedProfile.phone || '—'}</span></dd>
                </div>
                <div>
                  <dt className="text-xs text-[#8a9199]">البريد الإلكتروني</dt>
                  <dd className="font-bold text-[#111827] mt-0.5 text-right"><span dir="ltr">{savedProfile.ownerEmail || '—'}</span></dd>
                </div>
              </dl>
            </section>
          )}

          {activeTab === 'profile' && editingProfile && (
            <section className="saas-card p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-[#111827]">تعديل بيانات العيادة</h2>
                <button type="button" onClick={cancelProfileEdit} className="nura-chip nura-chip-rose">
                  <FaTimes className="text-[11px]" /> إلغاء
                </button>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">اسم العيادة</label>
                <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className={field} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">رقم الهاتف</label>
                <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} className={field} dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">البريد الإلكتروني</label>
                <input type="email" value={profileData.ownerEmail} onChange={(e) => setProfileData({ ...profileData, ownerEmail: e.target.value })} className={field} dir="ltr" />
              </div>
              <button type="button" onClick={handleSaveProfile} disabled={loading} className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ بيانات العيادة'}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
