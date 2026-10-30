import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaTrash, FaTimes, FaSpa, FaPen } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { SERVICE_CATEGORIES } from '../constants/clinicCare';

const emptyServiceForm = {
  title: '',
  category: 'laser',
  imageUrl: '',
  description: '',
  duration: '',
  specialistId: '',
  faqs: [{ q: '', a: '' }],
};

const field = 'w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200';

const Services = () => {
  const { clinicPath } = useClinic();
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyServiceForm);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    if (!clinicPath) {
      setLoading(false);
      return undefined;
    }
    const servPath = clinicPath('services');
    const usersPath = clinicPath('users');
    if (!servPath) {
      setLoading(false);
      return undefined;
    }

    const unsubServ = onValue(ref(database, servPath), (snap) => {
      const val = snap.val();
      setServices(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });

    const unsubUsers = usersPath
      ? onValue(ref(database, usersPath), (snap) => {
          const val = snap.val();
          const list = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : [];
          setStaff(list.filter((u) => u.role !== 'admin'));
        })
      : () => {};

    return () => { unsubServ(); unsubUsers(); };
  }, [clinicPath]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyServiceForm);
    setShowModal(true);
  };

  const openEditService = (item) => {
    const faqs = Array.isArray(item.faqs) && item.faqs.length
      ? item.faqs.map((f) => ({ q: f.q || '', a: f.a || '' }))
      : [{ q: '', a: '' }];
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      category: item.category || 'laser',
      imageUrl: item.imageUrl || '',
      description: item.description || '',
      duration: item.duration || '',
      specialistId: item.specialistId || '',
      faqs,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('الرجاء تعبئة الاسم');
    const basePath = clinicPath('services');
    if (!basePath) return;

    const specialist = staff.find((s) => s.id === form.specialistId);
    const payload = {
      title: form.title.trim(),
      category: form.category,
      imageUrl: form.imageUrl.trim(),
      description: form.description.trim(),
      duration: form.duration.trim(),
      specialistId: form.specialistId || '',
      specialistName: specialist?.name || '',
      faqs: (form.faqs || []).filter((f) => f.q.trim() && f.a.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() })),
    };

    try {
      if (editingId) {
        await update(ref(database, `${basePath}/${editingId}`), { ...payload, updatedAt: Date.now() });
      } else {
        const newRef = push(ref(database, basePath));
        await set(newRef, { ...payload, createdAt: Date.now() });
      }
      toast.success(editingId ? 'تم التحديث' : 'تم إضافة الخدمة');
      setShowModal(false);
      setEditingId(null);
      setForm(emptyServiceForm);
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    const pathToDelete = clinicPath(`services/${id}`);
    if (!pathToDelete) return;
    try {
      await remove(ref(database, pathToDelete));
      toast.success('تم الحذف');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const filtered = useMemo(
    () => services.filter((s) => cat === 'all' || s.category === cat),
    [services, cat],
  );

  const withSpecialist = services.filter((s) => s.specialistId).length;
  const withDuration = services.filter((s) => s.duration).length;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">الخدمات</h1>
          <p className="text-sm text-[#8a9199] mt-1">جلسات العيادة: الاسم، المدة، والمختصة. المنتجات في قسم المنتجات.</p>
        </div>
        <button type="button" onClick={openAdd} className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2.5 rounded-2xl font-bold">
          <FaPlus /> خدمة جديدة
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">الخدمات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{services.length}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">بمختصة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{withSpecialist}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">بمدة محددة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{withDuration}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => setCat('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cat === 'all' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>الكل</button>
        {SERVICE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cat === c.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>{c.name}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="saas-card text-center py-16">
          <h3 className="text-lg font-bold text-[#111827] mb-2">لا خدمات بعد</h3>
          <p className="text-sm text-[#8a9199]">أضيفي جلسة لتظهر في الحجز وملف العميلة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <article key={item.id} className="saas-card p-4 flex flex-col">
              <div className="w-full h-36 bg-[#f8faf9] rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-[#e4eee8]">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <FaSpa className="text-3xl text-emerald-300" />
                )}
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-[#111827]">{item.title}</h3>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => openEditService(item)} className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center">
                    <FaPen className="text-xs" />
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                <span className="nura-chip nura-chip-mint">{SERVICE_CATEGORIES.find((c) => c.id === item.category)?.name || item.category || 'عام'}</span>
                {item.duration && <span className="nura-chip nura-chip-sky">{item.duration}</span>}
                {item.specialistName && <span className="nura-chip nura-chip-gold">{item.specialistName}</span>}
              </div>
              {item.description && <p className="text-xs text-[#8a9199] mt-3 line-clamp-2">{item.description}</p>}
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" dir="rtl">
            <div className="bg-[#10b981] p-5 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">{editingId ? 'تعديل خدمة' : 'خدمة جديدة'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">اسم الجلسة</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={field} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">القسم</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field}>
                  {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">مدة الجلسة</label>
                <input type="text" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="مثال: 45 دقيقة" className={field} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">المختصة</label>
                <select value={form.specialistId} onChange={(e) => setForm({ ...form, specialistId: e.target.value })} className={field}>
                  <option value="">بدون تعيين</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.category ? ` · ${SERVICE_CATEGORIES.find((c) => c.id === s.category)?.name || s.category}` : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-[#8a9199] mt-1">يُربط الحجز بجدول دوام هذه المختصة.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">وصف الخدمة</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${field} resize-none`} placeholder="ما يحدث في الجلسة، بدون نتائج مضمونة" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-[#111827]">أسئلة شائعة</label>
                  <button type="button" onClick={() => setForm({ ...form, faqs: [...(form.faqs || []), { q: '', a: '' }] })} className="text-xs text-emerald-700 font-bold">+ سؤال</button>
                </div>
                <div className="space-y-2">
                  {(form.faqs || []).map((faq, idx) => (
                    <div key={idx} className="border border-[#e4eee8] rounded-xl p-2 space-y-1">
                      <input
                        value={faq.q}
                        onChange={(e) => {
                          const faqs = [...form.faqs];
                          faqs[idx] = { ...faqs[idx], q: e.target.value };
                          setForm({ ...form, faqs });
                        }}
                        placeholder="السؤال"
                        className="w-full p-2 text-sm bg-[#f8faf9] rounded-lg outline-none"
                      />
                      <textarea
                        value={faq.a}
                        onChange={(e) => {
                          const faqs = [...form.faqs];
                          faqs[idx] = { ...faqs[idx], a: e.target.value };
                          setForm({ ...form, faqs });
                        }}
                        placeholder="الإجابة"
                        rows={2}
                        className="w-full p-2 text-sm bg-[#f8faf9] rounded-lg outline-none resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">رابط صورة</label>
                <input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." className={field} dir="ltr" />
              </div>
              <button type="submit" className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold">حفظ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
