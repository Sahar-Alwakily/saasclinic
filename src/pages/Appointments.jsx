import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaChevronRight, FaChevronLeft, FaClock, FaCheckCircle, FaWhatsapp, FaPhone } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import ScheduleSettingsModal from '../components/settings/ScheduleSettingsModal';
import WeeklyBoard, { StatusLegend, STATUS_COLORS } from '../components/appointments/WeeklyBoard';
import {
  APT_STATUSES, appendHistory, releaseSlot, slotKey, manageUrl, reminderBody, waDigits,
} from '../utils/appointmentOps';
import {
  startOfWeek, addDays, toYmd, hoursRangeFromSchedules, formatHourLabel, parseHourFromLabel,
} from '../utils/scheduleSlots';

const Appointments = () => {
  const { clinicPath, clinicId, clinicInfo, hasCap = () => false } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState('');
  const [historyFor, setHistoryFor] = useState(null);
  const [reschedule, setReschedule] = useState({ date: '', time: '' });

  useEffect(() => {
    if (!clinicPath) return undefined;
    const aptPath = clinicPath('appointments');
    const schPath = clinicPath('scheduleSettings');
    if (!aptPath) return undefined;
    const u1 = onValue(ref(database, aptPath), (snap) => {
      const val = snap.val();
      setAppointments(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    const u2 = schPath
      ? onValue(ref(database, schPath), (s) => setSchedules(s.val() || {}))
      : () => {};
    return () => { u1(); u2(); };
  }, [clinicPath]);

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => toYmd(addDays(weekStart, i))), [weekStart]);
  const weekApts = useMemo(
    () => appointments.filter((a) => weekDays.includes(a.date)),
    [appointments, weekDays],
  );
  const hours = useMemo(() => {
    const base = hoursRangeFromSchedules(schedules);
    let { start, end } = base;
    weekApts.forEach((a) => {
      const h = parseHourFromLabel(a.time);
      if (h == null) return;
      start = Math.min(start, h);
      end = Math.max(end, h + 1);
    });
    if (end <= start) return { start: 8, end: 20 };
    return { start, end };
  }, [schedules, weekApts]);

  const hourOptions = useMemo(() => {
    const list = [];
    for (let h = hours.start; h < hours.end; h += 1) list.push(formatHourLabel(h));
    return list;
  }, [hours]);

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
      setSelected((s) => (s?.id === apt.id ? { ...s, ...apt, status: newStatus } : s));
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
    setSelected(null);
  };

  const saveReschedule = async () => {
    if (!selected || !reschedule.date || !reschedule.time) {
      toast.error('اختاري تاريخاً وساعة');
      return;
    }
    try {
      await releaseSlot(database, clinicId, slotKey(selected.branchId, selected.specialistId, selected.date, selected.time), selected.id);
      await patch(selected, {
        date: reschedule.date,
        time: reschedule.time,
        status: 'rescheduled',
      }, { action: 'rescheduled', by: 'staff', from: `${selected.date} ${selected.time}`, to: `${reschedule.date} ${reschedule.time}` });
      toast.success('أُعيدت جدولة الموعد');
      setSelected({ ...selected, date: reschedule.date, time: reschedule.time, status: 'rescheduled' });
    } catch {
      toast.error('تعذّرت إعادة الجدولة');
    }
  };

  const unplaced = weekApts.filter((a) => parseHourFromLabel(a.time) == null);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4d7cff]" /></div>;

  const weekLabel = `${weekStart.toLocaleDateString('ar', { day: 'numeric', month: 'short' })} — ${addDays(weekStart, 6).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}`;
  const tone = selected ? (STATUS_COLORS[selected.status] || STATUS_COLORS.pending) : null;

  return (
    <div className="space-y-4">
      <ToastContainer position="top-left" rtl />
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-product text-2xl md:text-3xl">تقويم الحجوزات</h1>
          <p className="text-stone-500 text-sm mt-1">أسبوع حسب ساعات الجدول — اللون يبيّن حالة الموعد</p>
        </div>
        <div className="flex gap-2">
          {hasCap('ops') && <Link to="/ops" className="px-4 py-2.5 rounded-xl bg-[#4d7cff]/10 text-[#4d7cff] font-bold text-sm">ملء الفراغ</Link>}
          <button type="button" onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 bg-[#14121c] text-white px-4 py-2.5 rounded-xl font-medium text-sm">
            <FaClock /> ساعات الجدول
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekAnchor(addDays(weekStart, -7))} className="w-10 h-10 rounded-xl bg-white border border-[#e4ddd0] flex items-center justify-center" aria-label="الأسبوع السابق">
            <FaChevronRight />
          </button>
          <button type="button" onClick={() => setWeekAnchor(startOfWeek(new Date()))} className="px-3 py-2 rounded-xl bg-white border border-[#e4ddd0] text-sm font-bold">هذا الأسبوع</button>
          <button type="button" onClick={() => setWeekAnchor(addDays(weekStart, 7))} className="w-10 h-10 rounded-xl bg-white border border-[#e4ddd0] flex items-center justify-center" aria-label="الأسبوع التالي">
            <FaChevronLeft />
          </button>
          <span className="font-bold text-sm">{weekLabel}</span>
        </div>
        <StatusLegend />
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-4 items-start">
        <WeeklyBoard
          weekStart={weekStart}
          hourStart={hours.start}
          hourEnd={hours.end}
          appointments={weekApts}
          selectedId={selected?.id}
          onSelect={(apt) => {
            setSelected(apt);
            setReschedule({ date: apt.date, time: apt.time });
          }}
        />

        <aside className="saas-card p-4 space-y-3 lg:sticky lg:top-24">
          {!selected && <p className="text-sm text-stone-400">اضغطي حجزاً في الجدول لفتح التأكيد أو الإلغاء أو إعادة الجدولة.</p>}
          {selected && (
            <>
              <div className="rounded-xl p-3 text-sm" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.text }}>
                <p className="font-bold">{selected.customerName}</p>
                <p className="text-xs mt-1">{selected.date} · {selected.time}</p>
                <p className="text-xs">{selected.service}{selected.branchName ? ` · ${selected.branchName}` : ''}</p>
                <p className="text-xs font-bold mt-1">{APT_STATUSES.find((s) => s.id === selected.status)?.label}</p>
              </div>
              <p className="text-xs text-stone-500 flex items-center gap-1" dir="ltr"><FaPhone className="text-[10px]" /> {selected.phoneNumber}</p>
              <div className="flex flex-wrap gap-2">
                {selected.status === 'pending' && (
                  <button type="button" onClick={() => handleStatus(selected, 'confirmed')} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold flex items-center gap-1">
                    <FaCheckCircle /> تأكيد
                  </button>
                )}
                {selected.status === 'rescheduled' && (
                  <button type="button" onClick={() => handleStatus(selected, 'confirmed')} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold">تأكيد الموعد الجديد</button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(selected.status) && (
                  <>
                    <button type="button" onClick={() => handleStatus(selected, 'attended')} className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-sm">حضر</button>
                    <button type="button" onClick={() => handleStatus(selected, 'noshow')} className="px-3 py-2 bg-orange-50 text-orange-800 rounded-lg text-sm">لم يحضر</button>
                    <button type="button" onClick={() => handleStatus(selected, 'cancelled')} className="px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm">إلغاء</button>
                  </>
                )}
                {selected.manageToken && (
                  <a href={manageUrl(clinicId, selected.manageToken)} target="_blank" rel="noreferrer" className="px-3 py-2 text-xs font-bold">رابط العميلة</a>
                )}
                <button type="button" onClick={() => setHistoryFor(selected)} className="px-3 py-2 text-xs">السجل</button>
                <button type="button" onClick={() => window.open(`https://wa.me/${waDigits(selected.phoneNumber)}`, '_blank')} className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                  <FaWhatsapp />
                </button>
              </div>
              {['pending', 'confirmed', 'rescheduled'].includes(selected.status) && (
                <div className="border-t border-[#e4ddd0] pt-3 space-y-2">
                  <p className="text-xs font-bold">إعادة جدولة</p>
                  <input type="date" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} className="w-full p-2 rounded-xl bg-[#f3efe6] text-sm" />
                  <select value={reschedule.time} onChange={(e) => setReschedule({ ...reschedule, time: e.target.value })} className="w-full p-2 rounded-xl bg-[#f3efe6] text-sm">
                    {hourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    {reschedule.time && !hourOptions.includes(reschedule.time) && <option value={reschedule.time}>{reschedule.time}</option>}
                  </select>
                  <button type="button" onClick={saveReschedule} className="w-full py-2 rounded-xl bg-[#eab308] text-[#854d0e] font-bold text-sm">حفظ كإعادة جدولة (أصفر)</button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {unplaced.length > 0 && (
        <p className="text-xs text-amber-700">{unplaced.length} حجز هذا الأسبوع بلا ساعة مقروءة — لن يظهر في الجدول.</p>
      )}

      {cancelFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md space-y-3" dir="rtl">
            <h3 className="font-bold">سبب الإلغاء (اختياري)</h3>
            <p className="text-xs text-gray-400">لا تُفرض غرامة آلية. العربون إن وُجد يُراجع يدوياً.</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-700" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setCancelFor(null)} className="flex-1 py-2 bg-gray-100 rounded-xl">تراجع</button>
              <button type="button" onClick={confirmCancel} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-bold">تأكيد الإلغاء</button>
            </div>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setHistoryFor(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md text-sm" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">سجل {historyFor.customerName}</h3>
            {(historyFor.history || []).slice().reverse().map((h, i) => (
              <p key={i} className="py-1 text-gray-600 dark:text-gray-300">{new Date(h.at).toLocaleString('ar')} — {h.action} {h.reason || h.from || ''} {h.to ? `→ ${h.to}` : ''}</p>
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
