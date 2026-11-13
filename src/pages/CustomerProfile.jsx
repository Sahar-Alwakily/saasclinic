import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update, remove, push, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import {
  FaArrowRight, FaPhone, FaBirthdayCake, FaSyringe, FaPlus, FaPen, FaTrash,
  FaPlayCircle, FaCheckCircle, FaWhatsapp,
} from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/ar';
import SessionStampModal from '../components/customers/SessionStampModal';
import WhatsAppInstructionsModal, { WHATSAPP_TEMPLATE_ID } from '../components/customers/WhatsAppInstructionsModal';
import CustomerFormModal from '../components/customers/CustomerFormModal';

moment.locale('ar');

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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;
  if (!customer) return <div className="text-center py-20 text-[#8a9199]">العميلة غير موجودة</div>;

  const tabs = careEnabled
    ? [['sessions', 'سجل الجلسات'], ['treatments', 'العلاجات'], ['medical', 'المعلومات الطبية'], ['notes', 'ملاحظات']]
    : [['medical', 'المعلومات الطبية'], ['notes', 'ملاحظات']];

  return (
    <div dir="rtl" className="space-y-5 max-w-4xl mx-auto">
      <ToastContainer position="top-left" rtl />
      <button type="button" onClick={() => navigate('/customers')} className="flex items-center gap-2 text-[#8a9199] hover:text-emerald-700 text-sm font-bold">
        <FaArrowRight /> العودة للعميلات
      </button>

      <section className="saas-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              {(customer.firstName || '?')[0]}
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#111827]">{customer.firstName} {customer.lastName}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="nura-chip nura-chip-mint" dir="ltr"><FaPhone className="text-[11px]" /> {customer.phone}</span>
                {customer.birthDate && <span className="nura-chip nura-chip-gold"><FaBirthdayCake className="text-[11px]" /> {customer.birthDate}</span>}
                {customer.idNumber && <span className="nura-chip nura-chip-sky" dir="ltr">{customer.idNumber}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="nura-chip nura-chip-lilac"
          >
            <FaPen className="text-[11px]" /> تعديل البيانات
          </button>
        </div>
        <button
          type="button"
          onClick={async () => {
            const next = !customer.doNotContact;
            await update(ref(database, clinicPath(`customers/${id}`)), { doNotContact: next, winbackOptOut: next, optOutAt: next ? Date.now() : null });
            toast.success(next ? 'لن تُرسل حملات استرجاع لهذه العميلة' : 'أُعيد السماح بالتواصل التنظيمي');
          }}
          className={`mt-3 nura-chip ${customer.doNotContact || customer.winbackOptOut ? 'nura-chip-rose' : 'nura-chip-sky'} ${hasCap('winback') ? '' : 'hidden'}`}
        >
          {customer.doNotContact || customer.winbackOptOut ? 'مسموح بالتواصل التنظيمي' : 'عدم التواصل / انسحاب من الحملات'}
        </button>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">الجلسات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{sortedSessions.length}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">العلاجات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{treatmentsList.length}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">بعد العلاج</p>
          <p className="stat-num text-[28px] leading-none mt-2">{afterCount}</p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map(([tid, label]) => (
          <button
            key={tid}
            type="button"
            onClick={() => setActiveTab(tid)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeTab === tid ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="saas-card p-5 min-h-[280px]">
        {activeTab === 'sessions' && (
          <div>
            <button type="button" onClick={() => setShowSessionModal(true)} className="w-full mb-5 bg-[#10b981] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold">
              <FaPlus /> تسجيل جلسة جديدة
            </button>
            {sortedSessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-bold text-[#111827]">لا جلسات بعد</p>
                <p className="text-sm text-[#8a9199] mt-1">سجّلي أول جلسة لتظهر هنا وفي متابعة العلاجات.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSessions.map((session) => (
                  <div key={session.id} className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e4eee8] flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><FaSyringe /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#111827]">{session.serviceTitle || 'جلسة عامة'}</p>
                      <p className="text-xs text-[#8a9199] mt-0.5">{moment(session.recordedAt).format('dddd، D MMMM YYYY — HH:mm')} · {session.recordedBy || '—'}</p>
                      {session.note && <p className="text-xs text-[#111827] mt-2 bg-white p-2 rounded-xl border border-[#e4eee8]">{session.note}</p>}
                      {session.signature && <img src={session.signature} alt="توقيع" className="mt-2 h-12 bg-white rounded-lg border border-[#e4eee8]" />}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEditSessionNote(session)} className="w-9 h-9 rounded-full bg-white border border-[#e4eee8] text-emerald-700 flex items-center justify-center"><FaPen /></button>
                      <button type="button" onClick={() => handleDeleteSession(session)} className="w-9 h-9 rounded-full bg-white border border-[#e4eee8] text-rose-500 flex items-center justify-center"><FaTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            {treatmentsList.length === 0 && (
              <div className="text-center py-12">
                <p className="font-bold text-[#111827]">لا علاجات بعد</p>
                <p className="text-sm text-[#8a9199] mt-1">تُنشأ تلقائياً مع أول جلسة. تعليمات الخدمات من متابعة العلاجات.</p>
              </div>
            )}
            {treatmentsList.map((t) => {
              const after = t.currentPhase === 'after';
              return (
                <article key={t.id} className={`saas-card overflow-hidden ${after ? 'stat-card-mint' : 'stat-card-sky'}`}>
                  <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#111827] flex items-center gap-2">
                        {after ? <FaCheckCircle className="text-emerald-600" /> : <FaPlayCircle className="text-sky-600" />}
                        {t.serviceName}
                      </p>
                      <p className="text-xs text-[#8a9199] mt-1">{t.sessions?.length || 0} جلسة مسجّلة</p>
                    </div>
                    <span className={`nura-chip ${after ? 'nura-chip-mint' : 'nura-chip-sky'}`}>{after ? 'بعد العلاج' : 'أثناء العلاج'}</span>
                  </div>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleChangePhase(t.id, 'during')} className={`text-xs px-3 py-1.5 rounded-full font-bold ${!after ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700'}`}>أثناء العلاج</button>
                      <button type="button" onClick={() => handleChangePhase(t.id, 'after')} className={`text-xs px-3 py-1.5 rounded-full font-bold ${after ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-700'}`}>بعد العلاج</button>
                      <button
                        type="button"
                        onClick={() => setWaModal({
                          show: true,
                          client: { clientId: id, customerName: `${customer.firstName} ${customer.lastName}`.trim(), phoneNumber: customer.phone },
                          treatment: { ...t, templateId: WHATSAPP_TEMPLATE_ID },
                        })}
                        className="text-xs px-3 py-1.5 rounded-full bg-[#10b981] text-white font-bold flex items-center gap-1"
                      >
                        <FaWhatsapp /> إرسال تعليمات المرحلة
                      </button>
                      <button type="button" onClick={() => handleDeleteTreatment(t.id)} className="nura-chip nura-chip-rose text-xs">حذف العلاج</button>
                    </div>
                    {(t.sessions || []).map((s, i) => (
                      <p key={i} className="text-xs text-[#8a9199]">جلسة {s.sessionNumber || i + 1} · {s.date} {s.time} {s.notes ? `· ${s.notes}` : ''}</p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              placeholder="ملاحظة عن العميلة…"
              className="w-full p-3 rounded-xl bg-[#f8faf9] border border-[#e4eee8] outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
            />
            <button
              type="button"
              disabled={savingNote || !noteDraft.trim()}
              onClick={handleAddNote}
              className="w-full mt-3 mb-5 bg-[#10b981] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-40"
            >
              <FaPlus /> حفظ الملاحظة
            </button>
            {ownerNotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-bold text-[#111827]">لا ملاحظات بعد</p>
                <p className="text-sm text-[#8a9199] mt-1">كل حفظ بيسجّل ملاحظة جديدة مع وقتها، من غير ما يمس الجلسات أو الملف الطبي.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ownerNotes.map((note) => (
                  <div key={note.id} className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e4eee8] flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#8a9199]">{moment(note.createdAt).format('dddd، D MMMM YYYY — HH:mm')}</p>
                      <p className="text-sm text-[#111827] mt-2 whitespace-pre-wrap">{note.text}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteNote(note.id)} className="w-9 h-9 rounded-full bg-white border border-[#e4eee8] text-rose-500 flex items-center justify-center shrink-0" aria-label="حذف الملاحظة">
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <div>
            <button
              type="button"
              onClick={() => setShowMedicalForm(true)}
              className="w-full mb-5 bg-[#10b981] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold"
            >
              <FaPen /> ملء المعلومات الطبية
            </button>
            {medicalRows.length === 0
              ? <p className="text-center text-[#8a9199] py-10">لا معلومات طبية مسجّلة بعد.</p>
              : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {medicalRows.map(([label, val]) => (
                    <div key={label} className="rounded-2xl bg-[#f8faf9] border border-[#e4eee8] p-4">
                      <p className="text-xs text-[#8a9199] mb-1">{label}</p>
                      <p className="text-sm font-medium text-[#111827]">{String(val)}</p>
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
