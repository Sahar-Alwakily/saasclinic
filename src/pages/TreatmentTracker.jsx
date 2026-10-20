import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaSyringe, FaCheckCircle, FaPlayCircle, FaPhone, FaWhatsapp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import WhatsAppInstructionsModal, { WHATSAPP_TEMPLATE_ID } from '../components/customers/WhatsAppInstructionsModal';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [cat, setCat] = useState('all');
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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">متابعة العلاجات</h1>
        <p className="text-gray-500 text-sm mt-1">تتبع رحلة كل عميلة عبر مراحل العلاج</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PHASES.map((phase) => {
          const Icon = phase.icon;
          const isActive = activePhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActivePhase(phase.id)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white border-transparent shadow-md'
                  : `${phase.bg} dark:bg-slate-800 ${phase.border} dark:border-slate-700 ${phase.color} dark:text-white hover:shadow-sm`
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white dark:bg-slate-700'}`}>
                <Icon className={isActive ? 'text-white' : phase.color} />
              </div>
              <div className="text-right flex-1">
                <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>العدد</p>
                <p className="font-bold text-sm">{phase.name}</p>
              </div>
              <span className={`text-2xl font-bold ${isActive ? 'text-white' : phase.color}`}>
                {phaseCounts[phase.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => setCat('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${cat === 'all' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800'}`}>الكل</button>
        {SERVICE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${cat === c.id ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800'}`}>{c.name}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <input
          type="text"
          placeholder="ابحث بالاسم أو اسم العلاج..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-transparent outline-none text-sm dark:text-white"
        />
      </div>

      {filteredClients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">💊</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد علاجات في هذه المرحلة</h3>
          <p className="text-gray-500 text-sm">سجّلي جلسة جديدة من الملف الطبي للعميلة ليظهر العلاج هنا.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                <button type="button" className="flex items-center gap-3" onClick={() => navigate(`/customers/${client.id}`)}>
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-lg">
                    {client.firstName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">{client.firstName} {client.lastName}</p>
                    <p className="text-xs text-gray-500" dir="ltr"><FaPhone className="inline mr-1" />{client.phone}</p>
                  </div>
                </button>
                <span className="text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 px-3 py-1 rounded-full font-bold">
                  {client.matchingTreatments.length} علاج
                </span>
              </div>

              <div className="space-y-3">
                {client.matchingTreatments.map((treatment) => (
                  <div key={treatment.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500 text-white flex items-center justify-center">
                        <FaSyringe />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{treatment.serviceName}</p>
                        <p className="text-xs text-gray-500">
                          {treatment.sessions?.length || 0} جلسة مسجلة
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activePhase === 'during' ? (
                        <button
                          type="button"
                          onClick={() => handleChangePhase(client.id, treatment.id, 'after', treatment)}
                          className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition"
                        >
                          نقل إلى "بعد العلاج"
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleChangePhase(client.id, treatment.id, 'during', treatment)}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition"
                        >
                          إرجاع إلى "أثناء العلاج"
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
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1"
                      >
                        <FaWhatsapp /> إرسال تعليمات المرحلة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
