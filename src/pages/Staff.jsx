import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database, createStaffAuthUser } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { withinUserLimit } from '../config/plans';
import { FaPlus, FaUserTie, FaTrash, FaTimes, FaEnvelope, FaTimesCircle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import TeamNav from '../components/team/TeamNav';
import TeamStatStrip from '../components/team/TeamStatStrip';

const CATEGORIES = [
  { id: 'laser', name: 'ليزر' },
  { id: 'vitamins', name: 'فيتامينات' },
  { id: 'cosmetica', name: 'كوزمتكا' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'all', name: 'كل الأقسام (سكرتيرة/مديرة)' },
];

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]';

const Staff = () => {
  const { clinicPath, clinicId, clinicInfo, plan, planConfig, isSupport } = useClinic();
  const [staff, setStaff] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    category: 'laser',
    branch: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clinicPath) return;
    const usersPath = clinicPath('users');
    const branchesPath = clinicPath('branches');
    if (!usersPath || !branchesPath) return;

    const unsubUsers = onValue(ref(database, usersPath), (snap) => {
      const val = snap.val();
      const all = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : [];
      setUserCount(all.length);
      setStaff(all.filter((u) => u.role !== 'admin'));
    });

    const unsubBranches = onValue(ref(database, branchesPath), (snap) => {
      const val = snap.val();
      const list = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : [];
      setBranches(list);
      if (list.length > 0 && !form.branch) {
        setForm(prev => ({ ...prev, branch: list[0].id }));
      }
      setLoading(false);
    });

    return () => { unsubUsers(); unsubBranches(); };
  }, [clinicPath]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.branch) {
      return toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
    }
    if (form.password.length < 6) {
      return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    if (!isSupport && !withinUserLimit(clinicInfo, userCount, planConfig)) {
      return toast.error(`باقة ${plan?.name} تسمح حتى ${plan?.maxUsers} حسابات`);
    }

    setSubmitting(true);
    let newUid = null;

    try {
      newUid = await createStaffAuthUser(form.email.trim(), form.password);

      await set(ref(database, `${clinicPath('users')}/${newUid}`), {
        name: form.name,
        email: form.email.trim(),
        role: 'worker',
        category: form.category,
        branch: form.branch,
        createdAt: Date.now(),
      });

      await set(ref(database, `meta/users/${newUid}`), {
        clinicId: clinicId,
        role: 'worker',
        email: form.email.trim(),
        category: form.category,
        branch: form.branch,
      });

      toast.success('تمت إضافة الموظفة بنجاح!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', category: 'laser', branch: branches[0]?.id || '' });
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('هذا الإيميل مستخدم مسبقاً');
      } else {
        toast.error('حدث خطأ أثناء إضافة الموظفة');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الموظفة؟')) return;
    try {
      await remove(ref(database, `${clinicPath('users')}/${id}`));
      await remove(ref(database, `meta/users/${id}`));
      toast.success('تم حذف الموظفة');
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

  const categoriesUsed = new Set(staff.map((member) => member.category).filter(Boolean)).size;
  const maxUsers = Number.isFinite(plan?.maxUsers) ? plan.maxUsers : null;

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الفريق</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">الموظفات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">أضيفي فريق العمل وحددي أقسامهم وفروعهم.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TeamNav />
          <button
            type="button"
            onClick={() => {
              if (!isSupport && !withinUserLimit(clinicInfo, userCount, planConfig)) {
                return toast.error(`باقة ${plan?.name} تسمح حتى ${plan?.maxUsers} حسابات`);
              }
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#047857]"
          >
            <FaPlus className="text-[11px]" /> موظفة جديدة
          </button>
        </div>
      </header>

      <TeamStatStrip
        items={[
          { label: 'الموظفات', value: staff.length, note: 'حسابات فريق نشطة', accent: '#059669' },
          { label: 'الفروع', value: branches.length, note: 'موزعة على الفروع', accent: '#0FA3A3' },
          { label: 'الأقسام', value: categoriesUsed, note: 'أقسام مسؤوليات', accent: '#0E7490' },
          {
            label: 'حد الحسابات',
            value: maxUsers ? `${userCount} / ${maxUsers}` : userCount,
            note: maxUsers ? `باقة ${plan?.name || 'الحالية'}` : 'بلا حد',
            accent: '#B45309',
          },
        ]}
      />

      {staff.length === 0 ? (
        <section className="rounded-xl border border-[#E4EAEE] bg-white px-5 py-12 text-center">
          <h3 className="text-[13.5px] font-bold text-[#334155]">لا موظفات بعد</h3>
          <p className="mt-1 text-[11.5px] text-[#94A3B8]">أضيفي موظفات ليتمكنّ من إدارة الحجوزات.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const branchName = branches.find((b) => b.id === member.branch)?.name || 'غير محدد';
            return (
              <article key={member.id} className="relative overflow-hidden rounded-xl border border-[#E4EAEE] bg-white p-4">
                <span className="absolute inset-y-0 start-0 w-[3px] bg-[#0FA3A3]" />
                <div className="flex items-start gap-3 ps-1.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#ECFEFF] text-[13px] font-bold text-[#0E7490]">
                    {(member.name || 'م').trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13.5px] font-bold text-[#0F172A]">{member.name}</h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-2 py-0.5 text-[9.5px] font-bold text-[#0E7490]">
                        {CATEGORIES.find((c) => c.id === member.category)?.name || 'غير محدد'}
                      </span>
                      <span className="rounded-full border border-[#E4EAEE] bg-[#F8FAFC] px-2 py-0.5 text-[9.5px] font-bold text-[#475569]">
                        {branchName}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#94A3B8]">
                      <FaEnvelope className="shrink-0 text-[9px]" />
                      <span dir="ltr" className="truncate">{member.email}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(member.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626] transition-colors hover:border-[#DC2626]"
                    aria-label={`حذف ${member.name}`}
                  >
                    <FaTrash className="text-[10px]" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
            <div className="flex items-center justify-between gap-3 border-b border-[#E4EAEE] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ECFDF5] text-[#047857]"><FaUserTie className="text-[11px]" /></span>
                <h3 className="text-[14px] font-extrabold">إضافة موظفة جديدة</h3>
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

            <form onSubmit={handleAddStaff} className="space-y-3 p-5">
              <label className="block text-[10.5px] font-bold text-[#64748B]">اسم الموظفة
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={`${field} mt-1`} />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">البريد الإلكتروني (للدخول)
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={`${field} mt-1`} dir="ltr" />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">كلمة المرور المؤقتة
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="6 أحرف على الأقل" className={`${field} mt-1`} dir="ltr" />
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">القسم المسؤول عنه
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${field} mt-1`}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block text-[10.5px] font-bold text-[#64748B]">الفرع
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  required
                  className={`${field} mt-1`}
                >
                  <option value="" disabled>اختر الفرع...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <button type="submit" disabled={submitting || branches.length === 0} className="mt-1 w-full rounded-lg bg-[#059669] py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-50">
                {submitting ? 'جاري الإضافة...' : 'إضافة الموظفة'}
              </button>
              {branches.length === 0 && (
                <p className="flex items-center justify-center gap-1.5 text-[10.5px] text-[#DC2626]">
                  <FaTimesCircle className="text-[9px]" /> الرجاء إضافة فرع أولاً من صفحة «الفروع»
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      <p className="text-[10.5px] text-[#94A3B8]">
        الصلاحيات تُضبط عند الإضافة (قسم / فرع). <span className="font-bold text-[#0E7490]">جدول الدوام</span> يُعدّل من قسم الدوام والعطل.
      </p>
    </div>
  );
};

export default Staff;
