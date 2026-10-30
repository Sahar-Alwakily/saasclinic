import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaSyringe, FaCheckCircle, FaPlayCircle, FaPhone, FaWhatsapp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import WhatsAppInstructionsModal, { WHATSAPP_TEMPLATE_ID } from '../components/customers/WhatsAppInstructionsModal';
import InstructionsList from '../components/customers/InstructionsList';
import { SERVICE_CATEGORIES } from '../constants/clinicCare';

const PHASES = [
  { id: 'during', name: 'أثناء العلاج', icon: FaPlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'after', name: 'بعد العلاج', icon: FaCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

const TreatmentTracker = () => {
  const { clinicPath } = useClinic();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('during');
  const [panel, setPanel] = useState('track');
  const [searchTerm, setSearchTerm] = useState('');
  const [cat, setCat] = useState('all');
  const [waModal, setWaModal] = useState({ show: false, client: null, treatment: null });
  const phaseInitRef = useRef(false);

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

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clientsWithTreatments.map((client) => {
      const matchingTreatments = client.treatmentsList.filter((t) => {
        if (t.currentPhase !== activePhase) return false;
        if (cat !== 'all' && t.category !== cat) return false;
        if (term && !client.firstName?.toLowerCase().includes(term) && !t.serviceName?.toLowerCase().includes(term)) return false;
        return true;
      });
      return { ...client, matchingTreatments };
    }).filter((c) => c.matchingTreatments.length > 0);
  }, [clientsWithTreatments, activePhase, searchTerm, cat]);

  const phaseCounts = useMemo(() => {
    let during = 0;
    let after = 0;
    clientsWithTreatments.forEach((c) => {
      c.treatmentsList.forEach((t) => {
        if (t.currentPhase === 'during') during += 1;
        if (t.currentPhase === 'after') after += 1;
      });
    });
    return { during, after };
  }, [clientsWithTreatments]);

  useEffect(() => {
    if (phaseInitRef.current || loading) return;
    if (phaseCounts.during === 0 && phaseCounts.after > 0) setActivePhase('after');
    phaseInitRef.current = true;
  }, [loading, phaseCounts.during, phaseCounts.after]);

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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">متابعة العلاجات</h1>
          <p className="text-sm text-[#8a9199] mt-1">مراحل كل عميلة، وتعليمات الخدمات التي تُرسل على واتساب.</p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setPanel('track')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${panel === 'track' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>المتابعة</button>
          <button type="button" onClick={() => setPanel('instructions')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${panel === 'instructions' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>تعليمات الخدمات</button>
        </div>
      </div>

      {panel === 'instructions' && (
        <section className="saas-card p-4 sm:p-5">
          <h2 className="font-bold text-[#111827] mb-1">تعليمات الخدمات</h2>
          <p className="text-xs text-[#8a9199] mb-4">نصوص أثناء/بعد العلاج لكل خدمة — تُرسل للعميلة من بطاقة المتابعة، وليست من ملفها.</p>
          <InstructionsList embedded />
        </section>
      )}

      {panel === 'track' && (
      <>
      <div className="grid grid-cols-2 gap-3">
        {PHASES.map((phase) => {
          const Icon = phase.icon;
          const isActive = activePhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActivePhase(phase.id)}
              className={`saas-card flex items-center gap-3 p-4 ${
                isActive ? (phase.id === 'after' ? 'stat-card-mint' : 'stat-card-sky') : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${phase.id === 'after' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                <Icon />
              </div>
              <div className="text-right flex-1">
                <p className="text-xs text-[#8a9199]">{phase.name}</p>
                <p className="stat-num text-[28px] leading-none mt-1">{phaseCounts[phase.id]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => setCat('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cat === 'all' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>الكل</button>
        {SERVICE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cat === c.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>{c.name}</button>
        ))}
      </div>

      <div className="saas-card p-2">
        <input
          type="text"
          placeholder="ابحث بالاسم أو اسم العلاج..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-transparent outline-none text-sm"
        />
      </div>

      {filteredClients.length === 0 ? (
        <div className="saas-card text-center py-16">
          <h3 className="text-lg font-bold text-[#111827] mb-2">لا علاجات في هذه المرحلة</h3>
          <p className="text-[#8a9199] text-sm">سجّلي جلسة من ملف العميلة لتظهر هنا.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <article key={client.id} className="saas-card p-5">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#e4eee8]">
                <button type="button" className="flex items-center gap-3" onClick={() => navigate(`/customers/${client.id}`)}>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                    {client.firstName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827]">{client.firstName} {client.lastName}</p>
                    <p className="text-xs text-[#8a9199]" dir="ltr"><FaPhone className="inline mr-1" />{client.phone}</p>
                  </div>
                </button>
                <span className={`nura-chip ${activePhase === 'after' ? 'nura-chip-mint' : 'nura-chip-sky'}`}>
                  {client.matchingTreatments.length} علاج
                </span>
              </div>

              <div className="space-y-3">
                {client.matchingTreatments.map((treatment) => (
                  <div key={treatment.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl ${activePhase === 'after' ? 'bg-emerald-50/70' : 'bg-sky-50/70'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center ${activePhase === 'after' ? 'bg-[#10b981]' : 'bg-sky-500'}`}>
                        <FaSyringe />
                      </div>
                      <div>
                        <p className="font-bold text-[#111827]">{treatment.serviceName}</p>
                        <p className="text-xs text-[#8a9199]">{treatment.sessions?.length || 0} جلسة مسجّلة</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activePhase === 'during' ? (
                        <button
                          type="button"
                          onClick={() => handleChangePhase(client.id, treatment.id, 'after', treatment)}
                          className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-bold"
                        >
                          نقل إلى بعد العلاج
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleChangePhase(client.id, treatment.id, 'during', treatment)}
                          className="px-4 py-2 bg-sky-100 text-sky-800 rounded-xl text-sm font-bold"
                        >
                          إرجاع أثناء العلاج
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setWaModal({
                          show: true,
                          client: {
                            clientId: client.id,
                            customerName: `${client.firstName} ${client.lastName}`.trim(),
                            phoneNumber: client.phone,
                          },
                          treatment: { ...treatment, templateId: WHATSAPP_TEMPLATE_ID },
                        })}
                        className="px-4 py-2 bg-[#10b981] text-white rounded-xl text-sm font-bold flex items-center gap-1"
                      >
                        <FaWhatsapp /> إرسال تعليمات المرحلة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
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
