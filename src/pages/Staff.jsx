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
  const { clinicPath, clinicId, clinicInfo, plan } = useClinic();
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

    if (!withinUserLimit(clinicInfo, userCount)) {
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

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة الموظفين</h1>
          <p className="text-gray-500 text-sm mt-1">أضف فريق عملك وحدد أقسامهم وفروعهم</p>
        </div>
        <button
          onClick={() => {
            if (!withinUserLimit(clinicInfo, userCount)) {
              return toast.error(`باقة ${plan?.name} تسمح حتى ${plan?.maxUsers} حسابات — من المدفوعات ترقّي الباقة`);
            }
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium"
        >
          <FaPlus /> موظفة جديدة
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">👩‍⚕️</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا يوجد موظفين بعد</h3>
          <p className="text-gray-500 text-sm">أضف موظفاتك ليتمكنّ من إدارة الحجوزات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => {
            const branchName = branches.find(b => b.id === member.branch)?.name || 'غير محدد';
            return (
              <div key={member.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 relative group">
                <button onClick={() => handleDelete(member.id)} className="absolute top-4 left-4 w-8 h-8 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100">
                  <FaTrash className="text-xs" />
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl">
                    <FaUserTie />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{member.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="inline-block bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-md">
                        {CATEGORIES.find(c => c.id === member.category)?.name || 'غير محدد'}
                      </span>
                      <span className="inline-block bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 text-[10px] px-2 py-0.5 rounded-md">
                        {branchName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FaEnvelope className="text-pink-400 text-xs" />
                    <span dir="ltr">{member.email}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl">
            <div className="bg-pink-500 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">إضافة موظفة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleAddStaff} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الموظفة</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني (للدخول)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور المؤقتة</label>
                <input type="text" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required placeholder="6 أحرف على الأقل" className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم المسؤول عنه</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white">
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
                <select 
                  value={form.branch} 
                  onChange={(e) => setForm({...form, branch: e.target.value})} 
                  required
                  className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white"
                >
                  <option value="" disabled>اختر الفرع...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <button type="submit" disabled={submitting || branches.length === 0} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition mt-2 disabled:opacity-50">
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