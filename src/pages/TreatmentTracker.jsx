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

const CAT_STYLE = {
  laser: { idle: 'bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]', bar: '#0ea5e9' },
  vitamins: { idle: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]', bar: '#f59e0b' },
  cosmetica: { idle: 'bg-[#fdf2f8] text-[#9d174d] border border-[#fbcfe8]', bar: '#ec4899' },
  beauty: { idle: 'bg-[#faf5ff] text-[#7e22ce] border border-[#e9d5ff]', bar: '#a855f7' },
  general: { idle: 'bg-[#f0fdfa] text-[#0f766e] border border-[#99f6e4]', bar: '#14b8a6' },
};

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
        if (c.phone) wa += 1;
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
  const segments = SERVICE_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    bar: CAT_STYLE[c.id].bar,
    n: clientsWithTreatments.reduce((n, client) => n + client.treatmentsList.filter((t) => t.category === c.id && t.status !== 'completed').length, 0),
  })).filter((s) => s.n > 0);
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

  const pill = (id, label, count, idle) => (
    <button
      key={id}
      type="button"
      onClick={() => setActivePhase(id)}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border ${activePhase === id ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : idle}`}
    >
      {id !== 'all' && id !== 'done' && <span className={`w-2 h-2 rounded-full ${id === 'during' ? 'bg-[#0ea5e9]' : 'bg-[#a855f7]'}`} />}
      {id === 'done' && <Ms name="check_circle" size={14} />}
      <span>{label}</span>
      <span className={`px-1.5 rounded-full font-mono text-[11px] ${activePhase === id ? 'bg-emerald-700/80 text-white' : 'bg-white/70'}`}>{count}</span>
    </button>
  );

  return (
    <div className="max-w-[1440px] mx-auto w-full text-[#0f172a]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">بروتوكول سريري</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs font-semibold text-slate-500 tracking-wider">WARAFA CLINICAL PROTOCOL SYSTEM</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">متابعة الخطط والبروتوكولات العلاجية للمريضات</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">تسلسل الجلسات المسجّلة، ومتابعة ما بعد الإجراء، وإرسال إرشادات واتساب من قوالب الخدمة.</p>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">
              <Ms name="file_download" size={16} />
              <span>تصدير السجلات</span>
            </button>
            <button type="button" onClick={() => setPanel(panel === 'instructions' ? 'track' : 'instructions')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold">
              <Ms name="article" size={16} />
              <span>قوالب الرعاية (Care Templates)</span>
            </button>
            <button type="button" onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
              <Ms name="add_circle" size={16} />
              <span>+ بروتوكول علاجي جديد</span>
            </button>
          </div>
        </div>

        {panel === 'instructions' && (
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">قوالب الرعاية</h3>
            <p className="text-xs text-slate-500 mb-4">نصوص أثناء العلاج وبعده لكل خدمة. الإرسال يتم من بطاقة الخطة.</p>
            <InstructionsList embedded />
          </section>
        )}

        {panel === 'track' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 70%)', border: '1px solid #a7f3d0' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">الخطط العلاجية النشطة</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Ms name="clinical_notes" size={20} /></div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-950 font-mono">{phaseCounts.all}</span>
                  <span className="text-xs font-semibold text-emerald-700">خطة نشطة</span>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200/60">
                  <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium text-emerald-900 gap-2">
                    <span>{phaseCounts.sessions} جلسة مسجّلة</span>
                    <span className="font-mono text-emerald-600 truncate">{segments.map((s) => `${s.name} ${s.n}`).join(' · ') || '—'}</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden flex">
                    {(segments.length ? segments : [{ id: 'empty', n: 1, bar: '#a7f3d0' }]).map((s) => (
                      <div key={s.id} className="h-full" style={{ width: `${(s.n / (phaseCounts.all || 1)) * 100}%`, background: s.bar }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-2xl shadow-sm" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 70%)', border: '1px solid #bae6fd' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0c4a6e]">أثناء العلاج والجلسات</span>
                  <div className="w-10 h-10 rounded-xl bg-[#0ea5e9] text-white flex items-center justify-center"><Ms name="hourglass_top" size={20} /></div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#0c4a6e] font-mono">{phaseCounts.during}</span>
                  <span className="text-xs font-semibold text-[#0369a1]">خطة جارية</span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#bae6fd] flex items-center justify-between text-[11px] gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#075985]">
                    <span className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
                    أثناء الجلسات
                  </span>
                  <span className="font-mono text-[10px] bg-[#e0f2fe] text-[#0369a1] px-1.5 py-0.5 rounded font-bold">Mid-Care</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl shadow-sm" style={{ background: 'linear-gradient(135deg, #fbf5ff 0%, #ffffff 70%)', border: '1px solid #e9d5ff' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#581c87]">ما بعد الإجراء والتعافي</span>
                  <div className="w-10 h-10 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center"><Ms name="vital_signs" size={20} /></div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#581c87] font-mono">{phaseCounts.after}</span>
                  <span className="text-xs font-semibold text-[#7e22ce]">تحت المتابعة</span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#e9d5ff] flex items-center justify-between text-[11px] gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#6b21a8]">
                    <Ms name="health_and_safety" size={14} />
                    متابعة التعافي
                  </span>
                  <span className="font-mono text-[10px] bg-[#f3e8ff] text-[#6b21a8] px-1.5 py-0.5 rounded font-bold">Post-Care</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl shadow-sm" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 70%)', border: '1px solid #bbf7d0' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">إرشادات الرعاية</span>
                  <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center"><Ms name="mark_chat_read" size={20} /></div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-950 font-mono">{phaseCounts.waPct}%</span>
                  <span className="text-xs font-semibold text-[#15803d]">إرسال WhatsApp</span>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">{phaseCounts.wa} خطة برقم</span>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">واتساب</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2">
                  {pill('all', 'كافة الخطط', phaseCounts.all, 'bg-slate-50 text-slate-700 border-slate-200')}
                  {pill('during', 'أثناء العلاج والجلسات', phaseCounts.during, 'bg-[#f0f9ff] text-[#075985] border-[#bae6fd]')}
                  {pill('after', 'متابعة ما بعد الإجراء والتعافي', phaseCounts.after, 'bg-[#faf5ff] text-[#6b21a8] border-[#e9d5ff]')}
                  {pill('done', 'بروتوكولات مكتملة', phaseCounts.done, 'bg-slate-100 text-slate-600 border-slate-200')}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="text-slate-400">ترتيب حسب:</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium">
                    <option value="recent">أحدث تحديث سريري</option>
                    <option value="after">حالات ما بعد الإجراء</option>
                    <option value="sessions">عدد الجلسات</option>
                    <option value="name">أبجدياً حسب اسم المريضة</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium inline-flex items-center gap-1"><Ms name="filter_alt" size={14} />تصنيف الإجراء السريري:</span>
                <button type="button" onClick={() => setCat('all')} className={`px-3 py-1 rounded-lg font-bold ${cat === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>الكل ({countIn('all')})</button>
                {SERVICE_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`px-3 py-1 rounded-lg font-bold ${cat === c.id ? 'bg-emerald-600 text-white border border-emerald-600' : CAT_STYLE[c.id].idle}`}>{c.name} ({countIn(c.id)})</button>
                ))}
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث بالاسم أو العلاج" className="ms-auto min-w-[10rem] px-3 py-1.5 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 flex flex-col gap-4 pt-3">
                {rows.length === 0 && <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">لا خطط في هذا العرض. الجلسة تُسجّل من ملف العميلة.</div>}
                {rows.map(({ key, client, treatment }) => {
                  const on = selected?.key === key;
                  const after = treatment.currentPhase === 'after';
                  const sessions = treatment.sessions?.length || 0;
                  const guide = guideFor(treatment);
                  const lastNote = [...(treatment.sessions || [])].reverse().find((s) => s.notes)?.notes;
                  const age = ageOf(client.birthDate);
                  return (
                    <article
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className={`bg-white rounded-2xl shadow-sm p-4 sm:p-5 relative cursor-pointer ${on ? 'border-2 border-emerald-500' : 'border border-slate-200 hover:border-emerald-300'}`}
                    >
                      {on && (
                        <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1">
                          <Ms name="check" size={12} />
                          الملف السريري النشط حالياً
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center shrink-0 ${after ? 'bg-gradient-to-br from-[#ec4899] to-[#e11d48]' : 'bg-gradient-to-br from-[#38bdf8] to-[#0284c7]'}`}>{initialsOf(client)}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-slate-900">{client.firstName} {client.lastName}</h3>
                              {client.phone && <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600" dir="ltr">{client.phone}</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{age != null ? `${age} سنة` : 'بدون تاريخ ميلاد'}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shrink-0 border ${after ? 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]' : 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]'}`}>
                          <span className={`w-2 h-2 rounded-full ${after ? 'bg-[#f59e0b]' : 'bg-[#0ea5e9]'}`} />
                          {phaseLine(treatment)}
                        </span>
                      </div>
                      <div className={`mt-3.5 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${after ? 'bg-[#fdf2f8] border-[#fbcfe8]' : 'bg-[#f0f9ff] border-[#bae6fd]'}`}>
                        <div className="min-w-0">
                          <div className={`flex items-center gap-1.5 text-xs font-bold ${after ? 'text-[#9d174d]' : 'text-[#0c4a6e]'}`}>
                            <Ms name={after ? 'vaccines' : 'flash_on'} size={16} />
                            <span>{treatment.serviceName || 'علاج'}</span>
                          </div>
                          {lastNote && <p className="text-[11px] mt-0.5 text-slate-600">{lastNote}</p>}
                        </div>
                        <span className={`font-mono text-xs font-bold px-2 py-1 rounded bg-white shrink-0 ${after ? 'text-[#be185d]' : 'text-[#0369a1]'}`}>{sessions} جلسة</span>
                      </div>
                      <div className="mt-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">الجلسات المسجّلة</span>
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${after ? 'text-emerald-700 bg-emerald-50' : 'text-[#0369a1] bg-[#f0f9ff]'}`}>{sessions}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                          <div className="h-full rounded-full" style={{ width: after ? '100%' : '46%', background: after ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #38bdf8, #0284c7)' }} />
                        </div>
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
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => navigate(`/customers/${client.id}`)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">
                          <Ms name="history_edu" size={14} />
                          السجل السريري
                        </button>
                        <button type="button" onClick={() => openWa(client, treatment)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[#166534] text-xs font-bold border border-[#25D366]/40" style={{ background: 'rgba(37,211,102,0.15)' }}>
                          <Ms name="send" size={14} />
                          إرسال واتساب
                        </button>
                        {after ? (
                          <button type="button" onClick={() => handleChangePhase(client.id, treatment.id, 'during', treatment)} className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#0284c7] text-white text-xs font-bold">إرجاع أثناء العلاج</button>
                        ) : (
                          <button type="button" onClick={() => handleChangePhase(client.id, treatment.id, 'after', treatment)} className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">نقل لما بعد الإجراء</button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="xl:col-span-5">
                {selected && (
                  <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 xl:sticky xl:top-24">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Ms name="dermatology" size={20} />
                        <h3 className="text-sm font-bold text-slate-900">تفاصيل الخطة السريرية الجارية</h3>
                      </div>
                      {selected.client.phone && <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700" dir="ltr">{selected.client.phone}</span>}
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, #f8fafc, #ecfdf5)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">{initialsOf(selected.client)}</div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900">{selected.client.firstName} {selected.client.lastName}</h4>
                          <p className="text-xs text-slate-500">{ageOf(selected.client.birthDate) != null ? `${ageOf(selected.client.birthDate)} سنة` : 'بدون تاريخ ميلاد'}{cautionOf(selected.client).length ? ` • ${cautionOf(selected.client).join(' • ')}` : ''}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fce7f3] text-[#9d174d] border border-[#fbcfe8]">{selected.treatment.serviceName || 'علاج'}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selected.treatment.currentPhase === 'after' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'}`}>
                              {selected.treatment.currentPhase === 'after' ? 'ما بعد الإجراء' : 'أثناء العلاج'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => navigate(`/customers/${selected.client.id}`)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600"><Ms name="open_in_new" size={18} /></button>
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
                      <button type="button" onClick={() => openWa(selected.client, selected.treatment)} className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs inline-flex items-center justify-center gap-1">
                        <Ms name="chat" size={16} />
                        إرسال واتساب
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => navigate(`/customers/${selected.client.id}`)} className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs inline-flex items-center justify-center gap-1">
                          <Ms name="history_edu" size={14} />
                          السجل السريري
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangePhase(selected.client.id, selected.treatment.id, selected.treatment.currentPhase === 'after' ? 'during' : 'after', selected.treatment)}
                          className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                        >
                          {selected.treatment.currentPhase === 'after' ? 'إرجاع أثناء العلاج' : 'نقل لما بعد الإجراء'}
                        </button>
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Ms name="auto_awesome" size={18} />
                  <h3 className="text-sm font-bold text-slate-900">قوالب الإرشادات السريرية (Care Protocol Templates)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">نصوص أثناء العلاج وبعده. المعاينة تفتح قوالب الرعاية للتعديل، والإرسال من بطاقة الخطة.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
                {[
                  ['filler', 'قالب: الفيلر', 'bg-[#fdf2f8] border-[#fbcfe8] text-[#9d174d]', 'bg-[#fbcfe8] text-[#9d174d]'],
                  ['laser', 'قالب: الليزر', 'bg-[#f0f9ff] border-[#bae6fd] text-[#0c4a6e]', 'bg-[#bae6fd] text-[#0c4a6e]'],
                  ['botox', 'قالب: البوتوكس', 'bg-[#faf5ff] border-[#e9d5ff] text-[#581c87]', 'bg-[#e9d5ff] text-[#581c87]'],
                ].map(([id, title, box, chip]) => (
                  <div key={id} className={`p-3.5 rounded-xl border flex flex-col justify-between ${box}`}>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${chip}`}>جاهز</span>
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed opacity-80">{DEFAULT_INSTRUCTIONS[id].after[0]}</p>
                    </div>
                    <div className="pt-3 flex items-center justify-between text-[11px] border-t border-black/5 mt-2">
                      <span>بعد الإجراء</span>
                      <button type="button" onClick={() => setPanel('instructions')} className="font-bold hover:underline">معاينة النص</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

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
