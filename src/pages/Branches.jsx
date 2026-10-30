import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { withinBranchLimit } from '../config/plans';
import { FaPlus, FaMapMarkerAlt, FaPhone, FaTrash, FaTimes, FaStore } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const Branches = () => {
  const { clinicPath, clinicInfo, plan, planConfig, isSupport } = useClinic();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', address: '', whatsapp: '', hours: '' });

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
    if (!isSupport && !withinBranchLimit(clinicInfo, branches.length, planConfig)) {
      return toast.error(`باقة ${plan?.name} تسمح حتى ${Number.isFinite(plan?.maxBranches) ? plan.maxBranches : '—'} فروع`);
    }

    try {
      const branchesRef = ref(database, clinicPath('branches'));
      const newRef = push(branchesRef);
      await set(newRef, {
        name: form.name,
        phone: form.phone,
        address: form.address || '',
        whatsapp: form.whatsapp || '',
        hours: form.hours || '',
        createdAt: Date.now()
      });
      toast.success('تم إضافة الفرع بنجاح!');
      setShowModal(false);
      setForm({ name: '', phone: '', address: '', whatsapp: '', hours: '' });
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

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">إدارة الفروع</h1>
          <p className="text-sm text-[#8a9199] mt-1">أضيفي فروع العيادة لتربطي بها الموظفات والمواعيد.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isSupport && !withinBranchLimit(clinicInfo, branches.length, planConfig)) {
              return toast.error(`باقة ${plan?.name} وصلت حد الفروع — رقّي من المدفوعات`);
            }
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2.5 rounded-2xl font-bold"
        >
          <FaPlus /> فرع جديد
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="saas-card text-center py-16">
          <h3 className="text-lg font-bold text-[#111827] mb-2">لا فروع بعد</h3>
          <p className="text-sm text-[#8a9199]">أضيفي فرعك الأول لتبدئي بتوزيع الموظفات عليه.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <article key={branch.id} className="saas-card p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                    <FaStore />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111827]">{branch.name}</h3>
                    <p className="text-sm text-[#8a9199] flex items-center gap-1 mt-0.5" dir="ltr">
                      <FaPhone className="text-[10px]" /> {branch.phone}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={(e) => handleDelete(branch.id, e)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                  <FaTrash className="text-xs" />
                </button>
              </div>

              {branch.address && (
                <div className="flex items-start gap-2 text-sm text-[#6b7280] bg-[#f8faf9] border border-[#e4eee8] p-3 rounded-xl">
                  <FaMapMarkerAlt className="text-emerald-500 mt-1 flex-shrink-0" />
                  <p>{branch.address}</p>
                </div>
              )}
              {branch.hours && <p className="text-xs text-[#8a9199] mt-2">ساعات العمل: {branch.hours}</p>}
              {branch.whatsapp && <p className="text-xs text-[#8a9199] mt-1" dir="ltr">واتساب: {branch.whatsapp}</p>}
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-[#10b981] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">إضافة فرع جديد</h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الفرع / المدينة</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" placeholder="مثال: فرع رهط" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" dir="ltr" placeholder="05..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان (اختياري)</label>
                <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} rows={2} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none resize-none focus:ring-2 focus:ring-emerald-200" placeholder="الشارع، الحي..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">واتساب (اختياري)</label>
                <input type="tel" value={form.whatsapp} onChange={(e) => setForm({...form, whatsapp: e.target.value})} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" dir="ltr" placeholder="05..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ساعات العمل للعرض (اختياري)</label>
                <input type="text" value={form.hours} onChange={(e) => setForm({...form, hours: e.target.value})} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" placeholder="مثال: الأحد–الخميس 9:00–17:00" />
              </div>
              
              <button type="submit" className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold mt-2">
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