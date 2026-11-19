import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update, remove, push, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaPen, FaTrash } from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/ar';
import SessionStampModal from '../components/customers/SessionStampModal';
import WhatsAppInstructionsModal, { WHATSAPP_TEMPLATE_ID } from '../components/customers/WhatsAppInstructionsModal';
import CustomerFormModal from '../components/customers/CustomerFormModal';

moment.locale('ar');

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clinicPath, hasCap } = useClinic();
  const careEnabled = hasCap('treatments');

  const [customer, setCustomer] = useState(null);
  const [services, setServices] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [waModal, setWaModal] = useState({ show: false, client: null, treatment: null });
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const migrationDoneRef = useRef(false);

  useEffect(() => {
    if (!id || !clinicPath) {
      setLoading(false);
      return undefined;
    }
    if (!clinicPath('customers')) {
      setLoading(false);
      return undefined;
    }
    const unsubs = [
      onValue(ref(database, `${clinicPath('customers')}/${id}`), (snap) => {
        setCustomer(snap.exists() ? { id, ...snap.val() } : null);
        setLoading(false);
      }),
      onValue(ref(database, clinicPath('services')), (s) => {
        setServices(s.val() ? Object.entries(s.val()).map(([sid, v]) => ({ id: sid, ...v })) : []);
      }),
      onValue(ref(database, clinicPath('treatments/templates')), (s) => setTemplates(s.val() || {})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [id, clinicPath]);

  useEffect(() => {
    if (!careEnabled) setActiveTab('medical');
  }, [careEnabled]);

  const sortedSessions = useMemo(
    () => [...(customer?.sessions || [])].sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)),
    [customer],
  );

  const treatmentsList = useMemo(() => {
    const obj = customer?.treatments || {};
    return Object.entries(obj)
      .map(([tid, t]) => ({ id: tid, ...t }))
      .sort((a, b) => new Date(b.phaseStartedAt || b.createdAt || 0) - new Date(a.phaseStartedAt || a.createdAt || 0));
  }, [customer]);

  const handleSaveSession = async (sessionData) => {
    if (migrationDoneRef.current) return;
    migrationDoneRef.current = true;
    try {
      const batch = Array.isArray(sessionData) ? sessionData : [sessionData];
      const now = new Date().toISOString();
      const existingSessions = Array.isArray(customer.sessions) ? customer.sessions : [];
      const treatments = { ...(customer.treatments || {}) };
      const createdThisBatch = {};

      const normalized = batch.map((sess) => {
        const labels = sess.laserZonesLabels || [];
        const title = labels.length
          ? `${sess.serviceTitle || 'جلسة'} — ${labels.join(' ، ')}`
          : (sess.serviceTitle || 'جلسة');
        return { ...sess, serviceTitle: title, recordedAt: sess.recordedAt || now };
      });

      const newSessions = [...existingSessions, ...normalized];

      for (const sess of normalized) {
        const serviceName = sess.serviceTitle.split(' — ')[0];
        let treatmentId = Object.keys(treatments).find((tid) => treatments[tid].serviceName === serviceName)
          || Object.keys(createdThisBatch).find((tid) => createdThisBatch[tid].serviceName === serviceName);

        const sessionEntry = {
          sessionId: sess.id,
          sessionNumber: 1,
          date: String(sess.recordedAt).split('T')[0],
          time: new Date(sess.recordedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          notes: sess.note || '',
          recordedAt: sess.recordedAt,
        };

        if (treatmentId) {
          const t = treatments[treatmentId] || createdThisBatch[treatmentId];
          const tSessions = [...(t.sessions || [])];
          sessionEntry.sessionNumber = tSessions.length + 1;
          tSessions.push(sessionEntry);
          const next = { ...t, sessions: tSessions, updatedAt: now };
          treatments[treatmentId] = next;
          createdThisBatch[treatmentId] = next;
        } else {
          const treatRef = push(ref(database, clinicPath(`customers/${id}/treatments`)));
          treatmentId = treatRef.key;
          const templateId = Object.keys(templates).find((k) => templates[k]?.name === serviceName) || '';
          const created = {
            templateId,
            serviceName,
            category: sess.category || 'beauty',
            currentPhase: 'during',
            phaseStartedAt: sess.recordedAt || now,
            sessions: [{ ...sessionEntry, sessionNumber: 1 }],
            createdAt: now,
            status: 'active',
            autoCreated: true,
          };
          treatments[treatmentId] = created;
          createdThisBatch[treatmentId] = created;
        }
      }

      await update(ref(database, clinicPath(`customers/${id}`)), {
        sessions: newSessions,
        treatments,
        updatedAt: Date.now(),
      });

      if (normalized.length === 1) toast.success(`✅ تم تسجيل جلسة "${normalized[0].serviceTitle}"`);
      else toast.success(`✨ تم تسجيل ${normalized.length} جلسات`);
      setShowSessionModal(false);
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      migrationDoneRef.current = false;
    }
  };

  const handleDeleteSession = async (session) => {
    if (!window.confirm('حذف هذه الجلسة من السجل؟')) return;
    try {
      const sessions = (customer.sessions || []).filter((s) => s.id !== session.id);
      const treatments = { ...(customer.treatments || {}) };
      Object.keys(treatments).forEach((tid) => {
        const t = treatments[tid];
        treatments[tid] = {
          ...t,
          sessions: (t.sessions || []).filter((x) => x.sessionId !== session.id),
          updatedAt: new Date().toISOString(),
        };
      });
      await update(ref(database, clinicPath(`customers/${id}`)), { sessions, treatments, updatedAt: Date.now() });
      toast.success('حُذفت الجلسة');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const handleEditSessionNote = async (session) => {
    const next = window.prompt('تعديل الملاحظة', session.note || '');
    if (next == null) return;
    const sessions = (customer.sessions || []).map((s) => (s.id === session.id ? { ...s, note: next, updatedAt: new Date().toISOString() } : s));
    const treatments = { ...(customer.treatments || {}) };
    Object.keys(treatments).forEach((tid) => {
      const t = treatments[tid];
      treatments[tid] = {
        ...t,
        sessions: (t.sessions || []).map((x) => (x.sessionId === session.id ? { ...x, notes: next } : x)),
        updatedAt: new Date().toISOString(),
      };
    });
    await update(ref(database, clinicPath(`customers/${id}`)), { sessions, treatments, updatedAt: Date.now() });
    toast.success('عُدّلت الجلسة');
  };

  const handleChangePhase = async (tid, newPhase) => {
    const t = customer.treatments?.[tid] || {};
    const now = new Date().toISOString();
    const patch = { currentPhase: newPhase, phaseStartedAt: now };
    const days = Number(templates[t.templateId]?.phases?.after?.followUpDays);
    if (newPhase === 'after' && days) {
      patch.followUpDate = moment().add(days, 'days').format('YYYY-MM-DD');
    }
    await update(ref(database, clinicPath(`customers/${id}/treatments/${tid}`)), patch);
    toast.success('عُدّلت المرحلة');
  };

  const handleDeleteTreatment = async (tid) => {
    if (!window.confirm('حذف هذا العلاج؟ الجلسات في السجل تبقى.')) return;
    try {
      await remove(ref(database, clinicPath(`customers/${id}/treatments/${tid}`)));
      toast.success('حُذف العلاج');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const medicalRows = useMemo(() => {
    const m = customer?.medicalInfo || {};
    const rows = [
      ['الحساسية', m.allergies],
      ['الأمراض المزمنة', m.chronicDiseases],
      ['الأدوية الحالية', m.currentMedications],
      ['عمليات سابقة', m.previousSurgeries],
      ['ملاحظات', m.notes],
    ].filter(([, v]) => v);
    if (customer?.gender === 'female') {
      if (m.isPregnant) rows.push(['حمل', 'نعم']);
      if (m.isBreastfeeding) rows.push(['رضاعة', 'نعم']);
    }
    return rows;
  }, [customer]);

  const ownerNotes = useMemo(() => {
    const obj = customer?.ownerNotes || {};
    return Object.entries(obj)
      .map(([nid, note]) => ({ id: nid, ...(note || {}) }))
      .filter((note) => String(note.text || '').trim())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [customer]);

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text || savingNote) return;
    setSavingNote(true);
    try {
      const noteRef = push(ref(database, clinicPath(`customers/${id}/ownerNotes`)));
      await set(noteRef, { text, createdAt: Date.now() });
      setNoteDraft('');
      toast.success('حُفظت الملاحظة');
    } catch {
      toast.error('تعذّر حفظ الملاحظة');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('حذف هذه الملاحظة؟')) return;
    try {
      await remove(ref(database, clinicPath(`customers/${id}/ownerNotes/${noteId}`)));
      toast.success('حُذفت الملاحظة');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const afterCount = treatmentsList.filter((t) => t.currentPhase === 'after').length;
  const allergy = String(customer?.medicalInfo?.allergies || '').trim();
  const flags = [
    allergy && !/^(لا يوجد|لا توجد|لا|none|n\/a|—|-)$/i.test(allergy) ? allergy : '',
    customer?.medicalInfo?.isPregnant ? 'حمل' : '',
    customer?.medicalInfo?.isBreastfeeding ? 'رضاعة' : '',
  ].filter(Boolean);
  const initials = `${(customer?.firstName || '?')[0]}${(customer?.lastName || '')[0] || ''}`;
  const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]';
  const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]';

  if (loading) return <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4EAEE] border-t-[#059669]" /></div>;
  if (!customer) return <div className="py-20 text-center text-[13px] text-[#64748B]">العميلة غير موجودة</div>;

  const tabs = careEnabled
    ? [['sessions', 'سجل الجلسات'], ['treatments', 'العلاجات'], ['medical', 'المعلومات الطبية'], ['notes', 'ملاحظات']]
    : [['medical', 'المعلومات الطبية'], ['notes', 'ملاحظات']];
  const kpis = [
    { label: 'الجلسات', value: String(sortedSessions.length), note: 'مسجّلة في الملف', accent: '#059669' },
    { label: 'العلاجات', value: String(treatmentsList.length), note: 'خطط مرتبطة بالجلسات', accent: '#0FA3A3' },
    { label: 'بعد العلاج', value: String(afterCount), note: 'تحت المتابعة', accent: '#B45309' },
  ];

  return (
    <div dir="rtl" className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate('/customers')} className="text-[11px] font-bold text-[#94A3B8] hover:text-[#0E7490]">العودة للعميلات</button>
          <p className="mt-2 text-[11px] font-bold tracking-wide text-[#94A3B8]">ملف العميلة</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-[13px] font-extrabold text-[#0E7490]">{initials}</span>
            <div>
              <h1 className="text-[24px] font-extrabold tracking-tight">{customer.firstName} {customer.lastName}</h1>
              <p className="mt-1 text-[12.5px] text-[#64748B]">
                <span dir="ltr">{customer.phone || '—'}</span>
                {customer.birthDate ? ` · ${customer.birthDate}` : ''}
                {customer.idNumber ? ` · ${customer.idNumber}` : ''}
              </p>
            </div>
          </div>
          {flags.length > 0 && (
            <p className="mt-2 inline-flex rounded-full border border-[#F7D3D3] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-bold text-[#DC2626]">تنبيه: {flags.join(' · ')}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const next = !customer.doNotContact;
              await update(ref(database, clinicPath(`customers/${id}`)), { doNotContact: next, winbackOptOut: next, optOutAt: next ? Date.now() : null });
              toast.success(next ? 'لن تُرسل حملات استرجاع لهذه العميلة' : 'أُعيد السماح بالتواصل التنظيمي');
            }}
            className={`${customer.doNotContact || customer.winbackOptOut ? 'rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-2 text-[13px] font-bold text-[#DC2626]' : ghost} ${hasCap('winback') ? '' : 'hidden'}`}
          >
            {customer.doNotContact || customer.winbackOptOut ? 'مسموح بالتواصل التنظيمي' : 'عدم التواصل'}
          </button>
          <button type="button" onClick={() => setShowEditForm(true)} className={ghost}>تعديل البيانات</button>
          {careEnabled && activeTab === 'sessions' && (
            <button type="button" onClick={() => setShowSessionModal(true)} className={primary}>تسجيل جلسة</button>
          )}
        </div>
      </header>

      <section aria-label="مؤشرات الملف" className="grid grid-cols-3 border-y border-[#E4EAEE]">
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
        {tabs.map(([tid, label]) => (
          <button
            key={tid}
            type="button"
            onClick={() => setActiveTab(tid)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${activeTab === tid ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="min-h-[280px]">
        {activeTab === 'sessions' && (
          <div className="space-y-3">
            {sortedSessions.length === 0 ? (
              <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-12 text-center">
                <p className="text-[14px] font-bold">لا جلسات بعد</p>
                <p className="mt-1 text-[12.5px] text-[#64748B]">سجّلي أول جلسة لتظهر هنا وفي متابعة العلاجات.</p>
              </div>
            ) : sortedSessions.map((session) => (
              <article key={session.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-3 py-3">
                <span className="absolute inset-y-0 start-0 w-[3px] bg-[#0FA3A3]" />
                <div className="flex items-start justify-between gap-3 ps-1.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold">{session.serviceTitle || 'جلسة عامة'}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#64748B]">{formatWhen(session.recordedAt)} · {session.recordedBy || '—'}</p>
                    {session.note && <p className="mt-2 rounded-lg border border-[#EDF1F4] bg-[#F8FBFC] px-2.5 py-2 text-[12px] text-[#334155]">{session.note}</p>}
                    {session.signature && <img src={session.signature} alt="توقيع" className="mt-2 h-12 rounded-lg border border-[#E4EAEE] bg-white" />}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => handleEditSessionNote(session)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] bg-white text-[#0E7490]" aria-label="تعديل الملاحظة"><FaPen className="text-[11px]" /></button>
                    <button type="button" onClick={() => handleDeleteSession(session)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]" aria-label="حذف الجلسة"><FaTrash className="text-[11px]" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-3">
            {treatmentsList.length === 0 && (
              <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-12 text-center">
                <p className="text-[14px] font-bold">لا علاجات بعد</p>
                <p className="mt-1 text-[12.5px] text-[#64748B]">تُنشأ تلقائياً مع أول جلسة. تعليمات الخدمات من متابعة العلاجات.</p>
              </div>
            )}
            {treatmentsList.map((t) => {
              const after = t.currentPhase === 'after';
              const accent = after ? '#B45309' : '#0FA3A3';
              return (
                <article key={t.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-3 py-3">
                  <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
                  <div className="flex flex-wrap items-start justify-between gap-3 ps-1.5">
                    <div>
                      <p className="text-[14px] font-bold">{t.serviceName}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#64748B]">{t.sessions?.length || 0} جلسة مسجّلة</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${after ? 'border-[#F6E4C4] bg-[#FFFBEB] text-[#B45309]' : 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]'}`}>{after ? 'بعد العلاج' : 'أثناء العلاج'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[#EDF1F4] ps-1.5 pt-3">
                    <button type="button" onClick={() => handleChangePhase(t.id, 'during')} className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold ${!after ? 'bg-[#0FA3A3] text-white' : 'border border-[#E4EAEE] bg-white text-[#334155]'}`}>أثناء العلاج</button>
                    <button type="button" onClick={() => handleChangePhase(t.id, 'after')} className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold ${after ? 'bg-[#059669] text-white' : 'border border-[#E4EAEE] bg-white text-[#334155]'}`}>بعد العلاج</button>
                    <button
                      type="button"
                      onClick={() => setWaModal({
                        show: true,
                        client: { clientId: id, customerName: `${customer.firstName} ${customer.lastName}`.trim(), phoneNumber: customer.phone },
                        treatment: { ...t, templateId: WHATSAPP_TEMPLATE_ID },
                      })}
                      className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-[11.5px] font-bold text-[#166534]"
                    >
                      إرسال تعليمات المرحلة
                    </button>
                    <button type="button" onClick={() => handleDeleteTreatment(t.id)} className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-1.5 text-[11.5px] font-bold text-[#DC2626]">حذف العلاج</button>
                  </div>
                  {(t.sessions || []).length > 0 && (
                    <div className="mt-3 space-y-1 ps-1.5">
                      {(t.sessions || []).map((s, i) => (
                        <p key={s.sessionId || i} className="text-[11.5px] text-[#64748B]">جلسة {s.sessionNumber || i + 1} · {s.date} {s.time} {s.notes ? `· ${s.notes}` : ''}</p>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#E4EAEE] bg-white p-4">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                placeholder="ملاحظة عن العميلة…"
                className="w-full resize-none rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]"
              />
              <button
                type="button"
                disabled={savingNote || !noteDraft.trim()}
                onClick={handleAddNote}
                className={`${primary} mt-3 disabled:opacity-40`}
              >
                حفظ الملاحظة
              </button>
            </div>
            {ownerNotes.length === 0 ? (
              <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-12 text-center">
                <p className="text-[14px] font-bold">لا ملاحظات بعد</p>
                <p className="mt-1 text-[12.5px] text-[#64748B]">كل حفظ يسجّل ملاحظة جديدة مع وقتها، من غير ما يمس الجلسات أو المعلومات الطبية.</p>
              </div>
            ) : ownerNotes.map((note) => (
              <article key={note.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-3 py-3">
                <span className="absolute inset-y-0 start-0 w-[3px] bg-[#94A3B8]" />
                <div className="flex items-start gap-3 ps-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] text-[#64748B]">{formatWhen(note.createdAt)}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#0F172A]">{note.text}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteNote(note.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]" aria-label="حذف الملاحظة">
                    <FaTrash className="text-[11px]" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowMedicalForm(true)} className={primary}>تعديل المعلومات الطبية</button>
            </div>
            {medicalRows.length === 0
              ? <p className="rounded-xl border border-[#E4EAEE] bg-white py-10 text-center text-[13px] text-[#64748B]">لا معلومات طبية مسجّلة بعد.</p>
              : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {medicalRows.map(([label, val]) => (
                    <div key={label} className="rounded-lg border border-[#E4EAEE] bg-white px-4 py-3">
                      <p className="text-[11px] font-bold text-[#94A3B8]">{label}</p>
                      <p className="mt-1 text-[13px] font-bold text-[#0F172A]">{String(val)}</p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </section>

      <SessionStampModal
        show={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSave={handleSaveSession}
        services={services}
      />
      <CustomerFormModal
        show={showEditForm}
        title={`تعديل — ${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
        initial={customer}
        onClose={() => setShowEditForm(false)}
        onSubmit={async (form) => {
          try {
            await update(ref(database, clinicPath(`customers/${id}`)), {
              firstName: form.firstName,
              lastName: form.lastName || '',
              phone: form.phone,
              birthDate: form.birthDate || '',
              idNumber: form.idNumber || '',
              gender: form.gender || 'female',
              medicalInfo: form.medicalInfo || {},
              adsStamp: form.adsStamp || null,
              updatedAt: Date.now(),
            });
            toast.success('عُدّل الملف');
            setShowEditForm(false);
          } catch {
            toast.error('تعذّر حفظ البيانات');
          }
        }}
      />
      <CustomerFormModal
        show={showMedicalForm}
        medicalOnly
        startTab="medical"
        title={`معلومات طبية — ${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
        initial={customer}
        onClose={() => setShowMedicalForm(false)}
        onSubmit={async (form) => {
          try {
            await update(ref(database, clinicPath(`customers/${id}`)), {
              medicalInfo: form.medicalInfo || {},
              gender: form.gender || customer.gender || 'female',
              updatedAt: Date.now(),
            });
            toast.success('حُفظت المعلومات الطبية لهذا الملف');
            setShowMedicalForm(false);
          } catch {
            toast.error('تعذّر حفظ المعلومات الطبية');
          }
        }}
      />
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

export default CustomerProfile;
