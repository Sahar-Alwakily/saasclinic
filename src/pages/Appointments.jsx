import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaCalendarAlt, FaPhone, FaClock, FaCheckCircle, FaWhatsapp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ScheduleSettingsModal from '../components/settings/ScheduleSettingsModal';
import { APT_STATUSES, appendHistory, releaseSlot, slotKey, manageUrl, reminderBody, waDigits } from '../utils/appointmentOps';

const Appointments = () => {
  const { clinicPath, clinicId, clinicInfo } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState('');
  const [historyFor, setHistoryFor] = useState(null);

  useEffect(() => {
    if (!clinicPath) return;
    const aptPath = clinicPath('appointments');
    if (!aptPath) return;
    const unsub = onValue(ref(database, aptPath), (snap) => {
      const val = snap.val();
      setAppointments(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  const patch = async (apt, data, historyEntry) => {
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
      ...data,
      history: appendHistory(apt, historyEntry),
    });
  };

  const handleStatus = async (apt, newStatus) => {
    try {
      if (newStatus === 'cancelled') {
        setCancelFor(apt);
        return;
      }
      await patch(apt, { status: newStatus }, { action: newStatus, by: 'staff' });
      if (newStatus === 'confirmed' && apt.phoneNumber && apt.manageToken) {
        const body = reminderBody(clinicInfo?.name, apt, clinicId, apt.reminderVariant || 'A');
        window.open(`https://wa.me/${waDigits(apt.phoneNumber)}?text=${encodeURIComponent(body)}`, '_blank');
      }
      toast.success('تم تحديث الحالة');
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const confirmCancel = async () => {
    if (!cancelFor) return;
    await patch(cancelFor, { status: 'cancelled', cancelReason: reason, cancelledAt: Date.now() }, { action: 'cancelled', by: 'staff', reason });
    await releaseSlot(database, clinicId, slotKey(cancelFor.branchId, cancelFor.specialistId, cancelFor.date, cancelFor.time), cancelFor.id);
    await push(ref(database, clinicPath('waitlistEvents')), {
      type: 'vacancy',
      fromAppointmentId: cancelFor.id,
      service: cancelFor.service,
      serviceId: cancelFor.serviceId || '',
      branchId: cancelFor.branchId,
      specialistId: cancelFor.specialistId || '',
      date: cancelFor.date,
      time: cancelFor.time,
      price: cancelFor.price || 0,
      createdAt: Date.now(),
      open: true,
    });
    toast.success('سُجّل الإلغاء وأُتيح الموعد لقائمة الانتظار — بلا عقوبة آلية');
    setCancelFor(null);
    setReason('');
  };

  const list = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" /></div>;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">المواعيد والحجوزات</h1>
          <p className="text-gray-500 text-sm mt-1">حالات: بانتظار التأكيد، مؤكد، ملغي، حضر، لم يحضر</p>
        </div>
        <div className="flex gap-2">
          <Link to="/ops" className="px-4 py-2.5 rounded-xl bg-pink-50 text-pink-700 font-bold text-sm">ملء المواعيد الفارغة</Link>
          <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium">
            <FaClock /> إعدادات الجدول
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-xl text-sm ${filter === 'all' ? 'bg-pink-500 text-white' : 'bg-white dark:bg-slate-800'}`}>الكل</button>
        {APT_STATUSES.map((s) => (
          <button key={s.id} onClick={() => setFilter(s.id)} className={`px-3 py-1.5 rounded-xl text-sm ${filter === s.id ? 'bg-pink-500 text-white' : 'bg-white dark:bg-slate-800'}`}>{s.label}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد حجوزات</h3>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {list.map((apt) => (
              <div key={apt.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/30 text-pink-600 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <FaClock className="text-sm mb-1" />
                  <span className="text-xs font-bold">{apt.time?.split(' ')[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 dark:text-white">{apt.customerName}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><FaCalendarAlt /> {apt.date}</span>
                    <span className="flex items-center gap-1" dir="ltr"><FaPhone /> {apt.phoneNumber}</span>
                  </div>
                  <p className="text-xs text-pink-600 mt-1">{apt.service}{apt.branchName ? ` · ${apt.branchName}` : ''}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{APT_STATUSES.find((s) => s.id === apt.status)?.label || apt.status}{apt.cancelReason ? ` · ${apt.cancelReason}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {apt.status === 'pending' && (
                    <button onClick={() => handleStatus(apt, 'confirmed')} className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-1">
                      <FaCheckCircle /> تأكيد
                    </button>
                  )}
                  {['pending', 'confirmed'].includes(apt.status) && (
                    <>
                      <button onClick={() => handleStatus(apt, 'attended')} className="px-3 py-2 bg-gray-50 rounded-lg text-sm">حضر</button>
                      <button onClick={() => handleStatus(apt, 'noshow')} className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">لم يحضر</button>
                      <button onClick={() => handleStatus(apt, 'cancelled')} className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm">إلغاء</button>
                    </>
                  )}
                  {apt.manageToken && (
                    <a href={manageUrl(clinicId, apt.manageToken)} target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold">رابط العميلة</a>
                  )}
                  <button onClick={() => setHistoryFor(apt)} className="px-3 py-2 text-xs">السجل</button>
                  <button onClick={() => window.open(`https://wa.me/${waDigits(apt.phoneNumber)}`, '_blank')} className="px-3 py-2 bg-gray-100 rounded-lg text-sm flex items-center gap-1">
                    <FaWhatsapp />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cancelFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md space-y-3" dir="rtl">
            <h3 className="font-bold">سبب الإلغاء (اختياري)</h3>
            <p className="text-xs text-gray-400">لا تُفرض غرامة آلية. العربون إن وُجد يُراجع يدوياً.</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-700" />
            <div className="flex gap-2">
              <button onClick={() => setCancelFor(null)} className="flex-1 py-2 bg-gray-100 rounded-xl">تراجع</button>
              <button onClick={confirmCancel} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-bold">تأكيد الإلغاء</button>
            </div>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setHistoryFor(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md text-sm" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">سجل {historyFor.customerName}</h3>
            {(historyFor.history || []).slice().reverse().map((h, i) => (
              <p key={i} className="py-1 text-gray-600 dark:text-gray-300">{new Date(h.at).toLocaleString('ar')} — {h.action} {h.reason || ''}</p>
            ))}
            {!(historyFor.history || []).length && <p className="text-gray-400">لا سجل بعد</p>}
          </div>
        </div>
      )}

      <ScheduleSettingsModal show={showScheduleModal} onClose={() => setShowScheduleModal(false)} />
    </div>
  );
};

export default Appointments;
