import React, { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaCheckCircle, FaStore, FaLink, FaBuilding, FaSave, FaDesktop, FaSync } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const THEMES = [
  { id: 'beauty', name: 'تجميلي (وردي)', color: 'bg-pink-500', desc: 'تصميم عصري لعيادات التجميل' },
  { id: 'elegant', name: 'راقي (ذهبي)', color: 'bg-amber-600', desc: 'تصميم داكن فخم' },
  { id: 'minimal', name: 'بسيط (أبيض)', color: 'bg-gray-800', desc: 'بسيط وركز على المحتوى' },
];

const Settings = () => {
  const { clinicId, clinicInfo, clinicPath } = useClinic();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' أو 'store'
  const [loading, setLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());

  // بيانات الحساب
  const [profileData, setProfileData] = useState({ name: '', phone: '', ownerEmail: '' });
  
  // بيانات المتجر
  const [storeData, setStoreData] = useState({
    storeTheme: 'beauty', storeDescription: '', doctorName: '',
    heroImage: '', logoUrl: '', whatsapp: '', address: '',
    // ✅ الحقول الجديدة
    doctorBio: '', specialty: '', degree: '',
    facebook: '', instagram: '', tiktok: '',
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
        doctorName: clinicInfo.doctorName || '',
        heroImage: clinicInfo.heroImage || '',
        logoUrl: clinicInfo.logoUrl || '',
        whatsapp: clinicInfo.whatsapp || '',
        address: clinicInfo.address || '',
        // ✅ جلب الحقول الجديدة
        doctorBio: clinicInfo.doctorBio || '',
        specialty: clinicInfo.specialty || '',
        degree: clinicInfo.degree || '',
        facebook: clinicInfo.facebook || '',
        instagram: clinicInfo.instagram || '',
        tiktok: clinicInfo.tiktok || '',
      });
    }
  }, [clinicInfo]);

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

  const storeUrl = `${window.location.origin}/book/${clinicId}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <ToastContainer position="top-left" rtl />
      
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إعدادات العيادة</h1>
        <p className="text-gray-500 text-sm mt-1">إدارة بيانات الحساب وتخصيص واجهة المتجر</p>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 w-fit">
        <button onClick={() => setActiveTab('profile')} className={`px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'profile' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaBuilding /> بيانات العيادة
        </button>
        <button onClick={() => setActiveTab('store')} className={`px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'store' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FaStore /> واجهة المتجر
        </button>
      </div>

      {/* شبكة مقسمة: إعدادات + معاينة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* العمود الأيمن: الإعدادات */}
        <div className="space-y-6">
          {/* تبويب بيانات العيادة */}
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

          {/* تبويب واجهة المتجر */}
          {activeTab === 'store' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
              {/* الرابط */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <FaLink className="text-pink-500" /> رابط صفحة الحجز
                </label>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                  <input type="text" readOnly value={storeUrl} className="flex-1 bg-transparent outline-none text-sm text-gray-600 dark:text-gray-300" dir="ltr" />
                  <button onClick={() => { navigator.clipboard.writeText(storeUrl); toast.info('تم نسخ الرابط!'); }} className="text-xs bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 font-medium">نسخ</button>
                </div>
              </div>

              {/* التصميم */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">اختر تصميم الواجهة</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {THEMES.map((theme) => (
                    <div key={theme.id} onClick={() => setStoreData({...storeData, storeTheme: theme.id})} className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${storeData.storeTheme === theme.id ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-slate-600'}`}>
                      <div className={`w-10 h-10 rounded-xl ${theme.color} text-white flex items-center justify-center mb-3`}><FaStore /></div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{theme.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{theme.desc}</p>
                      {storeData.storeTheme === theme.id && <FaCheckCircle className="text-pink-500 mt-2" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* بيانات الواجهة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الطبيبة / العيادة</label>
                  <input type="text" value={storeData.doctorName} onChange={(e) => setStoreData({...storeData, doctorName: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط اللوجو</label>
                  <input type="url" value={storeData.logoUrl} onChange={(e) => setStoreData({...storeData, logoUrl: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط صورة الطبيبة/البانر</label>
                  <input type="url" value={storeData.heroImage} onChange={(e) => setStoreData({...storeData, heroImage: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نص الترحيب</label>
                  <textarea value={storeData.storeDescription} onChange={(e) => setStoreData({...storeData, storeDescription: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" />
                </div>
                
                {/* ✅ الحقول الجديدة */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نبذة عن الطبيب (تظهر تحت الاسم)</label>
                  <textarea value={storeData.doctorBio} onChange={(e) => setStoreData({...storeData, doctorBio: e.target.value})} rows={3} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none resize-none" placeholder="طبيبة أسنان حاصلة على..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">التخصص (للشارة)</label>
                  <input type="text" value={storeData.specialty} onChange={(e) => setStoreData({...storeData, specialty: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" placeholder="تجميل أسنان" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الشهادة (للشارة)</label>
                  <input type="text" value={storeData.degree} onChange={(e) => setStoreData({...storeData, degree: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" placeholder="DMD" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط فيسبوك</label>
                  <input type="url" value={storeData.facebook} onChange={(e) => setStoreData({...storeData, facebook: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" placeholder="https://facebook.com/..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط انستغرام</label>
                  <input type="url" value={storeData.instagram} onChange={(e) => setStoreData({...storeData, instagram: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رابط تيك توك</label>
                  <input type="url" value={storeData.tiktok} onChange={(e) => setStoreData({...storeData, tiktok: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" placeholder="https://tiktok.com/@..." />
                </div>
                {/* ================== */}

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الواتساب</label>
                  <input type="text" value={storeData.whatsapp} onChange={(e) => setStoreData({...storeData, whatsapp: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">العنوان</label>
                  <input type="text" value={storeData.address} onChange={(e) => setStoreData({...storeData, address: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none" />
                </div>
              </div>

              <button onClick={handleSaveStore} disabled={loading} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                <FaSave /> {loading ? 'جاري الحفظ...' : 'حفظ إعدادات الواجهة'}
              </button>
            </div>
          )}
        </div>

        {/* العمود الأيسر: المعاينة الحية */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaDesktop className="text-pink-500 text-lg" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">معاينة حية</h2>
            </div>
            <button 
              onClick={() => setPreviewKey(Date.now())} 
              className="text-sm text-pink-500 hover:text-pink-600 flex items-center gap-1 bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-lg transition"
            >
              <FaSync /> تحديث
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            {/* شريط المتصفح الوهمي */}
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
            
            {/* الـ iframe */}
            <iframe
              key={previewKey}
              src={`/book/${clinicId}`}
              title="معاينة الواجهة"
              className="w-full h-[500px] border-0 bg-gray-50"
            />
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">هذه المعاينة تظهر كيف يرى العميل واجهة عيادتك.</p>
          
          <div className="text-center mt-4">
            <Link to={`/book/${clinicId}`} target="_blank" className="inline-flex items-center gap-2 text-pink-600 font-medium hover:underline text-sm">
              فتح في نافذة جديدة ↗
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;