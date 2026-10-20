import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import {
  FaArrowRight, FaPhone, FaBirthdayCake, FaSyringe, FaPlus, FaPen, FaTrash,
  FaPlayCircle, FaCheckCircle, FaWhatsapp, FaList,
} from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/ar';
import SessionStampModal from '../components/customers/SessionStampModal';
import WhatsAppInstructionsModal, { WHATSAPP_TEMPLATE_ID } from '../components/customers/WhatsAppInstructionsModal';
import AddServiceModal from '../components/customers/AddServiceModal';
import InstructionsList from '../components/customers/InstructionsList';

moment.locale('ar');

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clinicPath } = useClinic();

  const [customer, setCustomer] = useState(null);
  const [services, setServices] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [waModal, setWaModal] = useState({ show: false, client: null, treatment: null });
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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" /></div>;
  if (!customer) return <div className="text-center py-20 text-gray-500">العميلة غير موجودة</div>;

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl mx-auto">
      <ToastContainer position="top-left" rtl />
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-gray-500 hover:text-pink-500">
        <FaArrowRight /> العودة لملفات العملاء
      </button>

      <div className="bg-gradient-to-l from-pink-500 to-rose-400 text-white rounded-3xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-3xl font-bold">
            {(customer.firstName || '?')[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">{customer.firstName} {customer.lastName}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1" dir="ltr"><FaPhone /> {customer.phone}</span>
              {customer.birthDate && <span className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1"><FaBirthdayCake /> {customer.birthDate}</span>}
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !customer.doNotContact;
                await update(ref(database, clinicPath(`customers/${id}`)), { doNotContact: next, winbackOptOut: next, optOutAt: next ? Date.now() : null });
                toast.success(next ? 'لن تُرسل حملات استرجاع لهذه العميلة' : 'أُعيد السماح بالتواصل التنظيمي');
              }}
              className="mt-3 text-xs bg-white/20 rounded-full px-3 py-1"
            >
              {customer.doNotContact || customer.winbackOptOut ? 'مسموح بالتواصل التنظيمي' : 'عدم التواصل / انسحاب من الحملات'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100 bg-white dark:bg-slate-800 rounded-t-2xl px-2">
        {[
          ['sessions', 'سجل الجلسات'],
          ['treatments', 'العلاجات'],
          ['medical', 'المعلومات الطبية'],
        ].map(([tid, label]) => (
          <button key={tid} type="button" onClick={() => setActiveTab(tid)} className={`shrink-0 px-4 py-4 font-bold ${activeTab === tid ? 'text-pink-600 border-b-2 border-pink-500' : 'text-gray-400'}`}>{label}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-b-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 min-h-[300px]">
        {activeTab === 'sessions' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              <button type="button" onClick={() => setShowSessionModal(true)} className="flex-1 min-w-[12rem] bg-pink-50 dark:bg-pink-900/20 text-pink-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold">
                <FaPlus /> تسجيل جلسة جديدة (مع توقيع)
              </button>
              <button type="button" onClick={() => setShowAddService(true)} className="px-4 py-3 rounded-xl bg-violet-50 text-violet-700 font-bold text-sm">➕ إضافة خدمة جديدة</button>
              <button type="button" onClick={() => setShowInstructions(true)} className="px-4 py-3 rounded-xl bg-stone-100 dark:bg-slate-700 font-bold text-sm flex items-center gap-1"><FaList /> التعليمات</button>
            </div>
            {sortedSessions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">لا توجد جلسات مسجلة بعد</div>
            ) : (
              <div className="space-y-3">
                {sortedSessions.map((session) => (
                  <div key={session.id} className="p-4 border border-pink-100 dark:border-slate-700 bg-pink-50/50 dark:bg-slate-700/50 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-200 dark:bg-pink-900/50 text-pink-600 flex items-center justify-center shrink-0"><FaSyringe /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-white">{session.serviceTitle || 'جلسة عامة'}</p>
                      <p className="text-xs text-gray-500">{moment(session.recordedAt).format('dddd، D MMMM YYYY — HH:mm')} · {session.recordedBy || '—'}</p>
                      {session.note && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 bg-white dark:bg-slate-800 p-1 rounded">📝 {session.note}</p>}
                      {session.signature && <img src={session.signature} alt="توقيع" className="mt-2 h-12 bg-white rounded border" />}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEditSessionNote(session)} className="w-9 h-9 rounded-full bg-white text-violet-600 flex items-center justify-center"><FaPen /></button>
                      <button type="button" onClick={() => handleDeleteSession(session)} className="w-9 h-9 rounded-full bg-white text-rose-500 flex items-center justify-center"><FaTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            {treatmentsList.length === 0 && <p className="text-center text-gray-400 py-10">لا علاجات بعد — تُنشأ تلقائياً مع أول جلسة.</p>}
            {treatmentsList.map((t) => {
              const after = t.currentPhase === 'after';
              return (
                <div key={t.id} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
                  <div className={`text-white p-4 bg-gradient-to-l ${after ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-500'}`}>
                    <p className="font-bold flex items-center gap-2">
                      {after ? <FaCheckCircle /> : <FaPlayCircle />}
                      {t.serviceName}
                    </p>
                    <p className="text-xs opacity-80 mt-1">{after ? 'بعد العلاج' : 'أثناء العلاج'} · {t.sessions?.length || 0} جلسة</p>
                  </div>
                  <div className="p-4 space-y-2 bg-white dark:bg-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleChangePhase(t.id, 'during')} className={`text-xs px-3 py-1.5 rounded-full ${!after ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>أثناء العلاج</button>
                      <button type="button" onClick={() => handleChangePhase(t.id, 'after')} className={`text-xs px-3 py-1.5 rounded-full ${after ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>بعد العلاج</button>
                      <button
                        type="button"
                        onClick={() => setWaModal({
                          show: true,
                          client: { clientId: id, customerName: `${customer.firstName} ${customer.lastName}`.trim(), phoneNumber: customer.phone },
                          treatment: { ...t, templateId: WHATSAPP_TEMPLATE_ID },
                        })}
                        className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <FaWhatsapp /> إرسال تعليمات المرحلة
                      </button>
                      <button type="button" onClick={() => handleDeleteTreatment(t.id)} className="text-xs px-3 py-1.5 rounded-full text-rose-500">حذف العلاج</button>
                    </div>
                    {(t.sessions || []).map((s, i) => (
                      <p key={i} className="text-xs text-stone-500">جلسة {s.sessionNumber || i + 1} · {s.date} {s.time} {s.notes ? `· ${s.notes}` : ''}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'medical' && (
          medicalRows.length === 0
            ? <p className="text-center text-gray-400 py-10">لا معلومات طبية مسجّلة. عدّلي الملف من قائمة العميلات.</p>
            : (
              <div className="space-y-3">
                {medicalRows.map(([label, val]) => (
                  <div key={label} className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className="text-sm font-medium dark:text-white">{String(val)}</p>
                  </div>
                ))}
              </div>
            )
        )}
      </div>

      <SessionStampModal
        show={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSave={handleSaveSession}
        services={services}
      />
      <AddServiceModal show={showAddService} onClose={() => setShowAddService(false)} onAdded={() => {}} />
      <InstructionsList show={showInstructions} onClose={() => setShowInstructions(false)} />
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
