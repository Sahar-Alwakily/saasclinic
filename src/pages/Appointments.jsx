import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WaitlistView, GapsView, RemindersView, AttendanceView } from './appointment/AppointmentViews';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaChevronRight, FaChevronLeft, FaClock, FaCheckCircle, FaWhatsapp, FaPhone } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import ScheduleSettingsModal from '../components/settings/ScheduleSettingsModal';
import WeeklyBoard, { ResourceDayBoard, StatusLegend, STATUS_COLORS } from '../components/appointments/WeeklyBoard';
import {
  APT_STATUSES, appendHistory, releaseSlot, slotKey, manageUrl, waDigits,
} from '../utils/appointmentOps';
import { deliverAppointmentReminder } from '../utils/sendClinicWaReminder';
import {
  startOfWeek, addDays, toYmd, hoursRangeFromSchedules, formatHourLabel, parseHourFromLabel,
} from '../utils/scheduleSlots';

const AppointmentsCalendar = () => {
  const { clinicPath, clinicId, clinicInfo, hasCap = () => false } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState('');
  const [historyFor, setHistoryFor] = useState(null);
  const [reschedule, setReschedule] = useState({ date: '', time: '' });
  const [tab, setTab] = useState('calendar');
  const [range, setRange] = useState('day');
  const [dayAnchor, setDayAnchor] = useState(() => new Date());
  const [staffFilter, setStaffFilter] = useState('all');
  const [staff, setStaff] = useState([]);

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
    const u3 = onValue(ref(database, clinicPath('users')), (s) => {
      const all = s.val() ? Object.entries(s.val()).map(([id, item]) => ({ id, ...item })) : [];
      setStaff(all.filter((u) => u.role !== 'admin'));
    });
    return () => { u1(); u2(); u3(); };
  }, [clinicPath]);

  const weekStart = useMemo(() => startOfWeek(range === 'week' ? weekAnchor : dayAnchor), [weekAnchor, dayAnchor, range]);
  const dayStr = useMemo(() => toYmd(dayAnchor), [dayAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => toYmd(addDays(weekStart, i))), [weekStart]);
  const weekApts = useMemo(
    () => appointments.filter((a) => weekDays.includes(a.date)),
    [appointments, weekDays],
  );
  const hours = useMemo(() => {
    const base = hoursRangeFromSchedules(schedules);
    let { start, end } = base;
    const source = range === 'day' ? appointments.filter((a) => a.date === dayStr) : weekApts;
    source.forEach((a) => {
      const h = parseHourFromLabel(a.time);
      if (h == null) return;
      start = Math.min(start, h);
      end = Math.max(end, h + 1);
    });
    if (end <= start) return { start: 8, end: 20 };
    return { start, end };
  }, [schedules, weekApts, appointments, dayStr, range]);

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
      if (newStatus === 'confirmed' && apt.phoneNumber) {
        await deliverAppointmentReminder({
          clinicId,
          clinicName: clinicInfo?.name,
          apt: { ...apt, status: 'confirmed' },
          eventId: 'confirm',
          hoursKey: 'confirm',
        });
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
      price: 0,
      createdAt: Date.now(),
      open: true,
    });
    await deliverAppointmentReminder({
      clinicId,
      clinicName: clinicInfo?.name,
      apt: { ...cancelFor, status: 'cancelled' },
      eventId: 'cancel',
      hoursKey: 'cancelled',
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
      const next = { ...selected, date: reschedule.date, time: reschedule.time, status: 'rescheduled' };
      await deliverAppointmentReminder({
        clinicId,
        clinicName: clinicInfo?.name,
        apt: next,
        eventId: 'reschedule',
        hoursKey: 'rescheduled',
      });
      toast.success('أُعيدت جدولة الموعد');
      setSelected(next);
    } catch {
      toast.error('تعذّرت إعادة الجدولة');
    }
  };

  const dayApts = useMemo(
    () => appointments.filter((a) => a.date === dayStr),
    [appointments, dayStr],
  );
  const staffCols = useMemo(() => {
    const fromUsers = staff.map((s) => ({ id: s.id, name: s.name || 'موظفة', branch: s.branch }));
    const extraIds = [...new Set(dayApts.map((a) => a.specialistId).filter(Boolean))]
      .filter((id) => !fromUsers.some((s) => s.id === id));
    const extras = extraIds.map((id) => {
      const apt = dayApts.find((a) => a.specialistId === id);
      return { id, name: apt?.specialistName || 'موظفة', branch: apt?.branchId };
    });
    const cols = [...fromUsers, ...extras];
    if (dayApts.some((a) => !a.specialistId)) cols.push({ id: '', name: 'بدون تعيين' });
    if (staffFilter !== 'all') return cols.filter((s) => (s.id || 'none') === staffFilter);
    return cols.length ? cols : [{ id: '', name: 'العيادة' }];
  }, [staff, dayApts, staffFilter]);
  const scopedApts = range === 'day' ? dayApts : weekApts;
  const visibleApts = staffFilter === 'all'
    ? scopedApts
    : scopedApts.filter((a) => (a.specialistId || 'none') === staffFilter);
  const unplaced = visibleApts.filter((a) => parseHourFromLabel(a.time) == null);
  const totalVisible = visibleApts.filter((a) => a.status !== 'cancelled').length;

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#111827]" /></div>;

  const weekLabel = `${weekStart.toLocaleDateString('ar', { day: 'numeric', month: 'short' })} — ${addDays(weekStart, 6).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}`;
  const dayLabel = dayAnchor.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tone = selected ? (STATUS_COLORS[selected.status] || STATUS_COLORS.pending) : null;
  const pick = (apt) => {
    setSelected(apt);
    setReschedule({ date: apt.date, time: apt.time });
    if (apt.date) setDayAnchor(new Date(`${apt.date}T12:00:00`));
  };

  return (
    <div className="space-y-4">
      <ToastContainer position="top-left" rtl />
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-[22px] font-bold text-[#111827]">تقويم الحجوزات</h1>
        <div className="flex flex-wrap gap-2">
          {hasCap('ops') && (
            <>
              <Link to="/appointments/waitlist" className="nura-chip nura-chip-lilac">قائمة الانتظار</Link>
              <Link to="/appointments/gaps" className="nura-chip nura-chip-sky">المواعيد المتاحة</Link>
              <Link to="/appointments/reminders" className="nura-chip nura-chip-gold">التذكيرات</Link>
            </>
          )}
          <Link to="/appointments/attendance" className="nura-chip nura-chip-rose">الحضور</Link>
          <Link to="/appointments/schedule" className="flex items-center gap-2 bg-[#111827] text-white px-3 py-2 rounded-2xl font-bold text-sm">
            <FaClock /> الدوام
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[#ebeef2]">
        <button type="button" onClick={() => setTab('calendar')} className={`px-4 py-2.5 text-sm font-bold ${tab === 'calendar' ? 'text-[#059669] border-b-2 border-[#10b981]' : 'text-[#9ca3af]'}`}>التقويم</button>
        <button type="button" onClick={() => setTab('log')} className={`px-4 py-2.5 text-sm font-bold ${tab === 'log' ? 'text-[#059669] border-b-2 border-[#10b981]' : 'text-[#9ca3af]'}`}>سجل الحجوزات</button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[#ebeef2] rounded-2xl px-3 py-2">
            <span className="w-8 h-8 rounded-xl bg-[#111827] text-white text-sm font-bold flex items-center justify-center">{dayAnchor.getDate()}</span>
            <span className="text-lg font-bold text-[#111827]">{totalVisible}</span>
            <span className="text-xs text-[#8a9199]">موعد</span>
          </div>
          <button
            type="button"
            onClick={() => { setDayAnchor(new Date()); setWeekAnchor(startOfWeek(new Date())); }}
            className="px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm font-bold"
          >
            اليوم
          </button>
          <button
            type="button"
            onClick={() => (range === 'week' ? setWeekAnchor(addDays(weekStart, -7)) : setDayAnchor(addDays(dayAnchor, -1)))}
            className="w-9 h-9 rounded-full bg-white border border-[#ebeef2] flex items-center justify-center"
            aria-label="السابق"
          >
            <FaChevronRight />
          </button>
          <span className="font-bold text-sm text-[#111827] min-w-[12rem] text-center">{range === 'week' ? weekLabel : dayLabel}</span>
          <button
            type="button"
            onClick={() => (range === 'week' ? setWeekAnchor(addDays(weekStart, 7)) : setDayAnchor(addDays(dayAnchor, 1)))}
            className="w-9 h-9 rounded-full bg-white border border-[#ebeef2] flex items-center justify-center"
            aria-label="التالي"
          >
            <FaChevronLeft />
          </button>
          <div className="flex bg-emerald-50 rounded-full p-1">
            <button
              type="button"
              onClick={() => {
                setRange('day');
                if (selected?.date) setDayAnchor(new Date(`${selected.date}T12:00:00`));
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold ${range === 'day' ? 'bg-[#10b981] text-white shadow-sm' : 'text-[#047857]'}`}
            >
              يوم
            </button>
            <button type="button" onClick={() => setRange('week')} className={`px-3 py-1 rounded-full text-xs font-bold ${range === 'week' ? 'bg-[#10b981] text-white shadow-sm' : 'text-[#047857]'}`}>أسبوع</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-white border border-[#ebeef2] text-sm font-bold"
          >
            <option value="all">كل الفريق</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {dayApts.some((a) => !a.specialistId) && <option value="none">بدون تعيين</option>}
          </select>
          <StatusLegend />
        </div>
      </div>

      {tab === 'log' && (
        <div className="saas-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['العميلة', 'الخدمة', 'الموعد', 'المختصة', 'الحالة'].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleApts.length === 0 && (
                <tr><td colSpan={5} className="text-center text-[#8a9199] py-10">لا حجوزات في هذه الفترة.</td></tr>
              )}
              {visibleApts.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-[#f8fafb]" onClick={() => pick(a)}>
                  <td className="font-bold">{a.customerName}</td>
                  <td>{a.service || '—'}</td>
                  <td>{a.date} · {a.time}</td>
                  <td>{a.specialistName || '—'}</td>
                  <td>{APT_STATUSES.find((s) => s.id === a.status)?.label || a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'calendar' && (
      <div className={`grid gap-4 items-start ${selected ? 'lg:grid-cols-[1fr_20rem]' : ''}`}>
        {range === 'day' ? (
          <ResourceDayBoard
            dateStr={dayStr}
            hourStart={hours.start}
            hourEnd={hours.end}
            appointments={visibleApts}
            staff={staffCols}
            schedules={schedules}
            selectedId={selected?.id}
            onSelect={pick}
          />
        ) : (
          <WeeklyBoard
            weekStart={weekStart}
            hourStart={hours.start}
            hourEnd={hours.end}
            appointments={visibleApts}
            selectedId={selected?.id}
            onSelect={pick}
          />
        )}

        {selected && (
        <aside className="saas-card p-4 space-y-3 lg:sticky lg:top-24">
              <div className="rounded-xl p-3 text-sm" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.text }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{selected.customerName}</p>
                  <button type="button" onClick={() => setSelected(null)} className="text-xs opacity-60" aria-label="إغلاق">✕</button>
                </div>
                <p className="text-xs mt-1">{selected.date} · {selected.time}</p>
                <p className="text-xs">{selected.service}{selected.branchName ? ` · ${selected.branchName}` : ''}</p>
                {selected.specialistName && <p className="text-xs mt-0.5">{selected.specialistName}</p>}
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
                <div className="border-t border-[#E5E9EC] pt-3 space-y-2">
                  <p className="text-xs font-bold">إعادة جدولة</p>
                  <input type="date" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} className="w-full p-2 rounded-xl bg-[#F7F8F6] text-sm" />
                  <select value={reschedule.time} onChange={(e) => setReschedule({ ...reschedule, time: e.target.value })} className="w-full p-2 rounded-xl bg-[#F7F8F6] text-sm">
                    {hourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    {reschedule.time && !hourOptions.includes(reschedule.time) && <option value={reschedule.time}>{reschedule.time}</option>}
                  </select>
                  <button type="button" onClick={saveReschedule} className="w-full py-2 rounded-xl bg-[#eab308] text-[#854d0e] font-bold text-sm">حفظ كإعادة جدولة (أصفر)</button>
                </div>
              )}
        </aside>
        )}
      </div>
      )}

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

    </div>
  );
};

const Appointments = () => {
  const { pathname } = useLocation();
  if (pathname === '/appointments/waitlist') return <WaitlistView />;
  if (pathname === '/appointments/gaps') return <GapsView />;
  if (pathname === '/appointments/reminders') return <RemindersView />;
  if (pathname === '/appointments/attendance') return <AttendanceView />;
  if (pathname === '/appointments/schedule') return <ScheduleSettingsModal embedded />;
  return <AppointmentsCalendar />;
};

export default Appointments;
