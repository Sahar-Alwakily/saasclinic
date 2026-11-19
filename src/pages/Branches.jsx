import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { withinBranchLimit } from '../config/plans';
import { FaPlus, FaMapMarkerAlt, FaPhone, FaTrash, FaTimes, FaStore, FaWhatsapp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import TeamNav from '../components/team/TeamNav';
import TeamStatStrip from '../components/team/TeamStatStrip';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]';

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
    } catch {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;

    try {
      await remove(ref(database, clinicPath(`branches/${id}`)));
      toast.success('تم حذف الفرع');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4EAEE] border-t-[#0FA3A3]" />
      </div>
    );
  }

  const maxBranches = Number.isFinite(plan?.maxBranches) ? plan.maxBranches : null;

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الفريق</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">الفروع</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">أضيفي فروع العيادة لتربطي بها الموظفات والمواعيد.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TeamNav />
          <button
            type="button"
            onClick={() => {
              if (!isSupport && !withinBranchLimit(clinicInfo, branches.length, planConfig)) {
                return toast.error(`باقة ${plan?.name} وصلت حد الفروع`);
              }
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#047857]"
          >
            <FaPlus className="text-[11px]" /> فرع جديد
          </button>
        </div>
      </header>

      <TeamStatStrip
        items={[
          { label: 'الفروع', value: branches.length, note: 'فروع مرتبطة بالحجوزات', accent: '#059669' },
          { label: 'عناوين مسجلة', value: branches.filter((b) => b.address).length, note: 'جاهزة لصفحة الحجز', accent: '#0FA3A3' },
          { label: 'واتساب مربوط', value: branches.filter((b) => b.whatsapp).length, note: 'أرقام تواصل للفروع', accent: '#0E7490' },
          {
            label: 'حد الفروع',
            value: maxBranches ? `${branches.length} / ${maxBranches}` : branches.length,
            note: maxBranches ? `باقة ${plan?.name || 'الحالية'}` : 'بلا حد',
            accent: '#B45309',
          },
        ]}
      />

      {branches.length === 0 ? (
        <section className="rounded-xl border border-[#E4EAEE] bg-white px-5 py-12 text-center">
          <h3 className="text-[13.5px] font-bold text-[#334155]">لا فروع بعد</h3>
          <p className="mt-1 text-[11.5px] text-[#94A3B8]">أضيفي فرعك الأول لتبدئي بتوزيع الموظفات عليه.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {branches.map((branch) => (
            <article key={branch.id} className="relative overflow-hidden rounded-xl border border-[#E4EAEE] bg-white p-4">
              <span className="absolute inset-y-0 start-0 w-[3px] bg-[#0FA3A3]" />
              <div className="flex items-start gap-3 ps-1.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#ECFEFF] text-[#0E7490]">
                  <FaStore className="text-[13px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[13.5px] font-bold text-[#0F172A]">{branch.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-[#64748B]" dir="ltr">
                    <FaPhone className="shrink-0 text-[9px] text-[#94A3B8]" /> {branch.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(branch.id, e)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626] transition-colors hover:border-[#DC2626]"
                  aria-label={`حذف ${branch.name}`}
                >
                  <FaTrash className="text-[10px]" />
                </button>
              </div>

              {branch.address && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#EDF1F4] bg-[#FAFCFC] px-3 py-2 text-[11px] text-[#475569]">
                  <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[9px] text-[#0FA3A3]" />
                  <p>{branch.address}</p>
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#94A3B8]">
                {branch.hours && <span>ساعات العمل: {branch.hours}</span>}
                {branch.whatsapp && (
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <FaWhatsapp className="text-[9px] text-[#059669]" /> {branch.whatsapp}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
            <div className="flex items-center justify-between gap-3 border-b border-[#E4EAEE] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ECFEFF] text-[#0E7490]"><FaStore className="text-[11px]" /></span>
                <h3 className="text-[14px] font-extrabold">إضافة فرع جديد</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#64748B] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]"
                aria-label="إغلاق"
              >
                <FaTimes className="text-[11px]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 p-5">
              <label className="block text-[10.5px] font-bold text-[#64748B]">اسم الفرع / المدينة
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={`${field} mt-1`} placeholder="مثال: فرع رهط" />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">رقم الهاتف
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className={`${field} mt-1`} dir="ltr" placeholder="05..." />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">العنوان (اختياري)
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={`${field} mt-1 resize-none`} placeholder="الشارع، الحي..." />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">واتساب (اختياري)
                <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={`${field} mt-1`} dir="ltr" placeholder="05..." />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">ساعات العمل للعرض (اختياري)
                <input type="text" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className={`${field} mt-1`} placeholder="مثال: الأحد–الخميس 9:00–17:00" />
              </label>

              <button type="submit" className="mt-1 w-full rounded-lg bg-[#059669] py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#047857]">
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
