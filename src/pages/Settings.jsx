import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaCheckCircle, FaStore, FaLink, FaBuilding, FaSave, FaDesktop, FaSync, FaPalette, FaShieldAlt, FaPlug } from 'react-icons/fa';
import { DRAFT_STORAGE_KEY, fontStack } from '../components/themes/themeUtils';

const THEME_PRESETS = {
  beauty: { primaryColor: '#C48B7A', bgColor: '#FBF4F0', textColor: '#3A2A28', fontFamily: 'Tajawal' },
  elegant: { primaryColor: '#C9A66B', bgColor: '#0C0B0A', textColor: '#F5EDE3', fontFamily: 'serif' },
  minimal: { primaryColor: '#1C1917', bgColor: '#FAF8F5', textColor: '#1C1917', fontFamily: 'Tajawal' },
};

const THEMES = [
  { id: 'beauty', name: 'تجميلي وردي', color: 'bg-rose-400', desc: 'سبا راقٍ لعيادات التجميل وأخصائيات البشرة' },
  { id: 'elegant', name: 'أتيليه ذهبي', color: 'bg-amber-700', desc: 'داكن فاخر لغرف VIP وطقوس خاصة' },
  { id: 'minimal', name: 'عيادة هادئة', color: 'bg-stone-800', desc: 'أبيض تحريري يبرز التشخيص والجلسات' },
];

const FONT_OPTIONS = [
  { value: 'Tajawal', label: 'Tajawal', hint: 'حديث' },
  { value: 'Cairo', label: 'Cairo', hint: 'عريض' },
  { value: 'Almarai', label: 'Almarai', hint: 'ناعم' },
  { value: 'serif', label: 'Serif', hint: 'كلاسيكي' },
  { value: 'sans-serif', label: 'Sans', hint: 'بسيط' },
];

function safeHex(value, fallback = '#C48B7A') {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : fallback;
}

function ColorField({ label, value, onChange, fallback }) {
  const hex = safeHex(value, fallback);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3">
      <label className="relative w-14 h-14 rounded-2xl overflow-hidden border border-black/5 shadow-inner shrink-0 cursor-pointer">
        <span className="absolute inset-0" style={{ backgroundColor: hex }} />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={label}
        />
      </label>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-1.5">{label}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none font-mono text-sm uppercase"
          dir="ltr"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

const Settings = () => {
  const { clinicId, clinicInfo, clinicPath } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [privacyNote, setPrivacyNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const previewFrameRef = useRef(null);

  const [profileData, setProfileData] = useState({ name: '', phone: '', ownerEmail: '' });
  
  const [storeData, setStoreData] = useState({
    storeTheme: 'beauty', 
    storeDescription: '',
    heroTitle: '',
    doctorName: '',
    heroImage: '', 
    logoUrl: '', 
    whatsapp: '', 
    address: '',
    doctorBio: '', 
    specialty: '', 
    degree: '',
    facebook: '', 
    instagram: '', 
    tiktok: '',
    primaryColor: '#C48B7A',
    bgColor: '#FBF4F0',
    textColor: '#3A2A28',
    fontFamily: 'Tajawal',
    showServices: true,
    showProducts: true,
    showBlog: true,
    seoTitle: '',
    seoDescription: '',
    whyChooseUs: '', // ✅ محتوى "لماذا تختارنا"
    whyChooseUsTitle: '', // ✅ عنوان "لماذا تختارنا"
  });

  useEffect(() => {
    if (clinicInfo) {
      setProfileData({
        name: clinicInfo.name || '',
        phone: clinicInfo.phone || '',
        ownerEmail: clinicInfo.ownerEmail || '',
      });
      setStoreData({
        storeTheme: clinicInfo.storeTheme || 'beauty',
        storeDescription: clinicInfo.storeDescription || '',
        heroTitle: clinicInfo.heroTitle || '',
        doctorName: clinicInfo.doctorName || '',
        heroImage: clinicInfo.heroImage || '',
        logoUrl: clinicInfo.logoUrl || '',
        whatsapp: clinicInfo.whatsapp || '',
        address: clinicInfo.address || '',
        doctorBio: clinicInfo.doctorBio || '',
        specialty: clinicInfo.specialty || '',
        degree: clinicInfo.degree || '',
        facebook: clinicInfo.facebook || '',
        instagram: clinicInfo.instagram || '',
        tiktok: clinicInfo.tiktok || '',
        primaryColor: clinicInfo.primaryColor || '#C48B7A',
        bgColor: clinicInfo.bgColor || '#FBF4F0',
        textColor: clinicInfo.textColor || '#3A2A28',
        fontFamily: clinicInfo.fontFamily || 'Tajawal',
        showServices: clinicInfo.showServices !== false,
        showProducts: clinicInfo.showProducts !== false,
        showBlog: clinicInfo.showBlog !== false,
        seoTitle: clinicInfo.seoTitle || '',
        seoDescription: clinicInfo.seoDescription || '',
        whyChooseUs: clinicInfo.whyChooseUs || '',
        whyChooseUsTitle: clinicInfo.whyChooseUsTitle || '',
      });
      setPrivacyNote(clinicInfo.privacyPolicy || '');
    }
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
      setPreviewKey(Date.now());
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async () => {
    if (!clinicPath) return;
    setLoading(true);
    try {
      await update(ref(database, clinicPath('info')), storeData);
      toast.success('تم حفظ إعدادات الواجهة بنجاح!');
      setPreviewKey(Date.now());
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clinicId) return;
    const clinic = {
      ...(clinicInfo || {}),
      ...storeData,
      name: profileData.name || clinicInfo?.name || '',
      phone: profileData.phone || clinicInfo?.phone || '',
      _demo: false,
    };
    const payload = { type: 'clinic-draft', clinicId, clinic };
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ clinicId, clinic }));
    } catch {
      /* ignore */
    }
    previewFrameRef.current?.contentWindow?.postMessage(payload, window.location.origin);
  }, [storeData, profileData, clinicId, clinicInfo]);

  const storeUrl = `${window.location.origin}/book/${clinicId}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <ToastContainer position="top-left" rtl />
      
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إعدادات العيادة</h1>
        <p className="text-gray-500 text-sm mt-1">إدارة بيانات العيادة وتخصيص واجهة التجميل للعميلات</p>
      </div>

      <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 w-fit flex-wrap">
        <button onClick={() => goTab('profile')} className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'profile' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaBuilding /> بيانات العيادة
        </button>
        <button onClick={() => goTab('privacy')} className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'privacy' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaShieldAlt /> الخصوصية
        </button>
        <button onClick={() => goTab('integrations')} className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'integrations' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaPlug /> التكاملات
        </button>
        <button onClick={() => goTab('store')} className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'store' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaStore /> واجهة العيادة
        </button>
      </div>

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
                    value={storeData[key] || ''}
                    onChange={(e) => setStoreData({ ...storeData, [key]: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none"
                    dir="ltr"
                  />
                </div>
              ))}
              <button type="button" onClick={handleSaveStore} disabled={loading} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold">
                حفظ التكاملات
              </button>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم العيادة</label>
                <input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
                <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني</label>
                <input type="email" value={profileData.ownerEmail} onChange={(e) => setProfileData({...profileData, ownerEmail: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" />
              </div>
              
              <button onClick={handleSaveProfile} disabled={loading} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ بيانات العيادة'}
              </button>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <FaLink className="text-pink-500" /> رابط صفحة الحجز
                </label>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                  <input type="text" readOnly value={storeUrl} className="flex-1 bg-transparent outline-none text-sm text-gray-600 dark:text-gray-300" dir="ltr" />
                  <button onClick={() => { navigator.clipboard.writeText(storeUrl); toast.info('تم نسخ الرابط!'); }} className="text-xs bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 font-medium">نسخ</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">اختر تصميم الواجهة</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {THEMES.map((theme) => (
                    <div key={theme.id} onClick={() => setStoreData({ ...storeData, storeTheme: theme.id, ...THEME_PRESETS[theme.id] })} className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${storeData.storeTheme === theme.id ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-slate-600'}`}>
                      <div className={`w-10 h-10 rounded-xl ${theme.color} text-white flex items-center justify-center mb-3`}><FaStore /></div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{theme.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{theme.desc}</p>
                      {storeData.storeTheme === theme.id && <FaCheckCircle className="text-pink-500 mt-2" />}
                      <a href={`/book/preview-${theme.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 inline-block text-[11px] font-bold text-pink-500">نموذج جاهز</a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الأخصائية / العيادة</label>
                  <input type="text" value={storeData.doctorName} onChange={(e) => setStoreData({...storeData, doctorName: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط اللوجو</label>
                  <input type="url" value={storeData.logoUrl} onChange={(e) => setStoreData({...storeData, logoUrl: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div className="md:col-span-2 bg-pink-50/60 dark:bg-pink-900/10 p-4 rounded-2xl border border-pink-100 dark:border-pink-900/30 space-y-4">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">محتوى الواجهة (أنتي بتعبّيه)</p>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">البانر / صورة الغلاف</label>
                    <input type="url" value={storeData.heroImage} onChange={(e) => setStoreData({...storeData, heroImage: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" placeholder="رابط الصورة" />
                    {storeData.heroImage && <img src={storeData.heroImage} alt="" className="mt-3 h-28 w-full object-cover rounded-xl" />}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الجملة الرئيسية</label>
                    <textarea value={storeData.heroTitle} onChange={(e) => setStoreData({...storeData, heroTitle: e.target.value})} rows={2} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" placeholder="مثال: بشرتكِ تُقرأ قبل أن تُعالَج." />
                    <p className="text-[11px] text-gray-400 mt-1">سطر جديد = سطر جديد في العنوان الكبير</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">النص التعريفي</label>
                    <textarea value={storeData.storeDescription} onChange={(e) => setStoreData({...storeData, storeDescription: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" placeholder="اكتبي عن العيادة، الجلسات، وأخصائية البشرة..." />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نبذة عن الأخصائية</label>
                  <textarea value={storeData.doctorBio} onChange={(e) => setStoreData({...storeData, doctorBio: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">التخصص (للشارة)</label>
                  <input type="text" value={storeData.specialty} onChange={(e) => setStoreData({...storeData, specialty: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الشهادة (للشارة)</label>
                  <input type="text" value={storeData.degree} onChange={(e) => setStoreData({...storeData, degree: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط فيسبوك</label>
                  <input type="url" value={storeData.facebook} onChange={(e) => setStoreData({...storeData, facebook: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط انستغرام</label>
                  <input type="url" value={storeData.instagram} onChange={(e) => setStoreData({...storeData, instagram: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط تيك توك</label>
                  <input type="url" value={storeData.tiktok} onChange={(e) => setStoreData({...storeData, tiktok: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الواتساب</label>
                  <input type="text" value={storeData.whatsapp} onChange={(e) => setStoreData({...storeData, whatsapp: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <p className="md:col-span-2 text-xs text-gray-400">عناوين العيادة تظهر من <span className="font-bold">الفروع</span>، مو من هنا.</p>
              </div>

              <div className="rounded-[1.75rem] border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                  <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaPalette className="text-pink-500" /> الهوية البصرية
                  </h4>
                  <button
                    type="button"
                    onClick={() => setStoreData({ ...storeData, ...THEME_PRESETS[storeData.storeTheme] })}
                    className="text-xs font-bold text-pink-600 bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-full"
                  >
                    إعادة ألوان الثيم
                  </button>
                </div>

                <div
                  className="px-5 py-4 flex items-center justify-between gap-4"
                  style={{
                    backgroundColor: safeHex(storeData.bgColor, '#FBF4F0'),
                    color: safeHex(storeData.textColor, '#3A2A28'),
                    fontFamily: fontStack(storeData.fontFamily),
                  }}
                >
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase opacity-50 mb-1">معاينة</p>
                    <p className="font-bold text-lg leading-tight">عيادتكِ بهذه الهوية</p>
                  </div>
                  <span
                    className="shrink-0 px-4 py-2 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: safeHex(storeData.primaryColor, '#C48B7A') }}
                  >
                    احجزي جلسة
                  </span>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-900 space-y-3">
                  <div className="space-y-2">
                    <ColorField
                      label="اللون الأساسي"
                      value={storeData.primaryColor}
                      fallback="#C48B7A"
                      onChange={(primaryColor) => setStoreData({ ...storeData, primaryColor })}
                    />
                    <ColorField
                      label="لون الخلفية"
                      value={storeData.bgColor}
                      fallback="#FBF4F0"
                      onChange={(bgColor) => setStoreData({ ...storeData, bgColor })}
                    />
                    <ColorField
                      label="لون الخط"
                      value={storeData.textColor}
                      fallback="#3A2A28"
                      onChange={(textColor) => setStoreData({ ...storeData, textColor })}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white mb-2 px-1">نوع الخط</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {FONT_OPTIONS.map((font) => {
                        const active = storeData.fontFamily === font.value;
                        return (
                          <button
                            key={font.value}
                            type="button"
                            onClick={() => setStoreData({ ...storeData, fontFamily: font.value })}
                            className={`rounded-2xl border px-2 py-3 text-center transition ${
                              active
                                ? 'border-pink-500 bg-white dark:bg-slate-800 ring-2 ring-pink-500/20'
                                : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                            style={{ fontFamily: fontStack(font.value) }}
                          >
                            <span className="block text-sm font-bold text-gray-800 dark:text-white">أبجد</span>
                            <span className="block text-[10px] text-gray-500 mt-1">{font.label} · {font.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ إعدادات "لماذا تختارنا" */}
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  ⭐ لماذا تختارنا؟ (اختياري)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عنوان القسم</label>
                    <input type="text" value={storeData.whyChooseUsTitle} onChange={(e) => setStoreData({...storeData, whyChooseUsTitle: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" placeholder="مثال: لماذا تختارين عيادتنا؟" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">محتوى القسم</label>
                    <textarea value={storeData.whyChooseUs} onChange={(e) => setStoreData({...storeData, whyChooseUs: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" placeholder="مثال: تشخيص فردي، غرف خاصة، وخطة عناية مكتوبة لبشرتكِ..." />
                  </div>
                </div>
              </div>

              {/* ✅ إخفاء وإظهار الأقسام */}
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  👁️ إخفاء / إظهار الأقسام
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={storeData.showServices} onChange={(e) => setStoreData({...storeData, showServices: e.target.checked})} className="w-5 h-5 accent-pink-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">إظهار قسم الجلسات</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={storeData.showProducts} onChange={(e) => setStoreData({...storeData, showProducts: e.target.checked})} className="w-5 h-5 accent-pink-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">إظهار قسم المنتجات</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={storeData.showBlog} onChange={(e) => setStoreData({...storeData, showBlog: e.target.checked})} className="w-5 h-5 accent-pink-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">إظهار قسم المدونة</span>
                  </label>
                </div>
              </div>
              
              {/* ✅ إعدادات SEO */}
              <div className="md:col-span-2 bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  🔍 تحسين محركات البحث (SEO)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عنوان الموقع (يظهر بجوجل)</label>
                    <input type="text" value={storeData.seoTitle} onChange={(e) => setStoreData({...storeData, seoTitle: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" placeholder="مثال: عيادة نوارة | أخصائية بشرة وتجميل" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">وصف الموقع (Meta Description)</label>
                    <textarea value={storeData.seoDescription} onChange={(e) => setStoreData({...storeData, seoDescription: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" placeholder="مثال: نقدم أفضل خدمات العناية بالبشرة والليزر..." />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveStore} disabled={loading} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ إعدادات الواجهة'}
              </button>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaDesktop className="text-pink-500 text-lg" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">معاينة حية من بياناتكِ</h2>
            </div>
            <button onClick={() => setPreviewKey(Date.now())} className="text-sm text-pink-500 hover:text-pink-600 flex items-center gap-1 bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-lg transition">
              <FaSync /> تحديث
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="bg-gray-100 dark:bg-slate-900 px-4 py-2.5 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <div className="flex-1 mx-2">
                <div className="bg-white dark:bg-slate-800 text-[10px] text-gray-400 px-3 py-1 rounded-md text-center truncate" dir="ltr">
                  {storeUrl}
                </div>
              </div>
            </div>
            
            <iframe
              ref={previewFrameRef}
              key={previewKey}
              src={`/book/${clinicId}?draft=1`}
              title="معاينة الواجهة"
              className="w-full h-[500px] border-0 bg-gray-50"
              onLoad={() => {
                const clinic = { ...(clinicInfo || {}), ...storeData, name: profileData.name || clinicInfo?.name || '', phone: profileData.phone || clinicInfo?.phone || '', _demo: false };
                previewFrameRef.current?.contentWindow?.postMessage({ type: 'clinic-draft', clinicId, clinic }, window.location.origin);
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;