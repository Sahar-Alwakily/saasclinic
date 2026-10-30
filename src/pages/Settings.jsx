import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaBuilding, FaSave, FaDesktop, FaShieldAlt, FaPlug, FaWhatsapp } from 'react-icons/fa';
import WhatsAppConnectPanel from '../components/settings/WhatsAppConnectPanel';
import { getGeminiKey, setGeminiKey } from '../utils/geminiKey';

const field = 'w-full p-3 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200';

const Settings = () => {
  const { clinicId, clinicInfo, clinicPath } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [privacyNote, setPrivacyNote] = useState('');
  const [geminiKey, setGeminiKeyField] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '', ownerEmail: '' });
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
      setPrivacyNote(clinicInfo.privacyPolicy || '');
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

  const handleSaveProfile = async () => {
    if (!clinicPath) return;
    setLoading(true);
    try {
      await update(ref(database, clinicPath('info')), profileData);
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

  const storeUrl = clinicId ? `${window.location.origin}/book/${clinicId}` : '';
  const tabCls = (id) => `shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${activeTab === id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`;

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">إعدادات العيادة</h1>
        <p className="text-sm text-[#8a9199] mt-1">بيانات العيادة والخصوصية والتكاملات. المنتجات والمدونة من قائمة موقع العيادة.</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => goTab('profile')} className={tabCls('profile')}>
          <FaBuilding /> بيانات العيادة
        </button>
        <button type="button" onClick={() => goTab('privacy')} className={tabCls('privacy')}>
          <FaShieldAlt /> الخصوصية
        </button>
        <button type="button" onClick={() => goTab('whatsapp')} className={tabCls('whatsapp')}>
          <FaWhatsapp /> واتساب
        </button>
        <button type="button" onClick={() => goTab('integrations')} className={tabCls('integrations')}>
          <FaPlug /> التكاملات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          {activeTab === 'privacy' && (
            <section className="saas-card p-5 space-y-4">
              <p className="text-sm text-[#8a9199]">نص سياسة الخصوصية يظهر للعميلات إن ربطتيه لاحقاً في الواجهة. إيقاف الاسترجاع موجود في قسم استرجاع العميلات.</p>
              <textarea value={privacyNote} onChange={(e) => setPrivacyNote(e.target.value)} rows={6} className={`${field} resize-none`} placeholder="كيف تُستخدم أرقام العميلات، وحق إيقاف الرسائل..." />
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  if (!clinicPath) return;
                  setLoading(true);
                  try {
                    await update(ref(database, clinicPath('info')), { privacyPolicy: privacyNote });
                    toast.success('تم حفظ سياسة الخصوصية');
                  } catch {
                    toast.error('تعذّر الحفظ');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold"
              >
                <FaSave className="inline ml-2" /> حفظ الخصوصية
              </button>
            </section>
          )}

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

          {activeTab === 'profile' && (
            <section className="saas-card p-5 space-y-5">
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

        <div className="lg:sticky lg:top-6 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <FaDesktop className="text-emerald-600" />
            <h2 className="font-bold text-[#111827]">الصفحة المنشورة</h2>
          </div>
          <div className="saas-card overflow-hidden">
            <div className="bg-[#f8faf9] px-4 py-2.5 border-b border-[#e4eee8] text-[10px] text-[#8a9199] text-center truncate" dir="ltr">
              {storeUrl}
            </div>
            {clinicId && (
              <iframe src={`/book/${clinicId}`} title="الصفحة المنشورة" className="w-full h-[min(70vh,500px)] border-0 bg-[#f8faf9]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
