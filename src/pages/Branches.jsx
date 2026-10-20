import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaMapMarkerAlt, FaPhone, FaTrash, FaTimes, FaStore } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const Branches = () => {
  const { clinicPath } = useClinic();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (!clinicPath) return;
    const branchesRef = ref(database, clinicPath('branches'));
    
    const unsub = onValue(branchesRef, (snap) => {
      const val = snap.val();
      setBranches(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error('الرجاء إدخال اسم الفرع ورقم الهاتف');

    try {
      const branchesRef = ref(database, clinicPath('branches'));
      const newRef = push(branchesRef);
      await set(newRef, {
        name: form.name,
        phone: form.phone,
        address: form.address || '',
        createdAt: Date.now()
      });
      toast.success('تم إضافة الفرع بنجاح!');
      setShowModal(false);
      setForm({ name: '', phone: '', address: '' });
    } catch (error) {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
    
    try {
      await remove(ref(database, clinicPath(`branches/${id}`)));
      toast.success('تم حذف الفرع');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ToastContainer position="top-left" rtl />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة الفروع</h1>
          <p className="text-gray-500 text-sm mt-1">أضف فروع عيادتك لتربط بها الموظفين والمواعيد</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium">
          <FaPlus /> فرع جديد
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">🏢</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد فروع بعد</h3>
          <p className="text-gray-500 text-sm">أضف فرعك الأول لتبدأ بتوزيع الموظفين عليه.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 relative group">
              <button onClick={(e) => handleDelete(branch.id, e)} className="absolute top-4 left-4 w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100">
                <FaTrash className="text-xs" />
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl">
                  <FaStore />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{branch.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5" dir="ltr">
                    <FaPhone className="text-[10px]" /> {branch.phone}
                  </p>
                </div>
              </div>

              {branch.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl">
                  <FaMapMarkerAlt className="text-pink-400 mt-1 flex-shrink-0" />
                  <p>{branch.address}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-pink-500 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">إضافة فرع جديد</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الفرع / المدينة</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" placeholder="مثال: فرع رهط" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" placeholder="05..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان (اختياري)</label>
                <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} rows={2} className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none resize-none dark:text-white" placeholder="الشارع، الحي..." />
              </div>
              
              <button type="submit" className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition mt-2">
                حفظ الفرع
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;