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
  const allergy = String(med.allergies || '').trim();
  if (allergy && !/^(لا يوجد|لا توجد|لا|none|n\/a|—|-)$/i.test(allergy)) bits.push(allergy);
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

  const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
  const kpis = [
    { label: 'السجلات', value: String(customers.length), note: addedThisMonth > 0 ? `↑ ${addedThisMonth} هذا الشهر · اكتمال ${stats.completePct}%` : `اكتمال الملفات ${stats.completePct}%`, accent: '#059669' },
    { label: 'خطط جارية', value: String(stats.activePlans), note: `${stats.sessions} جلسة · ${stats.withTreatments} ملف بخطة`, accent: '#0FA3A3' },
    { label: 'تنبيه سريري', value: String(stats.caution), note: 'حساسية أو حمل أو رضاعة', accent: '#DC2626' },
    { label: 'إقرارات موقّعة', value: `${stats.signedPct}%`, note: `${stats.signed} ختم من ${customers.length}`, accent: '#059669' },
  ];

  return (
    <div className="max-w-[1360px] mx-auto space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الملفات الطبية والعميلات</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">سجلات العميلات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">ملفات العميلات، البروتوكولات المسجّلة، تنبيهات الحساسية، والإقرارات الموقّعة.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => document.getElementById('customer-search')?.focus()} className={ghost}>تصفية</button>
          <button type="button" onClick={exportCsv} className={ghost}>تصدير السجلات</button>
          <button type="button" onClick={() => { setEditing(null); setShowModal(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#047857]">تسجيل ملف عميلة</button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[240px] flex-1">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Ms name="search" size={16} /></span>
          <input
            id="customer-search"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="بحث بالاسم أو رقم الهاتف"
            className="h-10 w-full rounded-lg border border-[#E4EAEE] bg-white pr-9 pl-3 text-[13px] outline-none focus:border-[#0FA3A3]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            ['all', `الكل ${customers.length}`, '#94A3B8'],
            ['treatments', `خطط نشطة ${stats.withTreatments}`, '#0FA3A3'],
            ['after', `متابعة ${followCount}`, '#B45309'],
            ['caution', `حذر ${stats.caution}`, '#DC2626'],
          ].map(([id, label, dot]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setChip(id); setPage(1); }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${chip === id ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155] hover:border-[#0FA3A3]'}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="مؤشرات الملفات" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={['px-5 py-4', i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '', i > 1 ? 'border-t border-[#E4EAEE]' : '', 'lg:border-t-0', i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : ''].join(' ')}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />{k.label}</p>
            <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <div className="space-y-2 xl:col-span-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-[#334155]">قائمة الملفات <span className="font-medium text-[#94A3B8]">عرض {visible.length} من {ordered.length}</span></p>
              <label className="inline-flex items-center gap-2 text-[11.5px] text-[#64748B]">
                فرز
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-lg border border-[#E4EAEE] bg-white px-2 py-1 text-[11.5px] font-bold text-[#334155]">
                  <option value="session">أحدث جلسة علاجية</option>
                  <option value="new">أحدث ملف</option>
                  <option value="name">الاسم</option>
                </select>
              </label>
            </div>

            {visible.length === 0 && <div className="rounded-xl border border-[#E4EAEE] bg-white p-10 text-center text-[13px] text-[#64748B]">لا ملفات مطابقة.</div>}

            {visible.map((cust) => {
              const treat = activeTreatment(cust);
              const sessions = (treat?.sessions || cust.sessions || []).length;
              const flags = cautionLine(cust);
              const upcoming = nextApt(cust);
              const age = ageOf(cust.birthDate);
              const on = selected?.id === cust.id;
              const accent = flags ? '#DC2626' : treat ? '#0FA3A3' : '#94A3B8';
              return (
                <article
                  key={cust.id}
                  onClick={() => setSelectedId(cust.id)}
                  className="relative cursor-pointer overflow-hidden rounded-lg border bg-white px-3 py-3 transition-colors hover:border-[#CBD5E1]"
                  style={{ borderColor: on ? accent : '#E4EAEE', boxShadow: on ? `0 0 0 1px ${accent}` : 'none' }}
                >
                  <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3 ps-1.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F4F7F8] text-[12px] font-extrabold text-[#0E7490]">{initials(cust)}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13px] font-bold text-[#0F172A]">{cust.firstName} {cust.lastName}</h3>
                          {age != null && <span className="text-[11px] text-[#94A3B8]">{age} سنة</span>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#64748B]" dir="ltr">{cust.phone || '—'}</p>
                        {flags ? (
                          <p className="mt-1 inline-flex items-center rounded-full border border-[#F7D3D3] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">تنبيه: {flags}</p>
                        ) : cust.adsStamp?.signature ? (
                          <p className="mt-1 inline-flex items-center rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">إقرار موقّع</p>
                        ) : (
                          <p className="mt-1 inline-flex items-center rounded-full border border-[#E4EAEE] bg-[#F4F7F8] px-2 py-0.5 text-[10px] font-bold text-[#64748B]">لا توجد حساسية مسجّلة</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {digits(cust.phone) && (
                        <a href={`https://wa.me/${digits(cust.phone)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg border border-[#E4EAEE] bg-white px-2.5 text-[11.5px] font-bold text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]">واتساب</a>
                      )}
                      <button type="button" onClick={() => navigate(`/customers/${cust.id}`)} className="inline-flex h-8 items-center rounded-lg bg-[#059669] px-2.5 text-[11.5px] font-bold text-white hover:bg-[#047857]">الملف</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 border-t border-[#EDF1F4] pt-3 sm:grid-cols-2">
                    <div className="ps-1.5">
                      <p className="text-[11px] text-[#94A3B8]">البروتوكول الحالي</p>
                      <p className="mt-1 text-[13px] font-bold text-[#334155]">{treat?.serviceName || 'لا علاج مسجّل'}</p>
                      <p className="mt-1 text-[11px] text-[#64748B]">{sessions ? `${sessions} جلسة` : 'بدون جلسات'}{treat ? ` · ${phaseLabel(treat.currentPhase)}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8]">الموعد القادم</p>
                      {upcoming ? (
                        <>
                          <p className="mt-1 text-[13px] font-bold text-[#334155]">{upcoming.date}{upcoming.time ? ` · ${upcoming.time}` : ''}</p>
                          <p className="mt-1 text-[11px] text-[#64748B]">{upcoming.service || upcoming.serviceName || 'موعد مسجّل'}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-[13px] text-[#94A3B8]">لا موعد قادم</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            <div className="flex items-center justify-between pt-1 text-[11.5px] text-[#94A3B8]">
              <span>عرض {visible.length} من {ordered.length} ملف</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] bg-white disabled:opacity-40"><Ms name="chevron_right" size={16} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} className={`h-8 w-8 rounded-lg text-[11.5px] font-bold ${n === safePage ? 'bg-[#059669] text-white' : 'border border-[#E4EAEE] bg-white text-[#334155]'}`}>{n}</button>
                ))}
                <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] bg-white disabled:opacity-40"><Ms name="chevron_left" size={16} /></button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            {selected && (
              <aside className="overflow-hidden rounded-xl border border-[#E4EAEE] bg-white xl:sticky xl:top-24" style={{ boxShadow: 'inset 0 2px 0 #0FA3A3' }}>
                <div className="flex items-start justify-between gap-2 border-b border-[#E4EAEE] px-4 py-3">
                  <div>
                    <p className="text-[14px] font-extrabold">{selected.firstName} {selected.lastName}</p>
                    <p className="mt-0.5 text-[11px] text-[#64748B]">{ageOf(selected.birthDate) != null ? `${ageOf(selected.birthDate)} سنة` : 'بدون تاريخ ميلاد'} · <span dir="ltr">{selected.phone || '—'}</span></p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F4F7F8] text-[12px] font-extrabold text-[#0E7490]">{initials(selected)}</span>
                </div>
                <div className="space-y-3 px-4 py-3">
                {cautionLine(selected) && (
                  <div className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] p-3 text-[12px] text-[#DC2626]">
                    <p className="mb-1 font-bold">تنبيه سريري</p>
                    <p>{cautionLine(selected)}</p>
                  </div>
                )}
                <div className="rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] p-3">
                  <p className="text-[12px] font-bold text-[#047857]">سجل الإقرار</p>
                  {selected.adsStamp?.signature ? (
                    <p className="mt-1 text-[11px] text-[#047857]">موقّع{selected.adsStamp.stampedAt ? ` · ${new Date(selected.adsStamp.stampedAt).toLocaleDateString('ar')}` : ''}{selected.adsStamp.stampedBy ? ` · ${selected.adsStamp.stampedBy}` : ''}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#047857]">بدون ختم إقرار</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-bold text-[#334155]">آخر الزيارات</p>
                  {(selected.sessions || []).length === 0 && <p className="text-[12px] text-[#94A3B8]">لا جلسات في الملف.</p>}
                  {(selected.sessions || []).slice().sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)).slice(0, 4).map((s) => (
                    <div key={s.id || s.recordedAt} className="border-b border-[#EDF1F4] py-2 last:border-0">
                      <p className="text-[13px] font-bold text-[#0F172A]">{s.serviceTitle || s.serviceName || 'جلسة'}</p>
                      <p className="text-[11px] text-[#64748B]">{String(s.recordedAt || s.date || '').slice(0, 10)}{s.note ? ` · ${s.note}` : ''}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => navigate(`/customers/${selected.id}`)} className="w-full rounded-lg bg-[#059669] py-2.5 text-[13px] font-bold text-white hover:bg-[#047857]">فتح الملف الشامل</button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setEditing(selected); setShowModal(true); }} className="rounded-lg border border-[#E4EAEE] bg-white py-2 text-[11.5px] font-bold text-[#334155] hover:border-[#0FA3A3]">تعديل الملف</button>
                  <button type="button" onClick={(e) => handleDelete(selected.id, e)} className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] py-2 text-[11.5px] font-bold text-[#DC2626]">حذف الملف</button>
                </div>
                </div>
              </aside>
            )}
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
