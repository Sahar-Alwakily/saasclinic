import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaTrash, FaTag, FaTimes, FaBoxOpen } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const CATEGORIES = [
  { id: 'laser', name: 'ليزر' },
  { id: 'vitamins', name: 'فيتامينات' },
  { id: 'cosmetica', name: 'كوزمتكا' },
  { id: 'beauty', name: 'تجميل' },
];

const Services = () => {
  const { clinicPath } = useClinic();
  const [activeTab, setActiveTab] = useState('services'); // 'services' أو 'products'
  
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // حالة الفورم
  const [form, setForm] = useState({ title: '', category: 'laser', price: '', imageUrl: '' });

  // جلب البيانات
  useEffect(() => {
    if (!clinicPath) return;
    const servPath = clinicPath('services');
    const prodPath = clinicPath('products');
    if (!servPath || !prodPath) return;

    const unsubServ = onValue(ref(database, servPath), (snap) => {
      const val = snap.val();
      setServices(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });

    const unsubProd = onValue(ref(database, prodPath), (snap) => {
      const val = snap.val();
      setProducts(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });

    return () => { unsubServ(); unsubProd(); };
  }, [clinicPath]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return toast.error('الرجاء تعبئة الاسم والسعر');

    const pathToSave = activeTab === 'services' ? clinicPath('services') : clinicPath('products');
    if (!pathToSave) return;

    try {
      const newRef = push(ref(database, pathToSave));
      await set(newRef, {
        title: form.title,
        category: form.category,
        price: Number(form.price),
        imageUrl: form.imageUrl || '',
        createdAt: Date.now(),
      });
      toast.success('تم الإضافة بنجاح!');
      setShowModal(false);
      setForm({ title: '', category: 'laser', price: '', imageUrl: '' });
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    const pathToDelete = activeTab === 'services' ? clinicPath(`services/${id}`) : clinicPath(`products/${id}`);
    if (!pathToDelete) return;
    try {
      await remove(ref(database, pathToDelete));
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const currentList = activeTab === 'services' ? services : products;

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">الخدمات والمنتجات</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة ما تقدمه عيادتك للعملاء</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium">
          <FaPlus /> {activeTab === 'services' ? 'خدمة جديدة' : 'منتج جديد'}
        </button>
      </div>

      {/* التبويبات - مفتوحة للكل */}
      <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 w-fit">
        <button onClick={() => setActiveTab('services')} className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === 'services' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>الخدمات</button>
        <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === 'products' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>المنتجات</button>
      </div>

      {currentList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">{activeTab === 'services' ? '🏷️' : '📦'}</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد {activeTab === 'services' ? 'خدمات' : 'منتجات'} بعد</h3>
          <p className="text-gray-500 text-sm">ابدأ بإضافة أول عنصر لتبدو واجهتك متكاملة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentList.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col relative group text-center">
              <button onClick={() => handleDelete(item.id)} className="absolute top-3 left-3 w-8 h-8 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 z-10">
                <FaTrash className="text-xs" />
              </button>
              
              <div className="w-full h-32 bg-gray-50 dark:bg-slate-900 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                ) : (
                  <FaBoxOpen className="text-4xl text-gray-300 dark:text-slate-600" />
                )}
              </div>
              
              <h3 className="text-md font-bold text-gray-800 dark:text-white mb-1">{item.title}</h3>
              {activeTab === 'services' && <p className="text-xs text-gray-500 mb-2">قسم: {CATEGORIES.find(c => c.id === item.category)?.name}</p>}
              
              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
                <span className="text-lg font-bold text-pink-600 dark:text-pink-400">{item.price} ₪</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة الإضافة */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-pink-500 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">إضافة {activeTab === 'services' ? 'خدمة' : 'منتج'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none" />
              </div>
              
              {activeTab === 'services' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم</label>
                  <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none">
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر (₪)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط الصورة (URL) - اختياري</label>
                <input type="url" value={form.imageUrl} onChange={(e) => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none text-sm" dir="ltr" />
              </div>
              
              <button type="submit" className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition mt-2">حفظ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;