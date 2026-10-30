import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database, createStaffAuthUser } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { withinUserLimit } from '../config/plans';
import { FaPlus, FaUserTie, FaTrash, FaTimes, FaEnvelope } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const CATEGORIES = [
  { id: 'laser', name: 'ليزر' },
  { id: 'vitamins', name: 'فيتامينات' },
  { id: 'cosmetica', name: 'كوزمتكا' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'all', name: 'كل الأقسام (سكرتيرة/مديرة)' },
];

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
          <h1 className="text-[22px] font-bold text-[#111827]">إدارة الموظفين</h1>
          <p className="text-sm text-[#8a9199] mt-1">أضيفي فريق العمل وحددي أقسامهم وفروعهم.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isSupport && !withinUserLimit(clinicInfo, userCount, planConfig)) {
              return toast.error(`باقة ${plan?.name} تسمح حتى ${plan?.maxUsers} حسابات — من المدفوعات ترقّي الباقة`);
            }
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2.5 rounded-2xl font-bold"
        >
          <FaPlus /> موظفة جديدة
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">الموظفات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{staff.length}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">الفروع</p>
          <p className="stat-num text-[28px] leading-none mt-2">{branches.length}</p>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="saas-card text-center py-16">
          <h3 className="text-lg font-bold text-[#111827] mb-2">لا موظفات بعد</h3>
          <p className="text-sm text-[#8a9199]">أضيفي موظفات ليتمكنّ من إدارة الحجوزات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => {
            const branchName = branches.find((b) => b.id === member.branch)?.name || 'غير محدد';
            return (
              <article key={member.id} className="saas-card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                      <FaUserTie />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#111827] truncate">{member.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="nura-chip nura-chip-sky">{CATEGORIES.find((c) => c.id === member.category)?.name || 'غير محدد'}</span>
                        <span className="nura-chip nura-chip-mint">{branchName}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleDelete(member.id)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0">
                    <FaTrash className="text-xs" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#8a9199]">
                  <FaEnvelope className="text-emerald-500 text-xs" />
                  <span dir="ltr">{member.email}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-[#10b981] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">إضافة موظفة جديدة</h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleAddStaff} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الموظفة</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني (للدخول)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور المؤقتة</label>
                <input type="text" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required placeholder="6 أحرف على الأقل" className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم المسؤول عنه</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200">
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
                <select 
                  value={form.branch} 
                  onChange={(e) => setForm({...form, branch: e.target.value})} 
                  required
                  className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="" disabled>اختر الفرع...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <button type="submit" disabled={submitting || branches.length === 0} className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold mt-2 disabled:opacity-50">
                {submitting ? 'جاري الإضافة...' : 'إضافة الموظفة'}
              </button>
              {branches.length === 0 && <p className="text-xs text-rose-500 text-center mt-2">الرجاء إضافة فرع أولاً من صفحة "الفروع"</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;