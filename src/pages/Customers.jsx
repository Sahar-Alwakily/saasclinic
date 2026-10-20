import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaPhone, FaBirthdayCake, FaTrash, FaPen, FaEye } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import CustomerFormModal from '../components/customers/CustomerFormModal';

const Customers = () => {
  const { clinicPath } = useClinic();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const custPath = clinicPath?.('customers');
    if (!custPath) {
      setLoading(false);
      return undefined;
    }
    const unsub = onValue(ref(database, custPath), (snap) => {
      const val = snap.val();
      setCustomers(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  const persist = async (form) => {
    if (!form.firstName || !form.phone) {
      toast.error('الاسم الأول ورقم الهاتف مطلوبان');
      return;
    }
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName || '',
      phone: form.phone,
      birthDate: form.birthDate || '',
      idNumber: form.idNumber || '',
      gender: form.gender || 'female',
      medicalInfo: form.medicalInfo || {},
      adsStamp: form.adsStamp || null,
      updatedAt: Date.now(),
    };
    try {
      if (editing?.id) {
        await update(ref(database, clinicPath(`customers/${editing.id}`)), payload);
        toast.success('عُدّل الملف');
      } else {
        const newCustRef = push(ref(database, clinicPath('customers')));
        await set(newCustRef, {
          ...payload,
          createdAt: Date.now(),
          sessions: [],
          treatments: {},
        });
        toast.success('تم إضافة العميلة بنجاح!');
      }
      setShowModal(false);
      setEditing(null);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه العميلة؟')) return;
    try {
      await remove(ref(database, clinicPath(`customers/${id}`)));
      toast.success('تم الحذف بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ملفات العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة بيانات عملائك وسجلاتهم</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium"
        >
          <FaPlus /> عميلة جديدة
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-transparent outline-none text-sm dark:text-white"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500 text-sm">لم يتم العثور على عملاء مطابقين.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const treatObj = cust.treatments || {};
            const treatCount = Object.keys(treatObj).length;
            const afterCount = Object.values(treatObj).filter((t) => t.currentPhase === 'after').length;
            return (
              <div
                key={cust.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 relative group flex flex-col"
              >
                <div className="absolute top-4 left-4 flex gap-1 z-10">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditing(cust); setShowModal(true); }}
                    className="w-8 h-8 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <FaPen className="text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(cust.id, e)}
                    className="w-8 h-8 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-100"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>

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
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <span className="bg-pink-50 dark:bg-pink-900/20 rounded-lg px-2 py-1">{cust.sessions?.length || 0} جلسة</span>
                    <span className="bg-violet-50 dark:bg-violet-900/20 rounded-lg px-2 py-1">{treatCount} علاج</span>
                    <span className="bg-stone-50 dark:bg-slate-700 rounded-lg px-2 py-1">ختم إعلان {cust.adsStamp?.signature ? '✓' : '—'}</span>
                    <span className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-2 py-1">{afterCount} بعد العلاج</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/customers/${cust.id}`)}
                  className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 text-center text-pink-600 font-medium text-sm flex items-center justify-center gap-2 w-full"
                >
                  <FaEye /> فتح الملف
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CustomerFormModal
        show={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSubmit={persist}
        initial={editing}
        title={editing ? 'تعديل العميلة' : 'إضافة عميلة جديدة'}
      />
    </div>
  );
};

export default Customers;
