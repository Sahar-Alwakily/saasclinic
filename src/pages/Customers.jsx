import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaPhone, FaBirthdayCake, FaTrash, FaTimes, FaEye } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Customers = () => {
  const { clinicPath } = useClinic();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // حالة الفورم
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '',
  });

  // جلب العملاء
  useEffect(() => {
    if (!clinicPath) return;
    const custPath = clinicPath('customers');
    if (!custPath) return;

    const unsub = onValue(ref(database, custPath), (snap) => {
      const val = snap.val();
      setCustomers(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  // إضافة عميلة
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.phone) {
      toast.error('الاسم الأول ورقم الهاتف مطلوبان');
      return;
    }

    const custPath = clinicPath('customers');
    if (!custPath) return;

    try {
      const newCustRef = push(ref(database, custPath));
      await set(newCustRef, {
        firstName: form.firstName,
        lastName: form.lastName || '',
        phone: form.phone,
        birthDate: form.birthDate || '',
        createdAt: Date.now(),
        sessions: [], // مصفوفة فاضية للجلسات
        treatments: {} // مصفوفة فاضية للعلاجات
      });
      toast.success('تم إضافة العميلة بنجاح!');
      setShowModal(false);
      setForm({ firstName: '', lastName: '', phone: '', birthDate: '' });
    } catch (error) {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  // حذف عميلة
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // منع فتح الملف عند الضغط على زر الحذف
    if (!window.confirm('هل أنت متأكد من حذف هذه العميلة؟')) return;
    const custPath = clinicPath(`customers/${id}`);
    if (!custPath) return;
    try {
      await remove(ref(database, custPath));
      toast.success('تم الحذف بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  // فلترة البحث
  const filteredCustomers = customers.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />

      {/* الهيدر */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ملفات العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة بيانات عملائك وسجلاتهم</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium"
        >
          <FaPlus /> عميلة جديدة
        </button>
      </div>

      {/* شريط البحث */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-transparent outline-none text-sm dark:text-white"
        />
      </div>

      {/* شبكة العملاء */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500 text-sm">لم يتم العثور على عملاء مطابقين.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div 
              key={cust.id} 
              onClick={() => navigate(`/customers/${cust.id}`)} 
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 relative group flex flex-col cursor-pointer hover:shadow-md hover:border-pink-200 dark:hover:border-pink-900 transition-all"
            >
              <button
                onClick={(e) => handleDelete(cust.id, e)}
                className="absolute top-4 left-4 w-8 h-8 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 z-10"
              >
                <FaTrash className="text-xs" />
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl font-bold">
                  {cust.firstName?.charAt(0) || '؟'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{cust.firstName} {cust.lastName}</h3>
                  <p className="text-sm text-gray-500">عميلة</p>
                </div>
              </div>

              <div className="space-y-2 mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FaPhone className="text-pink-400 text-xs" />
                  <span dir="ltr">{cust.phone}</span>
                </div>
                {cust.birthDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FaBirthdayCake className="text-pink-400 text-xs" />
                    <span>{cust.birthDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                  <span>{cust.sessions?.length || 0} جلسة مسجلة</span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 text-center text-pink-600 font-medium text-sm flex items-center justify-center gap-2">
                <FaEye /> فتح الملف الطبي
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة إضافة عميلة */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-pink-500 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">إضافة عميلة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الأول *</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العائلة</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الميلاد (اختياري)</label>
                <input type="date" value={form.birthDate} onChange={(e) => setForm({...form, birthDate: e.target.value})} className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none" dir="ltr" />
              </div>
              
              <button type="submit" className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition mt-2">
                حفظ العميلة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;