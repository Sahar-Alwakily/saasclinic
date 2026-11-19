import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaTrash, FaTimes, FaPen } from 'react-icons/fa';
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

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';

function durationLabel(value) {
  const text = String(value || '').trim();
  if (!text) return 'غير محددة';
  if (/دقيقة|ساعة/.test(text)) return text;
  if (/^\d+$/.test(text)) return `${text} دقيقة`;
  return text;
}

function categoryName(id) {
  return SERVICE_CATEGORIES.find((c) => c.id === id)?.name || 'عام';
}

const Services = () => {
  const { clinicPath } = useClinic();
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
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
          setUsers(list);
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

  const staff = users.filter((u) => u.role !== 'admin');
  const withSpecialist = services.filter((s) => s.specialistId).length;
  const withDuration = services.filter((s) => s.duration).length;

  const kpis = [
    { label: 'الخدمات', value: String(services.length), note: 'تظهر في الحجز', accent: '#059669' },
    { label: 'بمختصة', value: String(withSpecialist), note: withSpecialist === services.length ? 'كلها مربوطة بمختصة' : `${services.length - withSpecialist} بدون مختصة`, accent: '#0FA3A3' },
    { label: 'بمدة محددة', value: String(withDuration), note: withDuration === services.length ? 'المدة مكتوبة على كل خدمة' : `${services.length - withDuration} بدون مدة`, accent: '#B45309' },
  ];
  const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]';

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4EAEE] border-t-[#059669]" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">جلسات العيادة</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">الخدمات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">كل كارد يوضح القسم، المدة، والمختصة. المنتجات في قسم المنتجات.</p>
        </div>
        <button type="button" onClick={openAdd} className={primary}>+ خدمة جديدة</button>
      </header>

      <section aria-label="مؤشرات الخدمات" className="grid grid-cols-3 border-y border-[#E4EAEE]">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-5 py-4 ${i > 0 ? 'border-s border-[#E4EAEE]' : ''}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />{k.label}</p>
            <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      <div className="flex gap-1.5 overflow-x-auto">
        <button type="button" onClick={() => setCat('all')} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${cat === 'all' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>الكل {services.length}</button>
        {SERVICE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${cat === c.id ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>{c.name} {services.filter((s) => s.category === c.id).length}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-16 text-center">
          <h3 className="text-[15px] font-bold">لا خدمات في هذا القسم</h3>
          <p className="mt-1 text-[12.5px] text-[#64748B]">أضيفي جلسة لتظهر في الحجز وملف العميلة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const linked = users.find((s) => s.id === item.specialistId);
            const specialist = item.specialistName || linked?.name || '';
            const facts = [
              ['القسم', categoryName(item.category)],
              ['المدة', durationLabel(item.duration)],
              ['المختصة', specialist || (item.specialistId ? 'مربوطة بدون اسم' : 'غير معيّنة')],
            ];
            return (
              <article key={item.id} className="flex flex-col rounded-lg border border-[#E4EAEE] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-extrabold">{item.title || 'خدمة بلا اسم'}</h3>
                    <p className="mt-1 text-[11.5px] text-[#64748B]">{item.description || 'بدون وصف'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => openEditService(item)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] bg-white text-[#0E7490]" aria-label="تعديل الخدمة"><FaPen className="text-[11px]" /></button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]" aria-label="حذف الخدمة"><FaTrash className="text-[11px]" /></button>
                  </div>
                </div>
                {item.imageUrl && <img src={item.imageUrl} alt={item.title || ''} className="mt-3 h-28 w-full rounded-lg border border-[#E4EAEE] object-cover" />}
                <dl className="mt-3 space-y-1.5 border-t border-[#EDF1F4] pt-3">
                  {facts.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-[12.5px]">
                      <dt className="text-[#94A3B8]">{label}</dt>
                      <dd className={`font-bold ${value === 'غير محددة' || value === 'غير معيّنة' || value === 'مربوطة بدون اسم' ? 'text-[#B45309]' : 'text-[#0F172A]'}`}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E4EAEE] px-5 py-4">
              <h3 className="text-[16px] font-extrabold">{editingId ? 'تعديل خدمة' : 'خدمة جديدة'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#64748B]" aria-label="إغلاق"><FaTimes className="text-[11px]" /></button>
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
                  {[...staff, ...users.filter((u) => u.id === form.specialistId && !staff.some((s) => s.id === u.id))].map((s) => (
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
              <button type="submit" className={primary}>حفظ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
