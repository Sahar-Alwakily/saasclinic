import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import WhatsAppInstructionsModal, { WHATSAPP_TEMPLATE_ID } from '../components/customers/WhatsAppInstructionsModal';
import InstructionsList from '../components/customers/InstructionsList';
import { DEFAULT_INSTRUCTIONS, SERVICE_CATEGORIES, matchInstructionKey } from '../constants/clinicCare';

function Ms({ name, size = 18 }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1, fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 22' }}>
      {name}
    </span>
  );
}

function initialsOf(client) {
  const a = String(client.firstName || '').trim().charAt(0);
  const b = String(client.lastName || '').trim().charAt(0);
  if (a && b) return `${a}.${b}`;
  return a || '؟';
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

function phaseLine(treatment) {
  const sessions = treatment.sessions?.length || 0;
  if (treatment.currentPhase !== 'after') return `أثناء العلاج (${sessions} جلسة)`;
  if (!treatment.phaseStartedAt) return 'ما بعد الإجراء';
  const days = Math.max(0, moment().startOf('day').diff(moment(treatment.phaseStartedAt).startOf('day'), 'days'));
  return days ? `ما بعد الإجراء (اليوم ${days} من المتابعة)` : 'ما بعد الإجراء (اليوم نفسه)';
}

const TreatmentTracker = () => {
  const { clinicPath } = useClinic();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('all');
  const [panel, setPanel] = useState('track');
  const [searchTerm, setSearchTerm] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selectedKey, setSelectedKey] = useState(null);
  const [waModal, setWaModal] = useState({ show: false, client: null, treatment: null });

  useEffect(() => {
    if (!clinicPath?.('customers')) {
      setLoading(false);
      return undefined;
    }
    const unsubCust = onValue(ref(database, clinicPath('customers')), (snap) => {
      const val = snap.val();
      setCustomers(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    const unsubTpl = onValue(ref(database, clinicPath('treatments/templates')), (s) => setTemplates(s.val() || {}));
    return () => { unsubCust(); unsubTpl(); };
  }, [clinicPath]);

  const clientsWithTreatments = useMemo(() => customers
    .filter((c) => c.treatments && Object.keys(c.treatments).length > 0)
    .map((c) => ({
      ...c,
      treatmentsList: Object.entries(c.treatments).map(([tid, t]) => ({ id: tid, ...t })),
    })), [customers]);

  const rows = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = [];
    clientsWithTreatments.forEach((client) => {
      client.treatmentsList.forEach((t) => {
        if (activePhase === 'done') {
          if (t.status !== 'completed') return;
        } else if (activePhase !== 'all' && t.currentPhase !== activePhase) return;
        if (cat !== 'all' && t.category !== cat) return;
        const name = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        if (term && !name.includes(term) && !String(t.serviceName || '').toLowerCase().includes(term)) return;
        list.push({ key: `${client.id}:${t.id}`, client, treatment: t });
      });
    });
    list.sort((a, b) => {
      if (sort === 'name') return `${a.client.firstName || ''}`.localeCompare(`${b.client.firstName || ''}`, 'ar');
      if (sort === 'after') return Number(b.treatment.currentPhase === 'after') - Number(a.treatment.currentPhase === 'after');
      if (sort === 'sessions') return (b.treatment.sessions?.length || 0) - (a.treatment.sessions?.length || 0);
      const ta = new Date(a.treatment.phaseStartedAt || a.treatment.updatedAt || 0).getTime();
      const tb = new Date(b.treatment.phaseStartedAt || b.treatment.updatedAt || 0).getTime();
      return tb - ta;
    });
    return list;
  }, [clientsWithTreatments, activePhase, searchTerm, cat, sort]);

  const phaseCounts = useMemo(() => {
    let during = 0;
    let after = 0;
    let done = 0;
    let sessions = 0;
    let wa = 0;
    clientsWithTreatments.forEach((c) => {
      c.treatmentsList.forEach((t) => {
        if (t.status === 'completed') done += 1;
        else if (t.currentPhase === 'during') during += 1;
        else if (t.currentPhase === 'after') after += 1;
        sessions += t.sessions?.length || 0;
        if (c.phone && t.status !== 'completed') wa += 1;
      });
    });
    const all = during + after;
    return { during, after, done, all, sessions, wa, waPct: all ? Math.round((wa / all) * 100) : 0 };
  }, [clientsWithTreatments]);

  const handleChangePhase = async (customerId, treatmentId, newPhase, treatment) => {
    try {
      const patch = {
        currentPhase: newPhase,
        phaseStartedAt: new Date().toISOString(),
      };
      const days = Number(templates[treatment?.templateId]?.phases?.after?.followUpDays);
      if (newPhase === 'after' && days) {
        patch.followUpDate = moment().add(days, 'days').format('YYYY-MM-DD');
      }
      await update(ref(database, clinicPath(`customers/${customerId}/treatments/${treatmentId}`)), patch);
      toast.success('تم تحديث مرحلة العلاج بنجاح');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" /></div>;
  }

  const selected = rows.find((r) => r.key === selectedKey) || rows[0] || null;
  const openWa = (client, treatment) => setWaModal({
    show: true,
    client: { clientId: client.id, customerName: `${client.firstName || ''} ${client.lastName || ''}`.trim(), phoneNumber: client.phone },
    treatment: { ...treatment, templateId: WHATSAPP_TEMPLATE_ID },
  });
  const exportCsv = () => {
    const head = ['الاسم', 'الهاتف', 'الخدمة', 'المرحلة', 'الجلسات', 'المتابعة'];
    const body = rows.map(({ client, treatment }) => [
      `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      client.phone || '',
      treatment.serviceName || '',
      treatment.currentPhase === 'after' ? 'ما بعد الإجراء' : 'أثناء العلاج',
      treatment.sessions?.length || 0,
      treatment.followUpDate || '',
    ]);
    const csv = [head, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    a.download = 'treatments.csv';
    a.click();
  };
  const countIn = (id) => clientsWithTreatments.reduce((n, c) => n + c.treatmentsList.filter((t) => (
    (activePhase === 'all' || (activePhase === 'done' ? t.status === 'completed' : t.currentPhase === activePhase))
    && (id === 'all' || t.category === id)
  )).length, 0);
  const guideFor = (treatment) => DEFAULT_INSTRUCTIONS[matchInstructionKey(treatment.serviceName)]?.[treatment.currentPhase === 'after' ? 'after' : 'during'] || [];
  const cautionOf = (client) => {
    const med = client.medicalInfo || {};
    const bits = [];
    if (String(med.allergies || '').trim()) bits.push(String(med.allergies).trim());
    if (String(med.chronicDiseases || '').trim()) bits.push(String(med.chronicDiseases).trim());
    if (med.isPregnant) bits.push('حمل');
    if (med.isBreastfeeding) bits.push('رضاعة');
    return bits;
  };

  const pill = (id, label, count) => (
    <button
      key={id}
      type="button"
      onClick={() => setActivePhase(id)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${activePhase === id ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}
    >
      {id !== 'all' && id !== 'done' && <span className={`w-2 h-2 rounded-full ${id === 'during' ? 'bg-[#0ea5e9]' : 'bg-[#a855f7]'}`} />}
      {id === 'done' && <Ms name="check_circle" size={14} />}
      <span>{label}</span>
      <span className={`px-1.5 rounded-full font-mono text-[11px] ${activePhase === id ? 'bg-emerald-700/80 text-white' : 'bg-white/70'}`}>{count}</span>
    </button>
  );

  const treatKpis = [
    { label: 'خطط نشطة', value: String(phaseCounts.all), note: `${phaseCounts.sessions} جلسة مسجّلة`, accent: '#059669' },
    { label: 'أثناء العلاج', value: String(phaseCounts.during), note: 'جلسات جارية', accent: '#0FA3A3' },
    { label: 'ما بعد الإجراء', value: String(phaseCounts.after), note: 'تحت المتابعة', accent: '#B45309' },
    { label: 'إرشادات واتساب', value: `${phaseCounts.waPct}%`, note: `${phaseCounts.wa} خطة برقم`, accent: '#059669' },
  ];

  return (
    <div className="max-w-[1360px] mx-auto space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">البروتوكول السريري</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">متابعة العلاجات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">تسلسل الجلسات المسجّلة، ومتابعة ما بعد الإجراء، وإرسال إرشادات واتساب.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]">تصدير السجلات</button>
          <button type="button" onClick={() => setPanel(panel === 'instructions' ? 'track' : 'instructions')} className="inline-flex items-center gap-2 rounded-lg border border-[#C6EEEE] bg-[#ECFEFF] px-3 py-2 text-[13px] font-bold text-[#0E7490]">قوالب الرعاية</button>
          <button type="button" onClick={() => navigate('/customers')} className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]">+ بروتوكول جديد</button>
        </div>
      </header>

      {panel === 'instructions' && (
          <section className="rounded-xl border border-[#E4EAEE] bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">قوالب الرعاية</h3>
            <p className="text-xs text-slate-500 mb-4">نصوص أثناء العلاج وبعده لكل خدمة. الإرسال يتم من بطاقة الخطة.</p>
            <InstructionsList embedded />
          </section>
        )}

        {panel === 'track' && (
          <>
            <section aria-label="مؤشرات العلاجات" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
              {treatKpis.map((k, i) => (
                <div key={k.label} className={['px-5 py-4', i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '', i > 1 ? 'border-t border-[#E4EAEE]' : '', 'lg:border-t-0', i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : ''].join(' ')}>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />{k.label}</p>
                  <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
                  <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
                  <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
                </div>
              ))}
            </section>

            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2">
                  {pill('all', 'كافة الخطط', phaseCounts.all)}
                  {pill('during', 'أثناء العلاج', phaseCounts.during)}
                  {pill('after', 'ما بعد الإجراء', phaseCounts.after)}
                  {pill('done', 'مكتملة', phaseCounts.done)}
                </div>
                <div className="flex items-center gap-2 text-[11.5px] text-[#64748B]">
                  <span>ترتيب</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-[#E4EAEE] bg-white px-2 py-1 text-[11.5px] font-bold text-[#334155]">
                    <option value="recent">أحدث تحديث سريري</option>
                    <option value="after">حالات ما بعد الإجراء</option>
                    <option value="sessions">عدد الجلسات</option>
                    <option value="name">أبجدياً حسب اسم المريضة</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-[#EDF1F4] pt-2 text-[11.5px]">
                <button type="button" onClick={() => setCat('all')} className={`rounded-full border px-3 py-1 font-bold ${cat === 'all' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>الكل {countIn('all')}</button>
                {SERVICE_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-full border px-3 py-1 font-bold ${cat === c.id ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>{c.name} {countIn(c.id)}</button>
                ))}
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث بالاسم أو العلاج" className="ms-auto min-w-[10rem] rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[12px] outline-none focus:border-[#0FA3A3]" />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 flex flex-col gap-4 pt-3">
                {rows.length === 0 && <div className="rounded-xl border border-[#E4EAEE] bg-white p-10 text-center text-[13px] text-[#64748B]">لا خطط في هذا العرض. الجلسة تُسجّل من ملف العميلة.</div>}
                {rows.map(({ key, client, treatment }) => {
                  const on = selected?.key === key;
                  const after = treatment.currentPhase === 'after';
                  const sessions = treatment.sessions?.length || 0;
                  const guide = guideFor(treatment);
                  const lastNote = [...(treatment.sessions || [])].reverse().find((s) => s.notes)?.notes;
                  const age = ageOf(client.birthDate);
                  const accent = after ? '#B45309' : '#0FA3A3';
                  return (
                    <article
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className="relative cursor-pointer overflow-hidden rounded-lg border bg-white px-3 py-3 hover:border-[#CBD5E1]"
                      style={{ borderColor: on ? accent : '#E4EAEE', boxShadow: on ? `0 0 0 1px ${accent}` : 'none' }}
                    >
                      <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
                      <div className="flex items-start justify-between gap-3 ps-1.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F4F7F8] text-[12px] font-extrabold text-[#0E7490]">{initialsOf(client)}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[14px] font-bold text-[#0F172A]">{client.firstName} {client.lastName}</h3>
                              {client.phone && <span className="rounded-md bg-[#F4F7F8] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#64748B]" dir="ltr">{client.phone}</span>}
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-[#64748B]">{age != null ? `${age} سنة` : 'بدون تاريخ ميلاد'}</p>
                          </div>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${after ? 'border-[#F6E4C4] bg-[#FFFBEB] text-[#B45309]' : 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]'}`}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                          {phaseLine(treatment)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-[#0F172A]">{treatment.serviceName || 'علاج'}</p>
                          {lastNote && <p className="mt-0.5 truncate text-[11.5px] text-[#64748B]">{lastNote}</p>}
                        </div>
                        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] font-bold tabular-nums text-[#0E7490]">{sessions} جلسة</span>
                      </div>
                      {on && guide.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                              <Ms name="mark_chat_read" size={16} />
                              <span>بروتوكول الرعاية (واتساب)</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">جاهز للإرسال</span>
                          </div>
                          {guide.map((line) => <p key={line} className="text-[11px] text-emerald-800 leading-relaxed">{line}</p>)}
                          {treatment.followUpDate && (
                            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-emerald-950">
                              <Ms name="event_available" size={14} />
                              <span>المراجعة القادمة: <strong className="font-bold underline decoration-emerald-400">{treatment.followUpDate}</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EDF1F4] pt-3" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => navigate(`/customers/${client.id}`)} className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] hover:border-[#0FA3A3]">السجل السريري</button>
                        <button type="button" onClick={() => openWa(client, treatment)} className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-[11.5px] font-bold text-[#166534]">إرسال واتساب</button>
                        {after ? (
                          <button type="button" onClick={() => handleChangePhase(client.id, treatment.id, 'during', treatment)} className="rounded-lg bg-[#0FA3A3] px-3 py-1.5 text-[11.5px] font-bold text-white">إرجاع أثناء العلاج</button>
                        ) : (
                          <button type="button" onClick={() => handleChangePhase(client.id, treatment.id, 'after', treatment)} className="rounded-lg bg-[#059669] px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-[#047857]">نقل لما بعد الإجراء</button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="xl:col-span-5">
                {selected && (
                  <aside className="space-y-4 overflow-hidden rounded-xl border border-[#E4EAEE] bg-white p-5 xl:sticky xl:top-24">
                    <div className="-mx-5 -mt-5 mb-1 h-1 bg-[#0FA3A3]" />
                    <div className="flex items-center justify-between border-b border-[#EDF1F4] pb-3">
                      <h3 className="text-[13px] font-extrabold text-[#0F172A]">تفاصيل الخطة</h3>
                      {selected.client.phone && <span className="rounded bg-[#F4F7F8] px-2 py-0.5 font-mono text-[11px] font-bold text-[#334155]" dir="ltr">{selected.client.phone}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[12px] font-extrabold text-[#0E7490]">{initialsOf(selected.client)}</div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold text-[#0F172A]">{selected.client.firstName} {selected.client.lastName}</h4>
                          <p className="text-[11.5px] text-[#64748B]">{ageOf(selected.client.birthDate) != null ? `${ageOf(selected.client.birthDate)} سنة` : 'بدون تاريخ ميلاد'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded border border-[#E4EAEE] bg-white px-2 py-0.5 text-[10px] font-bold text-[#334155]">{selected.treatment.serviceName || 'علاج'}</span>
                            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${selected.treatment.currentPhase === 'after' ? 'border-[#F6E4C4] bg-[#FFFBEB] text-[#B45309]' : 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]'}`}>
                              {selected.treatment.currentPhase === 'after' ? 'ما بعد الإجراء' : 'أثناء العلاج'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => navigate(`/customers/${selected.client.id}`)} className="rounded-lg border border-[#E4EAEE] bg-white px-2 py-2 text-[#64748B] hover:text-[#0E7490]"><Ms name="open_in_new" size={18} /></button>
                    </div>
                    {cautionOf(selected.client).length > 0 && (
                      <div className="p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a] flex items-start gap-2.5 text-xs text-[#92400e]">
                        <Ms name="info" size={16} />
                        <div><span className="font-bold">تنبيه: </span>{cautionOf(selected.client).join(' · ')}</div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5"><Ms name="timeline" size={16} />التسلسل الزمني للبروتوكول العلاجي</span>
                        <span className="text-[11px] text-slate-400 font-mono">{selected.treatment.sessions?.length || 0} جلسة</span>
                      </div>
                      <div className="space-y-3">
                        {(selected.treatment.sessions || []).length === 0 && <p className="text-xs text-slate-500">لا جلسات داخل هذه الخطة.</p>}
                        {(selected.treatment.sessions || []).map((s, i) => (
                          <div key={s.sessionId || i} className="flex items-start gap-3">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100 shrink-0 mt-1" />
                            <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <strong className="font-bold text-slate-800">الجلسة {s.sessionNumber || i + 1}</strong>
                                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-mono">منفذة</span>
                              </div>
                              {s.notes && <p className="text-[11px] text-slate-500 mt-1">{s.notes}</p>}
                              <span className="text-[10px] text-slate-400 font-mono mt-1 block">{s.date || String(s.recordedAt || '').slice(0, 10)}{s.time ? ` • ${s.time}` : ''}</span>
                            </div>
                          </div>
                        ))}
                        {selected.treatment.followUpDate && (
                          <div className="flex items-start gap-3">
                            <span className="w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-slate-100 shrink-0 mt-1" />
                            <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between text-xs">
                                <strong className="font-bold text-slate-700">مراجعة المتابعة</strong>
                                <span className="text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">مجدول</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 font-mono mt-1 block">{selected.treatment.followUpDate}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <Ms name="forum" size={16} />
                        نص الإرشاد الجاهز للإرسال
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200/80 text-[11px] text-slate-700 leading-relaxed">
                        {guideFor(selected.treatment).join(' ') || 'لا نص إرشاد مرتبط بهذه الخدمة.'}
                      </div>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <button type="button" onClick={() => openWa(selected.client, selected.treatment)} className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#25D366] py-2.5 text-[12px] font-bold text-white hover:bg-[#20ba59]">
                        إرسال واتساب
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => navigate(`/customers/${selected.client.id}`)} className="rounded-lg border border-[#E4EAEE] bg-white py-2 text-[11.5px] font-bold text-[#334155] hover:border-[#0FA3A3]">
                          السجل السريري
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangePhase(selected.client.id, selected.treatment.id, selected.treatment.currentPhase === 'after' ? 'during' : 'after', selected.treatment)}
                          className="rounded-lg bg-[#059669] py-2 text-[11.5px] font-bold text-white hover:bg-[#047857]"
                        >
                          {selected.treatment.currentPhase === 'after' ? 'إرجاع أثناء العلاج' : 'نقل لما بعد الإجراء'}
                        </button>
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#E4EAEE] bg-white p-5">
              <div className="border-b border-[#EDF1F4] pb-3">
                <h3 className="text-[13px] font-extrabold text-[#0F172A]">قوالب الإرشادات</h3>
                <p className="mt-0.5 text-[11.5px] text-[#64748B]">نصوص أثناء العلاج وبعده. المعاينة تفتح قوالب الرعاية، والإرسال من بطاقة الخطة.</p>
              </div>
              <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ['filler', 'الفيلر'],
                  ['laser', 'الليزر'],
                  ['botox', 'البوتوكس'],
                ].map(([id, title]) => (
                  <div key={id} className="flex flex-col justify-between rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] p-3.5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-[#0F172A]">{title}</span>
                        <span className="rounded bg-[#ECFEFF] px-2 py-0.5 text-[10px] font-bold text-[#0E7490]">جاهز</span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#64748B]">{DEFAULT_INSTRUCTIONS[id].after[0]}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-[#EDF1F4] pt-3 text-[11px] text-[#64748B]">
                      <span>بعد الإجراء</span>
                      <button type="button" onClick={() => setPanel('instructions')} className="font-bold text-[#0FA3A3] hover:text-[#059669]">معاينة النص</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      <WhatsAppInstructionsModal
        show={waModal.show}
        onClose={() => setWaModal({ show: false, client: null, treatment: null })}
        client={waModal.client}
        treatment={waModal.treatment}
        activePhase={waModal.treatment?.currentPhase}
      />
    </div>
  );
};

export default TreatmentTracker;
