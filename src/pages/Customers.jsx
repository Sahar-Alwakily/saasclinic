import React, { useMemo, useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import CustomerFormModal from '../components/customers/CustomerFormModal';

function Ms({ name, size = 18 }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1, fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 22' }}>
      {name}
    </span>
  );
}

function digits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function ageOf(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function cautionOf(c) {
  const med = c.medicalInfo || {};
  const bits = [];
  if (String(med.allergies || '').trim()) bits.push(String(med.allergies).trim());
  if (med.isPregnant) bits.push('حمل');
  if (med.isBreastfeeding) bits.push('رضاعة');
  return bits;
}

function activeTreatment(c) {
  const list = Object.values(c.treatments || {});
  return list.find((t) => t.currentPhase === 'during') || list[0] || null;
}

function phaseLabel(phase) {
  if (phase === 'after') return 'بعد العلاج';
  if (phase === 'before') return 'قبل الجلسة';
  if (phase === 'during') return 'جارية';
  return '';
}

const Customers = () => {
  const { clinicPath } = useClinic();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [chip, setChip] = useState('all');
  const [sort, setSort] = useState('session');
  const [page, setPage] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
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

  useEffect(() => {
    const aptPath = clinicPath?.('appointments');
    if (!aptPath) return undefined;
    return onValue(ref(database, aptPath), (snap) => {
      const val = snap.val();
      setAppointments(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
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
    const matchesSearch = (
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
    if (!matchesSearch) return false;
    const treatments = Object.keys(c.treatments || {}).length;
    if (chip === 'treatments') return treatments > 0;
    if (chip === 'caution') return cautionOf(c).length > 0;
    if (chip === 'after') return Object.values(c.treatments || {}).some((t) => t.currentPhase === 'after');
    return true;
  });

  const stats = useMemo(() => {
    let withSessions = 0;
    let withTreatments = 0;
    let activePlans = 0;
    let sessions = 0;
    let afterCare = 0;
    let caution = 0;
    let signed = 0;
    let complete = 0;
    customers.forEach((c) => {
      if ((c.sessions || []).length) withSessions += 1;
      const treatObj = c.treatments || {};
      const keys = Object.keys(treatObj);
      if (keys.length) withTreatments += 1;
      Object.values(treatObj).forEach((t) => {
        if (t.currentPhase === 'during') activePlans += 1;
        sessions += t.sessions?.length || 0;
      });
      sessions += keys.length ? 0 : (c.sessions || []).length;
      afterCare += Object.values(treatObj).filter((t) => t.currentPhase === 'after').length;
      if (cautionOf(c).length) caution += 1;
      if (c.adsStamp?.signature) signed += 1;
      const med = c.medicalInfo || {};
      if (c.firstName && c.phone && (c.birthDate || med.allergies || med.notes || med.chronicDiseases)) complete += 1;
    });
    const n = customers.length || 1;
    return {
      withSessions,
      withTreatments,
      activePlans,
      sessions,
      afterCare,
      caution,
      signed,
      completePct: customers.length ? Math.round((complete / n) * 100) : 0,
      signedPct: customers.length ? Math.round((signed / n) * 100) : 0,
    };
  }, [customers]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" /></div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const addedThisMonth = customers.filter((c) => Number(c.createdAt) >= monthStart.getTime()).length;
  const followCount = customers.filter((c) => Object.values(c.treatments || {}).some((t) => t.currentPhase === 'after')).length;
  const nextApt = (c) => {
    const phone = digits(c.phone);
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
    return appointments
      .filter((a) => a.status !== 'cancelled' && a.date && a.date >= today)
      .filter((a) => (phone && digits(a.phoneNumber) === phone) || (name && a.customerName === name))
      .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))[0];
  };
  const lastSessionAt = (c) => {
    const times = (c.sessions || []).map((s) => new Date(s.recordedAt || s.date || 0).getTime());
    return times.length ? Math.max(...times) : 0;
  };
  const ordered = [...filteredCustomers].sort((a, b) => {
    if (sort === 'name') return `${a.firstName || ''}`.localeCompare(`${b.firstName || ''}`, 'ar');
    if (sort === 'new') return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    return lastSessionAt(b) - lastSessionAt(a);
  });
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = ordered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = ordered.find((c) => c.id === selectedId) || ordered[0] || null;
  const tones = ['#059669', '#0284c7', '#7c3aed', '#d97706', '#0f766e', '#be185d'];
  const initials = (c) => {
    const a = String(c.firstName || '').trim().charAt(0);
    const b = String(c.lastName || '').trim().charAt(0);
    return a && b ? `${a}${b}` : (a || '؟');
  };
  const exportCsv = () => {
    const head = ['الاسم', 'الهاتف', 'العمر', 'التنبيه', 'العلاج', 'الجلسات'];
    const body = ordered.map((c) => {
      const treat = activeTreatment(c);
      return [
        `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        c.phone || '',
        ageOf(c.birthDate) ?? '',
        cautionOf(c).join(' · '),
        treat?.serviceName || '',
        (treat?.sessions || c.sessions || []).length,
      ];
    });
    const csv = [head, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    a.download = 'customers.csv';
    a.click();
  };
  const cautionLine = (c) => cautionOf(c).join(' · ');

  return (
    <div className="max-w-[1480px] mx-auto w-full text-[#0f172a]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">العيادة السريرية / الملفات الطبية والعميلات</p>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">سجلات العميلات والملفات السريرية</h1>
            <p className="text-sm text-slate-500 max-w-2xl">ملفات العميلات، البروتوكولات المسجّلة، تنبيهات الحساسية، والإقرارات الموقّعة في العيادة.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => document.getElementById('customer-search')?.focus()} className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <Ms name="tune" size={16} />
              تصفية متقدمة
            </button>
            <button type="button" onClick={exportCsv} className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <Ms name="file_download" size={16} />
              تصدير السجلات السريرية
            </button>
            <button type="button" onClick={() => { setEditing(null); setShowModal(true); }} className="h-9 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold inline-flex items-center gap-1.5">
              <Ms name="person_add" size={16} />
              ملف سريري جديد
            </button>
          </div>
        </div>

        <div className="bg-white p-2 rounded-full shadow-sm flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Ms name="search" size={18} /></span>
            <input
              id="customer-search"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="بحث بالاسم، أو رقم الهاتف"
              className="w-full h-10 pr-10 pl-4 rounded-full bg-slate-50 text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 rounded-full">
            {[
              ['all', `الكل (${customers.length} مريضة)`, 'text-slate-600'],
              ['treatments', `خطط علاجية نشطة (${stats.withTreatments})`, 'text-slate-600'],
              ['after', `تحتاج متابعة سريرية (${followCount})`, 'text-slate-600'],
              ['caution', `حالات حساسية وحذر (${stats.caution})`, 'text-rose-600'],
            ].map(([id, label, idle]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setChip(id); setPage(1); }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${chip === id ? 'bg-white text-slate-900 shadow-sm' : idle}`}
              >
                {id === 'caution' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 ms-1" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي السجلات السريرية النشطة</span>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Ms name="badge" size={18} /></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono">{customers.length}</span>
              {addedThisMonth > 0 && <span className="text-xs font-bold text-emerald-700">↑ {addedThisMonth} هذا الشهر</span>}
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">اكتمال الملفات {stats.completePct}%</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">الخطط العلاجية الجارية</span>
              <span className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0369a1] flex items-center justify-center"><Ms name="medical_information" size={18} /></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono">{stats.activePlans}</span>
              <span className="text-xs text-slate-500">أثناء العلاج</span>
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">{stats.sessions} جلسة مسجّلة · {stats.withTreatments} ملف بخطة</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-700">تنبيهات الحساسية والحذر السريري</span>
              <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Ms name="warning" size={18} /></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-rose-600">{stats.caution}</span>
              <span className="text-[10px] font-bold tracking-wide text-rose-500">حالات</span>
            </div>
            <p className="mt-3 pt-2 border-t border-rose-100 text-[11px] text-rose-700">حساسية أو حمل أو رضاعة</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">الإقرارات الموقّعة</span>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Ms name="assignment_turned_in" size={18} /></span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono">{stats.signedPct}%</span>
            </div>
            <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">{stats.signed} ختم من {customers.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div className="xl:col-span-8 space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-sm font-bold">قائمة المريضات والبروتوكولات <span className="text-slate-400 font-medium">عرض {visible.length} من أصل {ordered.length}</span></p>
              <label className="text-xs text-slate-500 inline-flex items-center gap-2">
                فرز حسب:
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-700">
                  <option value="session">أحدث جلسة علاجية</option>
                  <option value="new">أحدث ملف</option>
                  <option value="name">الاسم</option>
                </select>
              </label>
            </div>

            {visible.length === 0 && <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">لا ملفات مطابقة.</div>}

            {visible.map((cust, index) => {
              const treat = activeTreatment(cust);
              const sessions = (treat?.sessions || cust.sessions || []).length;
              const flags = cautionLine(cust);
              const upcoming = nextApt(cust);
              const age = ageOf(cust.birthDate);
              const on = selected?.id === cust.id;
              return (
                <article
                  key={cust.id}
                  onClick={() => setSelectedId(cust.id)}
                  className={`bg-white rounded-2xl shadow-sm p-4 cursor-pointer border ${on ? 'border-emerald-600' : 'border-slate-200/80'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center shrink-0" style={{ background: tones[(safePage * 6 + index) % tones.length] }}>{initials(cust)}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{cust.firstName} {cust.lastName}</h3>
                          {age != null && <span className="text-xs text-slate-500">{age} سنة</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5" dir="ltr">{cust.phone || '—'}</p>
                        {flags ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 rounded-full px-2 py-0.5"><Ms name="medical_services" size={13} />تنبيه: {flags}</p>
                        ) : cust.adsStamp?.signature ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 rounded-full px-2 py-0.5"><Ms name="verified" size={13} />إقرار موقّع</p>
                        ) : (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">بدون تنبيه مسجّل</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {digits(cust.phone) && (
                        <a href={`https://wa.me/${digits(cust.phone)}`} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 inline-flex items-center gap-1">
                          <Ms name="chat" size={14} /> واتساب
                        </a>
                      )}
                      <button type="button" onClick={() => navigate(`/customers/${cust.id}`)} className="h-9 px-3 rounded-xl bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1">
                        <Ms name="folder_open" size={14} /> الملف الشامل
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[11px] text-slate-400">البروتوكول العلاجي الحالي</p>
                      <p className="text-sm font-bold mt-1">{treat?.serviceName || 'لا علاج مسجّل'}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{sessions ? `${sessions} جلسة` : 'بدون جلسات'}{treat ? ` · ${phaseLabel(treat.currentPhase)}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">الموعد السريري القادم</p>
                      {upcoming ? (
                        <>
                          <p className="text-sm font-bold mt-1">{upcoming.date}{upcoming.time ? ` · ${upcoming.time}` : ''}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{upcoming.service || upcoming.serviceName || 'موعد مسجّل'}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1">لا موعد قادم</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-500">
              <span>عرض {visible.length} من أصل {ordered.length} ملف</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 disabled:opacity-40"><Ms name="chevron_right" size={16} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg text-xs font-bold ${n === safePage ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200'}`}>{n}</button>
                ))}
                <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 disabled:opacity-40"><Ms name="chevron_left" size={16} /></button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            {selected && (
              <aside className="bg-white p-4 rounded-xl shadow-sm space-y-4 xl:sticky xl:top-24">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">معاينة الملف السريري النشط</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center">{initials(selected)}</span>
                  <div>
                    <h3 className="font-bold">{selected.firstName} {selected.lastName}</h3>
                    <p className="text-xs text-slate-500">{ageOf(selected.birthDate) != null ? `${ageOf(selected.birthDate)} سنة` : 'بدون تاريخ ميلاد'}</p>
                    <p className="text-xs text-slate-500" dir="ltr">{selected.phone || '—'}</p>
                  </div>
                </div>
                {cautionLine(selected) && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800">
                    <p className="font-bold mb-1">تنبيه سريري</p>
                    <p>{cautionLine(selected)}</p>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-900">سجل الإقرار</p>
                  {selected.adsStamp?.signature ? (
                    <p className="text-[11px] text-emerald-800 mt-1">موقّع{selected.adsStamp.stampedAt ? ` · ${new Date(selected.adsStamp.stampedAt).toLocaleDateString('ar')}` : ''}{selected.adsStamp.stampedBy ? ` · ${selected.adsStamp.stampedBy}` : ''}</p>
                  ) : (
                    <p className="text-[11px] text-emerald-800 mt-1">بدون ختم إقرار</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold mb-2">تسلسل الزيارات السريرية الأخير</p>
                  {(selected.sessions || []).length === 0 && <p className="text-xs text-slate-500">لا جلسات في الملف.</p>}
                  {(selected.sessions || []).slice().sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)).slice(0, 4).map((s) => (
                    <div key={s.id || s.recordedAt} className="py-2 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-bold">{s.serviceTitle || s.serviceName || 'جلسة'}</p>
                      <p className="text-[11px] text-slate-500">{String(s.recordedAt || s.date || '').slice(0, 10)}{s.note ? ` · ${s.note}` : ''}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => navigate(`/customers/${selected.id}`)} className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1">
                  <Ms name="folder_open" size={16} /> فتح الملف الشامل
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setEditing(selected); setShowModal(true); }} className="py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">تعديل الملف</button>
                  <button type="button" onClick={(e) => handleDelete(selected.id, e)} className="py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">حذف الملف</button>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

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
