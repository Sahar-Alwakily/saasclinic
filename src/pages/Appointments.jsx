import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WaitlistView, GapsView, RemindersView, AttendanceView } from './appointment/AppointmentViews';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaChevronRight, FaChevronLeft, FaClock, FaCheckCircle, FaWhatsapp, FaPhone } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import ScheduleSettingsModal from '../components/settings/ScheduleSettingsModal';
import WeeklyBoard, { StatusLegend, STATUS_COLORS } from '../components/appointments/WeeklyBoard';
import { runConsoleAction } from '../utils/consoleActions';
import {
  APT_STATUSES, appendHistory, releaseSlot, slotKey, manageUrl, waDigits, BOOKABLE_STATUSES,
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
  const [branches, setBranches] = useState([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', service: '', date: '', time: '' });

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
    const u4 = onValue(ref(database, clinicPath('branches')), (s) => {
      setBranches(s.val() ? Object.entries(s.val()).map(([id, item]) => ({ id, ...item })) : []);
    });
    return () => { u1(); u2(); u3(); u4(); };
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
  const scopedApts = range === 'day' ? dayApts : weekApts;
  const visibleApts = staffFilter === 'all'
    ? scopedApts
    : scopedApts.filter((a) => (a.specialistId || 'none') === staffFilter);
  const unplaced = visibleApts.filter((a) => parseHourFromLabel(a.time) == null);
  const todayLive = dayApts.filter((a) => a.status !== 'cancelled');
  const confirmedN = todayLive.filter((a) => ['confirmed', 'attended', 'rescheduled'].includes(a.status)).length;
  const confirmRate = todayLive.length ? Math.round((confirmedN / todayLive.length) * 100) : 0;
  const pendingN = dayApts.filter((a) => a.status === 'pending').length;
  const attendedN = dayApts.filter((a) => a.status === 'attended').length;
  const branchName = branches.find((b) => b?.name)?.name;

  const openCreate = () => {
    setDraft({ name: '', phone: '', service: '', date: dayStr, time: hourOptions[0] || '' });
    setCreating(true);
  };

  const createAppointment = async () => {
    if (!draft.name.trim() || !draft.date || !draft.time) {
      toast.error('الاسم والتاريخ والساعة مطلوبة');
      return;
    }
    const branch = branches.find((b) => b?.name) || branches[0];
    try {
      const res = await runConsoleAction({
        type: 'addAppointment',
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        service: draft.service.trim(),
        date: draft.date,
        time: draft.time,
        branchId: branch?.id || '',
        branchName: branch?.name || '',
      }, { clinicPath, clinicId });
      toast.success(res.answer || 'تسجّل الموعد');
      setCreating(false);
    } catch {
      toast.error('تعذّر تسجيل الموعد');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0FA3A3]" /></div>;

  const weekLabel = `${weekStart.toLocaleDateString('ar', { day: 'numeric', month: 'short' })} — ${addDays(weekStart, 6).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}`;
  const dayLabel = dayAnchor.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tone = selected ? (STATUS_COLORS[selected.status] || STATUS_COLORS.pending) : null;
  const pick = (apt) => {
    setSelected(apt);
    setReschedule({ date: apt.date, time: apt.time });
    if (apt.date) setDayAnchor(new Date(`${apt.date}T12:00:00`));
  };

  const card = 'rounded-xl border border-[#E4EAEE] bg-white';
  const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
  const seg = (on) => `rounded-md px-3 py-1.5 text-[11.5px] font-bold transition-colors ${on ? 'bg-[#ECFEFF] text-[#0E7490]' : 'text-[#64748B] hover:text-[#334155]'}`;
  const bookedHours = [...new Set(visibleApts.map((a) => parseHourFromLabel(a.time)).filter((h) => h != null))].sort((a, b) => a - b);
  const timelineHours = bookedHours.length
    ? Array.from({ length: bookedHours[bookedHours.length - 1] - bookedHours[0] + 1 }, (_, i) => bookedHours[0] + i)
    : [];
  const bookUrl = `${window.location.origin}/book/${clinicId}`;

  return (
    <div className="max-w-[1360px] mx-auto space-y-5 text-[#0F172A]">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">{range === 'week' ? weekLabel : dayLabel}{branchName ? ` · ${branchName}` : ''}</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">المواعيد</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">جدول الفريق وتأكيد الحضور من حجوزات العيادة.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/appointments/schedule" className={ghost}>
            <FaClock className="text-[11px] text-[#94A3B8]" /> جدول الدوام
          </Link>
          {hasCap('ops') && (
            <Link to="/appointments/reminders" className="inline-flex items-center gap-2 rounded-lg border border-[#C6EEEE] bg-[#ECFEFF] px-3 py-2 text-[13px] font-bold text-[#0E7490] transition-colors hover:border-[#0FA3A3]">
              تذكيرات الغد
            </Link>
          )}
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#047857]">
            + حجز موعد
          </button>
        </div>
      </header>

      <nav aria-label="اختصارات المواعيد" className="flex flex-wrap items-center gap-2">
        {hasCap('ops') && (
          <Link to="/appointments/waitlist" className="inline-flex items-center gap-1.5 rounded-full border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B45309]" /> قائمة الانتظار
          </Link>
        )}
        {hasCap('ops') && (
          <Link to="/appointments/gaps" className="inline-flex items-center gap-1.5 rounded-full border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0FA3A3]" /> سد الفراغات
          </Link>
        )}
        <Link to="/appointments/attendance" className="inline-flex items-center gap-1.5 rounded-full border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" /> سجل الحضور
        </Link>
        <Link to="/appointments/schedule" className="inline-flex items-center gap-1.5 rounded-full border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" /> جدول المناوبات
        </Link>
      </nav>

      <section aria-label="مؤشرات المواعيد" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {[
          { label: 'مواعيد اليوم', value: String(todayLive.length), note: `${pendingN} معلّق · ${attendedN} حضرت`, accent: '#059669', width: '100%' },
          { label: 'نسبة التأكيد', value: todayLive.length ? `${confirmRate}%` : '—', note: 'من مواعيد اليوم غير الملغاة', accent: '#0FA3A3', width: `${confirmRate}%` },
          { label: 'معلّقة', value: String(pendingN), note: 'بانتظار التأكيد', accent: '#B45309', width: todayLive.length ? `${Math.round((pendingN / todayLive.length) * 100)}%` : '0%' },
          { label: 'حضرت', value: String(attendedN), note: `من ${todayLive.length} موعد غير ملغى`, accent: '#059669', width: todayLive.length ? `${Math.round((attendedN / todayLive.length) * 100)}%` : '0%' },
        ].map((item, i) => (
          <div
            key={item.label}
            className={[
              'px-5 py-4',
              i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '',
              i > 1 ? 'border-t border-[#E4EAEE]' : '',
              'lg:border-t-0',
              i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : '',
            ].join(' ')}
          >
            <p className="text-[11px] text-[#64748B]">{item.label}</p>
            <p className="mt-1.5 text-[30px] font-light leading-none tabular-nums tracking-tight" style={{ color: item.accent }}>{item.value}</p>
            <p className="mt-1.5 truncate text-[10.5px] text-[#7C8A99]">{item.note}</p>
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[#E4EAEE]" dir="ltr">
              <div className="h-full rounded-full" style={{ width: item.width, background: item.accent }} />
            </div>
          </div>
        ))}
      </section>

      <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-3 py-2.5`}>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => (range === 'week' ? setWeekAnchor(addDays(weekStart, -7)) : setDayAnchor(addDays(dayAnchor, -1)))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]" aria-label="السابق"><FaChevronRight className="text-[11px]" /></button>
          <span className="min-w-[13rem] px-1 text-center text-[12.5px] font-bold tabular-nums">{range === 'week' ? weekLabel : dayLabel}</span>
          <button type="button" onClick={() => (range === 'week' ? setWeekAnchor(addDays(weekStart, 7)) : setDayAnchor(addDays(dayAnchor, 1)))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]" aria-label="التالي"><FaChevronLeft className="text-[11px]" /></button>
          <button type="button" onClick={() => { setDayAnchor(new Date()); setWeekAnchor(startOfWeek(new Date())); }} className="rounded-lg border border-[#E4EAEE] px-2.5 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">اليوم</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} aria-label="تصفية الفريق" className="h-8 rounded-lg border border-[#E4EAEE] bg-white px-2 text-[11.5px] font-bold text-[#334155] outline-none focus:border-[#0FA3A3]">
            <option value="all">كل الفريق</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {dayApts.some((a) => !a.specialistId) && <option value="none">بدون تعيين</option>}
          </select>
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E4EAEE] bg-white p-0.5">
            <button type="button" onClick={() => { setTab('calendar'); setRange('day'); }} className={seg(tab === 'calendar' && range === 'day')}>يومي</button>
            <button type="button" onClick={() => { setTab('calendar'); setRange('week'); }} className={seg(tab === 'calendar' && range === 'week')}>أسبوعي</button>
            <button type="button" onClick={() => setTab('log')} className={seg(tab === 'log')}>قائمة تفصيلية</button>
          </div>
        </div>
      </div>
      <StatusLegend />

      {tab === 'log' && (
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E4EAEE] text-[10.5px] font-bold tracking-wide text-[#94A3B8]">
                {['العميلة', 'الخدمة', 'الموعد', 'المختصة', 'الحالة'].map((h) => <th key={h} className="px-4 py-2.5 text-start font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F4]">
              {visibleApts.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-[#94A3B8]">لا حجوزات في هذه الفترة.</td></tr>
              )}
              {visibleApts.map((a) => (
                <tr key={a.id} className={`cursor-pointer transition-colors hover:bg-[#F4F7F8] ${selected?.id === a.id ? 'bg-[#F4F7F8]' : ''}`} onClick={() => pick(a)}>
                  <td className="px-4 py-2.5 font-bold text-[#0F172A]">{a.customerName}</td>
                  <td className="px-4 py-2.5 text-[#64748B]">{a.service || '—'}</td>
                  <td className="px-4 py-2.5 tabular-nums text-[#334155]">{a.date} · {a.time}</td>
                  <td className="px-4 py-2.5 text-[#64748B]">{a.specialistName || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${(STATUS_COLORS[a.status] || STATUS_COLORS.pending).chip}`}>
                      {APT_STATUSES.find((s) => s.id === a.status)?.label || a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'calendar' && (
      <div className={`grid gap-4 items-start ${selected ? 'lg:grid-cols-[1fr_20rem]' : ''}`}>
        {range === 'day' ? (
          <div className={`${card} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEE] px-5 py-3.5">
              <div>
                <h2 className="text-[14px] font-extrabold">تايم لاين اليوم</h2>
                <p className="mt-0.5 text-[11px] text-[#64748B]">{visibleApts.length} موعد · {timelineHours.length} ساعة معروضة</p>
              </div>
              {hasCap('ops') && (
                <Link to="/appointments/gaps" className="text-[11px] font-bold text-[#0E7490] hover:text-[#059669]">فتح الفراغات ←</Link>
              )}
            </div>
            {timelineHours.length === 0 && (
              <div className="px-5 py-12 text-center text-[12.5px] text-[#94A3B8]">لا مواعيد في هذا اليوم.</div>
            )}
            <div className="divide-y divide-[#EDF1F4]">
              {timelineHours.map((h) => {
                const row = visibleApts.filter((a) => parseHourFromLabel(a.time) === h);
                return (
                  <div key={h} className="grid grid-cols-[4.25rem_1fr] gap-3 px-4 py-2.5">
                    <div className="pt-1 text-center">
                      <p className="text-[12px] font-bold tabular-nums text-[#334155]">{formatHourLabel(h).split(' ')[0]}</p>
                      <p className="text-[10px] text-[#94A3B8]">{formatHourLabel(h).split(' ')[1]}</p>
                    </div>
                    {row.length === 0 ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-[#E4EAEE] bg-[#FAFCFC] px-3 py-2">
                        <span className="text-[11px] text-[#94A3B8]">شاغر في هذا الوقت</span>
                        {hasCap('ops') && <Link to="/appointments/gaps" className="text-[10.5px] font-bold text-[#0E7490] hover:text-[#059669]">فتح الفراغات ←</Link>}
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {row.map((a) => {
                          const c = STATUS_COLORS[a.status] || STATUS_COLORS.pending;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => pick(a)}
                              className="relative overflow-hidden rounded-lg border bg-white px-3 py-2.5 text-start transition-colors hover:border-[#CBD5E1]"
                              style={{ borderColor: selected?.id === a.id ? c.accent : '#E4EAEE', boxShadow: selected?.id === a.id ? `0 0 0 1px ${c.accent}` : 'none' }}
                            >
                              <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: c.accent }} />
                              <div className="flex items-start justify-between gap-2 ps-1.5">
                                <p className="truncate text-[13px] font-bold text-[#0F172A]">{a.customerName || 'عميلة'}</p>
                                <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold" style={{ background: c.soft, color: c.ink, borderColor: c.softBorder }}>{c.label}</span>
                              </div>
                              <p className="mt-1 truncate ps-1.5 text-[11px] text-[#64748B]">{a.service || '—'}{a.specialistName ? ` · ${a.specialistName}` : ''}</p>
                              <p className="mt-0.5 ps-1.5 text-[10.5px] font-bold tabular-nums text-[#94A3B8]">{a.time}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
        <aside className={`${card} overflow-hidden lg:sticky lg:top-24`} style={{ boxShadow: `inset 0 2px 0 ${tone.accent}` }}>
          <div className="flex items-start justify-between gap-2 border-b border-[#E4EAEE] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold text-[#0F172A]">{selected.customerName}</p>
              <p className="mt-0.5 text-[11px] tabular-nums text-[#64748B]">{selected.date} · {selected.time}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ background: tone.soft, color: tone.ink, borderColor: tone.softBorder }}>
                {APT_STATUSES.find((s) => s.id === selected.status)?.label || tone.label}
              </span>
              <button type="button" onClick={() => setSelected(null)} className="grid h-6 w-6 place-items-center rounded-md text-[#94A3B8] hover:bg-[#F4F7F8] hover:text-[#334155]" aria-label="إغلاق">✕</button>
            </div>
          </div>
          <div className="space-y-3 px-4 py-3">
            <dl className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">الخدمة</dt><dd className="truncate font-bold text-[#334155]">{selected.service || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">المختصة</dt><dd className="truncate text-[#334155]">{selected.specialistName || 'بدون تعيين'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">الفرع</dt><dd className="truncate text-[#334155]">{selected.branchName || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#94A3B8]">الهاتف</dt><dd className="flex items-center gap-1 truncate tabular-nums text-[#334155]" dir="ltr"><FaPhone className="text-[9px] text-[#94A3B8]" /> {selected.phoneNumber || '—'}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-1.5 border-t border-[#EDF1F4] pt-3">
              {selected.status === 'pending' && (
                <button type="button" onClick={() => handleStatus(selected, 'confirmed')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-[#047857]">
                  <FaCheckCircle className="text-[10px]" /> تأكيد
                </button>
              )}
              {selected.status === 'rescheduled' && (
                <button type="button" onClick={() => handleStatus(selected, 'confirmed')} className="rounded-lg bg-[#059669] px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-[#047857]">تأكيد الموعد الجديد</button>
              )}
              {BOOKABLE_STATUSES.includes(selected.status) && (
                <>
                  <button type="button" onClick={() => handleStatus(selected, 'attended')} className="rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] px-3 py-1.5 text-[11.5px] font-bold text-[#047857] transition-colors hover:border-[#059669]">حضر</button>
                  <button type="button" onClick={() => handleStatus(selected, 'noshow')} className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-1.5 text-[11.5px] font-bold text-[#DC2626] transition-colors hover:border-[#DC2626]">لم يحضر</button>
                  <button type="button" onClick={() => handleStatus(selected, 'cancelled')} className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#DC2626] transition-colors hover:border-[#F7D3D3]">إلغاء</button>
                </>
              )}
              {selected.manageToken && (
                <a href={manageUrl(clinicId, selected.manageToken)} target="_blank" rel="noreferrer" className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">رابط العميلة</a>
              )}
              <button type="button" onClick={() => setHistoryFor(selected)} className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">السجل</button>
              <button type="button" onClick={() => window.open(`https://wa.me/${waDigits(selected.phoneNumber)}`, '_blank')} aria-label="واتساب" className="grid h-8 w-8 place-items-center rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] text-[#059669] transition-colors hover:border-[#059669]">
                <FaWhatsapp />
              </button>
            </div>
            {BOOKABLE_STATUSES.includes(selected.status) && (
              <div className="space-y-2 border-t border-[#EDF1F4] pt-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#94A3B8]">إعادة جدولة</p>
                <input type="date" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#0FA3A3]" />
                <select value={reschedule.time} onChange={(e) => setReschedule({ ...reschedule, time: e.target.value })} className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#0FA3A3]">
                  {hourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  {reschedule.time && !hourOptions.includes(reschedule.time) && <option value={reschedule.time}>{reschedule.time}</option>}
                </select>
                <button type="button" onClick={saveReschedule} className="w-full rounded-lg border border-[#C6EEEE] bg-[#ECFEFF] py-1.5 text-[11.5px] font-bold text-[#0E7490] transition-colors hover:border-[#0FA3A3]">حفظ كإعادة جدولة</button>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
      )}

      {unplaced.length > 0 && (
        <p className="text-[11px] text-[#B45309]">{unplaced.length} حجز هذا الأسبوع بلا ساعة مقروءة — لن يظهر في الجدول.</p>
      )}

      {cancelFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl border border-[#E4EAEE] bg-white p-5" dir="rtl">
            <h3 className="text-[14px] font-extrabold">سبب الإلغاء (اختياري)</h3>
            <p className="text-[11px] text-[#94A3B8]">يُسجَّل السبب في سجل الموعد للرجوع إليه لاحقاً.</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب الإلغاء" className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setCancelFor(null)} className="flex-1 rounded-lg border border-[#E4EAEE] bg-white py-2 text-[12.5px] font-bold text-[#334155] hover:border-[#CBD5E1]">تراجع</button>
              <button type="button" onClick={confirmCancel} className="flex-1 rounded-lg bg-[#DC2626] py-2 text-[12.5px] font-bold text-white hover:bg-[#B91C1C]">تأكيد الإلغاء</button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4">
          <div className="w-full max-w-md space-y-2.5 rounded-xl border border-[#E4EAEE] bg-white p-5" dir="rtl">
            <h3 className="text-[14px] font-extrabold">حجز موعد</h3>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="اسم العميلة" className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]" />
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="الهاتف" className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]" dir="ltr" />
            <input value={draft.service} onChange={(e) => setDraft({ ...draft, service: e.target.value })} placeholder="الخدمة" className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]" />
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]" />
            <select value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]">
              {hourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setCreating(false)} className="flex-1 rounded-lg border border-[#E4EAEE] bg-white py-2 text-[12.5px] font-bold text-[#334155] hover:border-[#CBD5E1]">تراجع</button>
              <button type="button" onClick={createAppointment} className="flex-1 rounded-lg bg-[#059669] py-2 text-[12.5px] font-bold text-white hover:bg-[#047857]">حفظ</button>
            </div>
          </div>
        </div>
      )}

      <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[11.5px]`}>
        <span className="text-[#64748B]">رابط الحجز للعميلات</span>
        <button type="button" onClick={() => navigator.clipboard.writeText(bookUrl).then(() => toast.success('تم نسخ الرابط'))} className="font-bold tabular-nums text-[#0E7490] hover:text-[#059669]" dir="ltr">{bookUrl}</button>
      </div>

      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4" onClick={() => setHistoryFor(null)}>
          <div className="w-full max-w-md rounded-xl border border-[#E4EAEE] bg-white p-5 text-[12.5px]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-[14px] font-extrabold">سجل {historyFor.customerName}</h3>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {(historyFor.history || []).slice().reverse().map((h, i) => (
                <p key={i} className="border-b border-[#EDF1F4] pb-1.5 text-[11.5px] text-[#64748B] last:border-0">{new Date(h.at).toLocaleString('ar')} — {h.action} {h.reason || h.from || ''} {h.to ? `→ ${h.to}` : ''}</p>
              ))}
              {!(historyFor.history || []).length && <p className="text-[#94A3B8]">لا سجل بعد</p>}
            </div>
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
