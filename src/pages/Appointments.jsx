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

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;

  const weekLabel = `${weekStart.toLocaleDateString('ar', { day: 'numeric', month: 'short' })} — ${addDays(weekStart, 6).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}`;
  const dayLabel = dayAnchor.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tone = selected ? (STATUS_COLORS[selected.status] || STATUS_COLORS.pending) : null;
  const pick = (apt) => {
    setSelected(apt);
    setReschedule({ date: apt.date, time: apt.time });
    if (apt.date) setDayAnchor(new Date(`${apt.date}T12:00:00`));
  };

  const pill = (on) => `inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold ${on ? 'bg-[#10b981] text-white shadow-sm' : 'bg-white text-[#3d4947] shadow-sm'}`;
  const card = 'bg-white rounded-2xl shadow-[0_8px_30px_-12px_rgba(20,27,43,0.18)]';
  const bookedHours = [...new Set(visibleApts.map((a) => parseHourFromLabel(a.time)).filter((h) => h != null))].sort((a, b) => a - b);
  const timelineHours = bookedHours.length
    ? Array.from({ length: bookedHours[bookedHours.length - 1] - bookedHours[0] + 1 }, (_, i) => bookedHours[0] + i)
    : [];
  const bookUrl = `${window.location.origin}/book/${clinicId}`;

  return (
    <div className="max-w-[1360px] mx-auto space-y-5 text-[#141b2b]">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs text-[#6d7a77]">{range === 'week' ? weekLabel : dayLabel}{branchName ? ` · ${branchName}` : ''}</p>
          <h1 className="text-[26px] font-extrabold tracking-tight mt-1">المواعيد</h1>
          <p className="text-sm text-[#6d7a77] mt-1">جدول الفريق وتأكيد الحضور من حجوزات العيادة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/appointments/schedule" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm text-sm font-bold">
            <FaClock /> جدول الدوام
          </Link>
          {hasCap('ops') && (
            <Link to="/appointments/reminders" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f3f0ff] text-[#6b4eff] text-sm font-bold">
              تذكيرات الغد
            </Link>
          )}
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#10b981] text-white text-sm font-bold hover:bg-[#059669]">
            + حجز موعد
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setTab('calendar'); setRange('day'); }} className={pill(tab === 'calendar' && range === 'day')}>تقويم الحجوزات</button>
        {hasCap('ops') && <Link to="/appointments/waitlist" className="inline-flex items-center px-3 py-2 rounded-full text-xs font-bold bg-[#f3f0ff] text-[#6b4eff]">قائمة الانتظار</Link>}
        {hasCap('ops') && <Link to="/appointments/gaps" className="inline-flex items-center px-3 py-2 rounded-full text-xs font-bold bg-sky-50 text-sky-700">سد الفراغات</Link>}
        <Link to="/appointments/attendance" className="inline-flex items-center px-3 py-2 rounded-full text-xs font-bold bg-rose-50 text-rose-600">سجل الحضور</Link>
        <Link to="/appointments/schedule" className="inline-flex items-center px-3 py-2 rounded-full text-xs font-bold bg-amber-50 text-amber-700">جدول المناوبات</Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'مواعيد اليوم', value: String(todayLive.length), note: `${pendingN} معلّق · ${attendedN} حضرت`, num: 'text-[#059669]', bar: 'bg-[#10b981]', width: '100%' },
          { label: 'نسبة التأكيد', value: todayLive.length ? `${confirmRate}%` : '—', note: 'من مواعيد اليوم غير الملغاة', num: 'text-[#059669]', bar: 'bg-[#10b981]', width: `${confirmRate}%` },
          { label: 'معلّقة', value: String(pendingN), note: 'بانتظار التأكيد', num: 'text-amber-700', bar: 'bg-amber-500', width: todayLive.length ? `${Math.round((pendingN / todayLive.length) * 100)}%` : '0%' },
          { label: 'حضرت', value: String(attendedN), note: branchName || 'من سجل اليوم', num: 'text-[#6b4eff]', bar: 'bg-[#6b4eff]', width: todayLive.length ? `${Math.round((attendedN / todayLive.length) * 100)}%` : '0%' },
        ].map((item) => (
          <div key={item.label} className={`${card} p-4`}>
            <p className="text-xs font-bold text-[#3d4947]">{item.label}</p>
            <p className={`text-[32px] font-extrabold leading-none mt-2 ${item.num}`}>{item.value}</p>
            <div className="mt-3 h-1.5 rounded-full bg-[#eef0ff] overflow-hidden">
              <div className={`h-full rounded-full ${item.bar}`} style={{ width: item.width }} />
            </div>
            <p className="text-[11px] text-[#6d7a77] mt-2">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => (range === 'week' ? setWeekAnchor(addDays(weekStart, -7)) : setDayAnchor(addDays(dayAnchor, -1)))} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center" aria-label="السابق"><FaChevronRight /></button>
          <span className="font-extrabold text-sm min-w-[14rem] text-center">{range === 'week' ? weekLabel : dayLabel}</span>
          <button type="button" onClick={() => (range === 'week' ? setWeekAnchor(addDays(weekStart, 7)) : setDayAnchor(addDays(dayAnchor, 1)))} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center" aria-label="التالي"><FaChevronLeft /></button>
          <button type="button" onClick={() => { setDayAnchor(new Date()); setWeekAnchor(startOfWeek(new Date())); }} className="px-3 py-2 rounded-full bg-[#10b981] text-white text-sm font-bold">اليوم</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white shadow-sm text-sm font-bold">
            <option value="all">كل الفريق</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {dayApts.some((a) => !a.specialistId) && <option value="none">بدون تعيين</option>}
          </select>
          <button type="button" onClick={() => { setTab('calendar'); setRange('day'); }} className={pill(tab === 'calendar' && range === 'day')}>مقارنة الموارد</button>
          <button type="button" onClick={() => setTab('log')} className={pill(tab === 'log')}>قائمة تفصيلية</button>
          <button type="button" onClick={() => { setTab('calendar'); setRange('week'); }} className={pill(tab === 'calendar' && range === 'week')}>أسبوعي</button>
        </div>
      </div>
      <StatusLegend />

      {tab === 'log' && (
        <div className={`${card} overflow-hidden`}>
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
                <tr key={a.id} className="cursor-pointer hover:bg-[#FDFBF7]" onClick={() => pick(a)}>
                  <td className="font-bold">{a.customerName}</td>
                  <td>{a.service || '—'}</td>
                  <td>{a.date} · {a.time}</td>
                  <td>{a.specialistName || '—'}</td>
                  <td>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${(STATUS_COLORS[a.status] || STATUS_COLORS.pending).chip}`}>
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
          <div className={`${card} p-4 space-y-3`}>
            {timelineHours.length === 0 && (
              <div className="rounded-2xl bg-[#f7f8ff] p-8 text-center text-sm text-[#6d7a77]">لا مواعيد في هذا اليوم.</div>
            )}
            {timelineHours.map((h) => {
              const row = visibleApts.filter((a) => parseHourFromLabel(a.time) === h);
              return (
                <div key={h} className="grid grid-cols-[4.5rem_1fr] gap-3 items-start">
                  <div className="pt-3 text-center">
                    <p className="text-sm font-bold">{formatHourLabel(h).split(' ')[0]}</p>
                    <p className="text-[11px] text-[#8C93A0]">{formatHourLabel(h).split(' ')[1]}</p>
                  </div>
                  {row.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                      شاغر في هذا الوقت
                      {hasCap('ops') && <Link to="/appointments/gaps" className="block mt-1 font-bold text-[#059669]">فتح الفراغات</Link>}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {row.map((a) => {
                        const c = STATUS_COLORS[a.status] || STATUS_COLORS.pending;
                        return (
                          <button key={a.id} type="button" onClick={() => pick(a)} className="text-right rounded-2xl p-3 border-2 shadow-sm" style={{ background: c.bg, borderColor: selected?.id === a.id ? '#10b981' : c.border, color: c.text, boxShadow: `inset -4px 0 0 ${c.border}` }}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-sm">{a.customerName || 'عميلة'}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.chip}`}>{c.label}</span>
                            </div>
                            <p className="text-xs mt-2">{a.service || '—'}{a.specialistName ? ` · ${a.specialistName}` : ''}</p>
                            <p className="text-[11px] mt-1 font-bold">{a.time}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
        <aside className={`${card} p-4 space-y-3 lg:sticky lg:top-24`}>
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
                  <button type="button" onClick={() => handleStatus(selected, 'confirmed')} className="px-3 py-2 bg-[#10b981] text-white rounded-xl text-sm font-bold flex items-center gap-1">
                    <FaCheckCircle /> تأكيد
                  </button>
                )}
                {selected.status === 'rescheduled' && (
                  <button type="button" onClick={() => handleStatus(selected, 'confirmed')} className="px-3 py-2 bg-[#10b981] text-white rounded-xl text-sm font-bold">تأكيد الموعد الجديد</button>
                )}
                {['pending', 'confirmed', 'rescheduled'].includes(selected.status) && (
                  <>
                    <button type="button" onClick={() => handleStatus(selected, 'attended')} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold">حضر</button>
                    <button type="button" onClick={() => handleStatus(selected, 'noshow')} className="px-3 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold">لم يحضر</button>
                    <button type="button" onClick={() => handleStatus(selected, 'cancelled')} className="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold">إلغاء</button>
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
                <div className="border-t border-[#E8E4DC] pt-3 space-y-2">
                  <p className="text-xs font-bold">إعادة جدولة</p>
                  <input type="date" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} className="w-full p-2 rounded-xl bg-[#FDFBF7] border border-[#E8E4DC] text-sm" />
                  <select value={reschedule.time} onChange={(e) => setReschedule({ ...reschedule, time: e.target.value })} className="w-full p-2 rounded-xl bg-[#FDFBF7] border border-[#E8E4DC] text-sm">
                    {hourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    {reschedule.time && !hourOptions.includes(reschedule.time) && <option value={reschedule.time}>{reschedule.time}</option>}
                  </select>
                  <button type="button" onClick={saveReschedule} className="w-full py-2 rounded-xl bg-amber-400 text-amber-950 font-bold text-sm">حفظ كإعادة جدولة</button>
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
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3 border border-[#E8E4DC]" dir="rtl">
            <h3 className="font-bold">سبب الإلغاء (اختياري)</h3>
            <p className="text-xs text-[#8C93A0]">لا تُفرض غرامة آلية. العربون إن وُجد يُراجع يدوياً.</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2.5 border border-[#E8E4DC] rounded-xl bg-[#FDFBF7]" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setCancelFor(null)} className="flex-1 py-2 bg-[#F4F1EA] rounded-xl font-bold">تراجع</button>
              <button type="button" onClick={confirmCancel} className="flex-1 py-2 bg-[#8C3A32] text-white rounded-xl font-bold">تأكيد الإلغاء</button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3 border border-[#E8E4DC]" dir="rtl">
            <h3 className="font-bold">حجز موعد</h3>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="اسم العميلة" className="w-full p-2.5 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7] text-sm" />
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="الهاتف" className="w-full p-2.5 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7] text-sm" dir="ltr" />
            <input value={draft.service} onChange={(e) => setDraft({ ...draft, service: e.target.value })} placeholder="الخدمة" className="w-full p-2.5 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7] text-sm" />
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7] text-sm" />
            <select value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7] text-sm">
              {hourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCreating(false)} className="flex-1 py-2 bg-[#F4F1EA] rounded-xl font-bold">تراجع</button>
              <button type="button" onClick={createAppointment} className="flex-1 py-2 bg-[#10b981] text-white rounded-xl font-bold">حفظ</button>
            </div>
          </div>
        </div>
      )}

      <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs`}>
        <span className="text-[#6d7a77]">رابط الحجز للعميلات</span>
        <button type="button" onClick={() => navigator.clipboard.writeText(bookUrl).then(() => toast.success('تم نسخ الرابط'))} className="font-bold text-[#059669]" dir="ltr">{bookUrl}</button>
      </div>

      {historyFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setHistoryFor(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md text-sm border border-[#E8E4DC]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">سجل {historyFor.customerName}</h3>
            {(historyFor.history || []).slice().reverse().map((h, i) => (
              <p key={i} className="py-1 text-[#6B7280]">{new Date(h.at).toLocaleString('ar')} — {h.action} {h.reason || h.from || ''} {h.to ? `→ ${h.to}` : ''}</p>
            ))}
            {!(historyFor.history || []).length && <p className="text-[#8C93A0]">لا سجل بعد</p>}
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
