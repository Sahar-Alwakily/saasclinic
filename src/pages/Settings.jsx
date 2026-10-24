import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaStore, FaBuilding, FaSave, FaDesktop, FaShieldAlt, FaPlug } from 'react-icons/fa';
import { getGeminiKey, setGeminiKey } from '../utils/geminiKey';
import ThemeEditor from '../editor/ThemeEditor';

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
    if (t) setActiveTab(t);
  }, [searchParams]);

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

  return (
    <div className={`space-y-6 pb-10 ${activeTab === 'store' ? '' : 'max-w-6xl mx-auto'}`}>
      <ToastContainer position="top-left" rtl />

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إعدادات العيادة</h1>
        <p className="text-gray-500 text-sm mt-1">بيانات العيادة، الخصوصية، والواجهة العامة للعميلات</p>
      </div>

      <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 w-full max-w-full overflow-x-auto no-scrollbar">
        <button onClick={() => goTab('profile')} className={`shrink-0 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'profile' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaBuilding /> بيانات العيادة
        </button>
        <button onClick={() => goTab('privacy')} className={`shrink-0 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'privacy' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaShieldAlt /> الخصوصية
        </button>
        <button onClick={() => goTab('integrations')} className={`shrink-0 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'integrations' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaPlug /> التكاملات
        </button>
        <button onClick={() => goTab('store')} className={`shrink-0 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'store' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaStore /> واجهة العيادة
        </button>
      </div>

      {activeTab === 'store' && <ThemeEditor embedded />}

      {activeTab !== 'store' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {activeTab === 'privacy' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
                <p className="text-sm text-gray-500">نص سياسة الخصوصية يظهر للعميلات إن ربطتيه لاحقاً في الواجهة. إيقاف الاسترجاع موجود في قسم استرجاع العميلات.</p>
                <textarea value={privacyNote} onChange={(e) => setPrivacyNote(e.target.value)} rows={6} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none dark:text-white" placeholder="كيف تُستخدم أرقام العميلات، وحق إيقاف الرسائل..." />
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
                  className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold"
                >
                  <FaSave className="inline ml-2" /> حفظ الخصوصية
                </button>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
                <p className="text-sm text-gray-500">أرقام وروابط القنوات المحفوظة في ملف العيادة — لا بوابة واتساب رسمية مربوطة بعد.</p>
                {['whatsapp', 'facebook', 'instagram', 'tiktok'].map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-bold mb-1">{key}</label>
                    <input
                      value={social[key] || ''}
                      onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none"
                      dir="ltr"
                    />
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                  <label className="block text-sm font-bold">مفتاح Gemini (مجاني — مساعد الكونسول)</label>
                  <p className="text-xs text-gray-500">
                    من <a className="text-[#4d7cff] font-bold" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>. يُحفظ في هذا المتصفح فقط، لا يُرفع لقاعدة البيانات.
                  </p>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKeyField(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none"
                    dir="ltr"
                    placeholder="AIza..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiKey(geminiKey);
                      toast.success('حُفظ مفتاح المساعد على هذا الجهاز');
                    }}
                    className="w-full bg-[#14121c] text-white py-3 rounded-xl font-bold"
                  >
                    حفظ مفتاح المساعد
                  </button>
                </div>
                <button type="button" onClick={handleSaveSocial} disabled={loading} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold">
                  حفظ التكاملات
                </button>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم العيادة</label>
                  <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
                  <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني</label>
                  <input type="email" value={profileData.ownerEmail} onChange={(e) => setProfileData({ ...profileData, ownerEmail: e.target.value })} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" />
                </div>
                <button onClick={handleSaveProfile} disabled={loading} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ بيانات العيادة'}
                </button>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <FaDesktop className="text-pink-500 text-lg" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">الصفحة المنشورة</h2>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="bg-gray-100 dark:bg-slate-900 px-4 py-2.5 border-b border-gray-200 dark:border-slate-700 text-[10px] text-gray-400 text-center truncate" dir="ltr">
                {storeUrl}
              </div>
              {clinicId && (
                <iframe src={`/book/${clinicId}`} title="الصفحة المنشورة" className="w-full h-[min(70vh,500px)] border-0 bg-gray-50" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
