import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import {
  clinicHealth, dailyTasks, interventionAlerts, siteStatus, occupancyInsights, toYmd, hourFromTime,
} from '../utils/clinicInsights';
import { APT_STATUSES } from '../utils/appointmentOps';
import { parseTime } from '../utils/timeParse';

// لوحة سريرية باردة: أخضر + تركواز + أحمر، بلا بيج أو تدرجات دافئة.
const GREEN = '#059669';
const GREEN_SOFT = '#10B981';
const TEAL = '#0FA3A3';
const RED = '#DC2626';
const AMBER = '#B45309';

// تسميات الحالات من المصدر الواحد (APT_STATUSES) + ألوان الشرائح محلية
const APT_CLS = {
  pending: 'bg-[#FFFBEB] text-[#B45309] border-[#F3E2C2]',
  confirmed: 'bg-[#ECFDF5] text-[#047857] border-[#C9EEE0]',
  cancelled: 'bg-[#FEF2F2] text-[#DC2626] border-[#F7D3D3]',
  attended: 'bg-[#ECFDF5] text-[#047857] border-[#C9EEE0]',
  noshow: 'bg-[#FEF2F2] text-[#DC2626] border-[#F7D3D3]',
  rescheduled: 'bg-[#ECFEFF] text-[#0E7490] border-[#C8EDF2]',
};
const APT_STATUS = Object.fromEntries(
  APT_STATUSES.map((s) => [s.id, { label: s.short, cls: APT_CLS[s.id] || 'bg-slate-50 text-slate-500 border-slate-200' }]),
);

const APT_ACCENT = {
  confirmed: GREEN,
  attended: GREEN,
  pending: '#D97706',
  cancelled: RED,
  noshow: RED,
  rescheduled: TEAL,
};

const panel = 'rounded-xl border border-[#E4EAEE] bg-white';
const linkTone = 'font-bold text-[#0FA3A3] hover:text-[#059669]';

const Dashboard = () => {
  const { clinicInfo, clinicPath, clinicId, loadingClinic, userRole, userCategory, hasCap } = useClinic();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [branches, setBranches] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [messages, setMessages] = useState([]);
  const [blog, setBlog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');
  const [targetError, setTargetError] = useState('');

  useEffect(() => {
    if (loadingClinic || !clinicId || !clinicPath) return undefined;
    const appointmentsPath = clinicPath('appointments');
    if (!appointmentsPath) return undefined;
    setLoadingData(true);
    const fail = () => setLoadingData(false);
    const unsubs = [
      onValue(ref(database, appointmentsPath), (snap) => {
        let all = snap.val() ? Object.entries(snap.val()).map(([id, item]) => ({ id, ...item })) : [];
        if (userRole === 'worker' && userCategory) {
          all = all.filter((apt) => apt.category === userCategory);
        }
        setAppointments(all);
        setLoadingData(false);
      }, fail),
      onValue(ref(database, clinicPath('customers')), (snap) => {
        setCustomers(snap.val() ? Object.entries(snap.val()).map(([id, item]) => ({ id, ...item })) : []);
      }, fail),
      onValue(ref(database, clinicPath('services')), (snap) => {
        setServices(snap.val() ? Object.entries(snap.val()).map(([id, item]) => ({ id, ...item })) : []);
      }, fail),
      onValue(ref(database, clinicPath('scheduleSettings')), (s) => setSchedules(s.val() || {}), fail),
      onValue(ref(database, clinicPath('branches')), (s) => setBranches(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('waitlist')), (s) => setWaitlist(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('blog')), (s) => setBlog(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('products')), (s) => setProducts(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setSettings(s.val()), fail),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicPath, clinicId, loadingClinic, userRole, userCategory]);

  const health = useMemo(() => clinicHealth({ appointments, customers }), [appointments, customers]);
  const tasks = useMemo(
    () => dailyTasks({ appointments, schedules, branches, messages, settings }),
    [appointments, schedules, branches, messages, settings],
  );
  const alerts = useMemo(
    () => interventionAlerts({ appointments, customers, waitlist, tasks, health }),
    [appointments, customers, waitlist, tasks, health],
  );
  const site = useMemo(
    () => siteStatus({ clinicInfo, clinicId, services, blog }),
    [clinicInfo, clinicId, services, blog],
  );
  const occupancy = useMemo(
    () => occupancyInsights({ appointments, schedules, branches }),
    [appointments, schedules, branches],
  );

  if (loadingClinic || loadingData) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="جاري التحميل">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0FA3A3]" />
      </div>
    );
  }

  const score = health.score;
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const who = clinicInfo?.ownerName || clinicInfo?.name || 'وَرَف';
  const dateLabel = now.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });
  const branchLabel = branches.map((b) => b?.name).filter(Boolean).join(' · ');
  const todayYmd = toYmd(new Date());
  const todayApts = appointments.filter((a) => a.date === todayYmd);
  const pendingToday = todayApts.filter((a) => a.status === 'pending').length;
  const cancelledToday = todayApts.filter((a) => a.status === 'cancelled').length;
  const attendRate = health.curr?.attendRate;
  const visibleAlerts = alerts.filter((a) => {
    if (a.to === '/ops' && !hasCap('ops')) return false;
    if (a.to === '/winback' && !hasCap('winback')) return false;
    return true;
  });

  // ----- هدف الشهر (حجوزات فقط) -----
  const monthlyTarget = Number(settings?.dashboardBookingTarget) || 0;
  const monthTotal = health.curr?.total ?? 0;
  const targetPct = monthlyTarget ? Math.min(100, Math.round((monthTotal / monthlyTarget) * 100)) : 0;

  const saveTarget = async () => {
    const value = Math.round(Number(targetDraft));
    if (!Number.isFinite(value) || value <= 0) {
      setTargetError('أدخلي رقماً أكبر من صفر');
      return;
    }
    try {
      await set(ref(database, clinicPath('appointmentSettings/dashboardBookingTarget')), value);
      setEditingTarget(false);
      setTargetError('');
    } catch {
      setTargetError('ما زمّت الحفظ — تحققي من الصلاحية');
    }
  };

  // ----- شريط المؤشرات -----
  const kpis = [
    {
      id: 'today',
      label: 'مواعيد اليوم',
      value: todayApts.length,
      note: `${pendingToday} معلّق · ${cancelledToday} ملغى`,
      accent: GREEN,
    },
    {
      id: 'month',
      label: 'حجوزات هذا الشهر',
      value: monthTotal,
      note: monthlyTarget ? `الهدف ${monthlyTarget} · ${targetPct}%` : 'بلا هدف بعد — حدّدي هدف الشهر',
      accent: TEAL,
    },
    {
      id: 'customers',
      label: 'العميلات',
      value: customers.length,
      note: 'مسجّلات في العيادة',
      accent: '#94A3B8',
    },
    {
      id: 'attend',
      label: 'صحة العيادة',
      value: score == null ? '—' : score,
      note: attendRate == null ? 'لا عيّنة حضور بعد' : `نسبة الحضور ${attendRate}%`,
      accent: score != null && score < 70 ? RED : GREEN_SOFT,
    },
  ];

  // ----- تايم لاين اليوم -----
  const hourMap = {};
  todayApts.forEach((a) => {
    const h = hourFromTime(a.time);
    if (h == null) return;
    (hourMap[h] = hourMap[h] || []).push(a);
  });
  const busyHours = Object.keys(hourMap).map(Number).sort((a, b) => a - b);
  const tlStart = busyHours.length ? Math.min(9, busyHours[0]) : 9;
  const tlEnd = busyHours.length ? Math.max(17, busyHours[busyHours.length - 1]) : 17;
  const tlHours = [];
  for (let h = tlStart; h <= tlEnd; h += 1) tlHours.push(h);
  const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`;

  // ----- النبض: الموعد الجاري والقادم -----
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const toTimed = (a) => {
    const h = hourFromTime(a.time);
    if (h == null) return null;
    const [, m] = parseTime(a.time);
    return { ...a, minutes: h * 60 + m };
  };
  const timed = todayApts
    .filter((a) => !['cancelled', 'noshow'].includes(a.status))
    .map(toTimed)
    .filter(Boolean)
    .sort((a, b) => a.minutes - b.minutes);
  const currentApt = timed.find((a) => a.status !== 'attended' && a.minutes <= minutesNow && minutesNow < a.minutes + 45);
  const nextApt = timed.find((a) => a.minutes > minutesNow);
  const minutesToNext = nextApt ? nextApt.minutes - minutesNow : null;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFirst = appointments
    .filter((a) => a.date === toYmd(tomorrow) && !['cancelled', 'noshow'].includes(a.status))
    .map(toTimed)
    .filter(Boolean)
    .sort((a, b) => a.minutes - b.minutes)[0];

  // ----- الطابور والمتجر -----
  const waiting = waitlist.filter((w) => w.status === 'waiting' || w.status === 'offered');
  const nextGap = (occupancy.lookahead || []).find((d) => d.gaps > 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const activeProducts = products.filter((p) => p.active !== false);
  const lowStock = activeProducts.filter((p) => Number(p.stock) <= 5);

  // ----- خريطة حرارة الازدحام (يوم × ساعة) -----
  const heatSince = new Date(now);
  heatSince.setDate(heatSince.getDate() - 60);
  const heatSinceYmd = toYmd(heatSince);
  const heatSample = appointments.filter((a) => a.status !== 'cancelled' && a.date >= heatSinceYmd && a.date <= todayYmd);
  const heatHours = occupancy.byHour.map((h) => h.hour);
  const heatMatrix = occupancy.byDay.map(() => heatHours.map(() => 0));
  heatSample.forEach((a) => {
    const h = hourFromTime(a.time);
    const d = new Date(`${a.date}T12:00:00`);
    if (h == null || Number.isNaN(d.getTime())) return;
    const hi = heatHours.indexOf(h);
    if (hi < 0) return;
    heatMatrix[d.getDay()][hi] += 1;
  });
  const heatMax = Math.max(1, ...heatMatrix.flat());

  const tallyBranch = (list) => {
    const row = { total: 0, pending: 0, attended: 0, noshow: 0, today: 0 };
    list.forEach((a) => {
      if (a.status === 'cancelled') return;
      row.total += 1;
      if (a.status === 'pending') row.pending += 1;
      if (a.status === 'attended') row.attended += 1;
      if (a.status === 'noshow') row.noshow += 1;
      if (a.date === todayYmd) row.today += 1;
    });
    return row;
  };
  const branchRows = branches.map((b) => ({
    id: b.id,
    name: b.name || 'فرع',
    address: b.address || '',
    phone: b.phone || '',
    ...tallyBranch(appointments.filter((a) => a.branchId === b.id || (b.name && a.branchName === b.name))),
  }));
  const weekBooked = (occupancy.lookahead || []).reduce((n, d) => n + d.booked, 0);
  const weekGaps = (occupancy.lookahead || []).reduce((n, d) => n + d.gaps, 0);

  const railTasks = [
    { to: '/appointments', label: 'بانتظار التأكيد', count: tasks.pending.length, tone: tasks.pending.length ? AMBER : GREEN },
    { to: '/appointments/attendance', label: 'غياب اليوم', count: tasks.noshowToday.length, tone: tasks.noshowToday.length ? RED : GREEN },
    ...(hasCap('ops') ? [{ to: '/appointments/gaps', label: 'مواعيد متاحة', count: tasks.gaps.length, tone: TEAL }] : []),
    ...(hasCap('winback') ? [{ to: '/winback', label: 'رسائل فاشلة', count: tasks.failed.length, tone: tasks.failed.length ? RED : GREEN }] : []),
  ];

  return (
    <div className="max-w-[1360px] mx-auto space-y-6 text-[#0F172A]">
      {/* ---------- ترويسة ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] text-[#64748B]">
            {dateLabel}{branchLabel ? ` · ${branchLabel}` : ''}
          </p>
          <h1 className="mt-1 text-[25px] font-extrabold tracking-tight">{greet}، {who}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#047857]"
          >
            جدول اليوم
          </Link>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-4 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0FA3A3]"
          >
            + حجز موعد
          </Link>
        </div>
      </header>

      {/* ---------- شريط المؤشرات ---------- */}
      <section aria-label="مؤشرات العيادة" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.id}
            className={[
              'px-5 py-4',
              i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '',
              i > 1 ? 'border-t border-[#E4EAEE]' : '',
              'lg:border-t-0',
              i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : '',
            ].join(' ')}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
              {k.label}
            </p>
            <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
            {k.id === 'month' ? (
              editingTarget ? (
                <div className="mt-1.5 flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    dir="ltr"
                    aria-label="هدف الشهر بالحجوزات"
                    value={targetDraft}
                    onChange={(e) => setTargetDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTarget();
                      if (e.key === 'Escape') setEditingTarget(false);
                    }}
                    className="h-6 w-16 rounded border border-[#CBD5E1] px-1.5 text-[11px] tabular-nums outline-none focus:border-[#0FA3A3]"
                  />
                  <button type="button" onClick={saveTarget} className="text-[10.5px] font-bold text-[#059669]">حفظ</button>
                  <button type="button" onClick={() => { setEditingTarget(false); setTargetError(''); }} className="text-[10.5px] text-[#94A3B8]">إلغاء</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTargetDraft(monthlyTarget ? String(monthlyTarget) : '');
                    setTargetError('');
                    setEditingTarget(true);
                  }}
                  className="mt-1.5 block w-full truncate text-start text-[10.5px] text-[#7C8A99] hover:text-[#0E7490]"
                  title="تعديل هدف الشهر"
                >
                  {k.note}
                </button>
              )
            ) : (
              <p className="mt-1.5 truncate text-[10.5px] text-[#7C8A99]">{k.note}</p>
            )}
            {k.id === 'month' && monthlyTarget > 0 && !editingTarget && (
              <div className="mt-1.5 flex h-0.5 w-full justify-end overflow-hidden rounded-full bg-[#E4EAEE]" dir="ltr">
                <div className="h-full rounded-full bg-[#0FA3A3]" style={{ width: `${targetPct}%` }} />
              </div>
            )}
            {k.id === 'month' && targetError && <p className="mt-1 text-[9px] text-[#DC2626]">{targetError}</p>}
          </div>
        ))}
      </section>

      {/* ---------- تايم لاين + عمود المتابعة ---------- */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
        <section className={panel}>
          <div className="border-b border-[#E4EAEE] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-extrabold">تايم لاين اليوم</h2>
                <p className="mt-0.5 text-[11px] text-[#64748B]">
                  {todayApts.length} موعد · {occupancy.todayBooked} محجوز · {occupancy.gapsToday} شاغر
                  {branchLabel ? ` · ${branchLabel}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2 py-0.5 text-[10.5px] font-bold text-[#047857]">
                  امتلاء {occupancy.todayFill == null ? '—' : `${occupancy.todayFill}%`}
                </span>
                <Link to="/appointments" className="text-[11px] font-bold text-[#0FA3A3] hover:text-[#059669]">الجدول الكامل ←</Link>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#EDF1F4] pt-2.5 text-[11px]">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${currentApt ? 'bg-[#059669]' : 'bg-[#CBD5E1]'}`} />
                <span className="text-[#94A3B8]">الآن</span>
                {currentApt ? (
                  <Link to="/appointments" className="truncate font-bold hover:text-[#0E7490]">{currentApt.time} · {currentApt.customerName}</Link>
                ) : (
                  <span className="text-[#64748B]">لا موعد جارٍ</span>
                )}
              </span>
              <span className="h-3 w-px bg-[#E4EAEE]" aria-hidden="true" />
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0FA3A3]" />
                <span className="text-[#94A3B8]">التالي</span>
                {nextApt ? (
                  <>
                    <Link to="/appointments" className="truncate font-bold hover:text-[#0E7490]">{nextApt.time} · {nextApt.customerName}</Link>
                    {minutesToNext != null && <span className="shrink-0 text-[#94A3B8]">بعد {minutesToNext} د</span>}
                  </>
                ) : tomorrowFirst ? (
                  <>
                    <Link to="/appointments" className="truncate font-bold hover:text-[#0E7490]">غداً {tomorrowFirst.time} · {tomorrowFirst.customerName}</Link>
                    <span className="shrink-0 text-[#94A3B8]">أول موعد</span>
                  </>
                ) : (
                  <span className="text-[#64748B]">لا مواعيد قادمة</span>
                )}
              </span>
            </div>
          </div>

          <div className="px-5 py-4">
            {todayApts.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#64748B]">لا مواعيد مسجّلة اليوم — ابدئي بإضافة حجز.</p>
            ) : (
              <div className="space-y-0">
                {tlHours.map((h) => {
                  const items = (hourMap[h] || []).slice().sort((a, b) => String(a.time).localeCompare(String(b.time)));
                  return (
                    <div key={h} className="grid grid-cols-[54px_1fr] gap-3">
                      <span className="pt-1.5 text-[10.5px] tabular-nums text-[#94A3B8]">{hourLabel(h)}</span>
                      <div className="min-h-[44px] space-y-1.5 border-t border-[#EDF1F4] py-1.5">
                        {items.length === 0 && <p className="pt-1 text-[10.5px] text-[#CBD5E1]">—</p>}
                        {items.map((a) => {
                          const st = APT_STATUS[a.status] || { label: a.status || '—', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
                          return (
                            <Link
                              key={a.id}
                              to="/appointments"
                              className="block rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 transition-colors hover:border-[#CBD5E1]"
                              style={{
                                borderInlineStartWidth: 3,
                                borderInlineStartColor: APT_ACCENT[a.status] || '#94A3B8',
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[12.5px] font-bold">{a.customerName || 'عميلة'}</p>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                              </div>
                              <p className="mt-0.5 truncate text-[10.5px] text-[#64748B]">
                                {a.service || 'خدمة غير محددة'}
                                {a.branchName ? ` · ${a.branchName}` : ''}
                                {a.specialistName ? ` · ${a.specialistName}` : ''}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          {/* تنبيهات المتابعة */}
          <section className={panel}>
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-3.5">
              <h2 className="text-[14px] font-extrabold">تنبيهات المتابعة</h2>
              <span className="rounded-full border border-[#F7D3D3] bg-[#FEF2F2] px-2 py-0.5 text-[10.5px] font-bold text-[#DC2626]">{visibleAlerts.length}</span>
            </div>
            <div className="space-y-2 p-4 pt-3">
              {visibleAlerts.length === 0 && (
                <p className="rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] px-3 py-3 text-center text-[12.5px] font-bold text-[#047857]">
                  لا بند يحتاج تدخلاً الآن.
                </p>
              )}
              {visibleAlerts.slice(0, 4).map((a) => (
                <article
                  key={a.id}
                  className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2.5 ps-4"
                >
                  <span
                    className="absolute inset-y-0 start-0 w-[3px]"
                    style={{ background: a.severity === 'high' ? '#DC2626' : a.severity === 'warn' ? '#B45309' : '#0FA3A3' }}
                  />
                  <p className="text-[12.5px] font-bold leading-snug text-[#0F172A]">{a.title}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#64748B]">{a.detail}</p>
                  {a.to && (
                    <button type="button" onClick={() => navigate(a.to)} className={`mt-1.5 text-[10.5px] ${linkTone}`}>
                      فتح ←
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* قائمة الانتظار */}
          {hasCap('ops') && (
            <section className={panel}>
              <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-3.5">
                <h2 className="text-[14px] font-extrabold">قائمة الانتظار</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${waiting.length ? 'border-[#F3E2C2] bg-[#FFFBEB] text-[#B45309]' : 'border-[#C9EEE0] bg-[#ECFDF5] text-[#047857]'}`}>
                  {waiting.length}
                </span>
              </div>
              <div className="px-5 py-2">
                <div className="flex items-center justify-between border-b border-[#F1F5F7] py-2 text-[12px]">
                  <span className="text-[#334155]">بالانتظار</span>
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: waiting.length ? AMBER : GREEN }}>{waiting.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <span className="shrink-0 text-[#334155]">أقرب فراغ</span>
                  <span className="text-start text-[10.5px] font-bold text-[#0E7490]">
                    {nextGap ? `${nextGap.name} · ${nextGap.gaps} ${nextGap.gaps >= 3 && nextGap.gaps <= 10 ? 'فتحات' : 'فتحة'}` : 'لا فراغ في ٧ أيام'}
                  </span>
                </div>
                <Link to="/appointments/waitlist" className={`inline-block pb-1 text-[10.5px] ${linkTone}`}>عرض الطابور ←</Link>
              </div>
            </section>
          )}

          {/* المتجر */}
          <section className={panel}>
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-3.5">
              <h2 className="text-[14px] font-extrabold">المتجر</h2>
              <Link to="/products?tab=orders" className="text-[10.5px] font-bold text-[#0FA3A3] hover:text-[#059669]">فتح ←</Link>
            </div>
            <div className="px-5 py-2">
              <Link to="/products?tab=orders" className="flex items-center justify-between border-b border-[#F1F5F7] py-2 text-[12px] hover:text-[#0FA3A3]">
                <span className="text-[#334155]">طلبات بانتظار التنفيذ</span>
                <span className="text-[15px] font-bold tabular-nums" style={{ color: pendingOrders ? AMBER : GREEN }}>{pendingOrders}</span>
              </Link>
              <Link to="/products" className="flex items-center justify-between border-b border-[#F1F5F7] py-2 text-[12px] hover:text-[#0FA3A3]">
                <span className="text-[#334155]">مخزون منخفض</span>
                <span className="text-[15px] font-bold tabular-nums" style={{ color: lowStock.length ? RED : GREEN }}>{lowStock.length}</span>
              </Link>
              <div className="flex items-center justify-between py-2 text-[12px]">
                <span className="text-[#334155]">منتجات نشطة</span>
                <span className="text-[15px] font-bold tabular-nums text-[#64748B]">{activeProducts.length}</span>
              </div>
              <p className="pb-1 text-[9.5px] text-[#94A3B8]">تنبيه المخزون عند ٥ وحدات أو أقل</p>
            </div>
          </section>

          {/* مهام سريعة */}
          <section className={panel}>
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-3.5">
              <h2 className="text-[14px] font-extrabold">مهام اليوم</h2>
              <span className="text-[10.5px] font-bold text-[#64748B]">{tasks.pending.length + tasks.followups.length + tasks.failed.length + tasks.noshowToday.length}</span>
            </div>
            <ul className="px-5 py-2">
              {railTasks.map((t) => (
                <li key={t.to + t.label}>
                  <Link to={t.to} className="flex items-center justify-between gap-2 border-b border-[#F1F5F7] py-2 text-[12px] last:border-0 hover:text-[#0FA3A3]">
                    <span className="text-[#334155]">{t.label}</span>
                    <span className="text-[15px] font-bold tabular-nums" style={{ color: t.tone }}>{t.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* ---------- الفروع ---------- */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold">{branchRows.length === 2 ? 'الفرعان' : branchRows.length === 1 ? 'الفرع' : 'الفروع'}</h2>
          <Link to="/branches" className="text-[11px] font-bold text-[#0FA3A3] hover:text-[#059669]">الفروع والجداول</Link>
        </div>
        {branchRows.length === 0 && <p className={`${panel} p-5 text-sm text-[#64748B]`}>لا فروع محفوظة بعد.</p>}
        {branchRows.length > 0 && (
          <div className={`grid gap-4 ${branchRows.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {branchRows.map((b) => {
              const seen = b.attended + b.noshow;
              const rate = seen ? Math.round((b.attended / seen) * 100) : 0;
              return (
                <article key={b.id} className={`${panel} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-extrabold">{b.name}</h3>
                      {b.address && <p className="mt-1 text-[11px] text-[#64748B]">{b.address}</p>}
                      {b.phone && <p className="mt-0.5 text-[11px] text-[#64748B]" dir="ltr">{b.phone}</p>}
                    </div>
                    <span className="shrink-0 rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2 py-1 text-[10.5px] font-bold text-[#047857]">{b.today} اليوم</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 divide-x divide-[#E4EAEE] border-y border-[#E4EAEE] text-center [direction:rtl]">
                    <div className="py-2.5">
                      <p className="text-[10px] text-[#64748B]">الحجوزات</p>
                      <p className="text-[17px] font-bold tabular-nums">{b.total}</p>
                    </div>
                    <div className="py-2.5">
                      <p className="text-[10px] text-[#B45309]">معلّق</p>
                      <p className="text-[17px] font-bold tabular-nums text-[#B45309]">{b.pending}</p>
                    </div>
                    <div className="py-2.5">
                      <p className="text-[10px] text-[#047857]">حضرت</p>
                      <p className="text-[17px] font-bold tabular-nums text-[#047857]">{b.attended}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-[#EDF3F5]" dir="ltr">
                      <div className="h-full rounded-full bg-[#0FA3A3]" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-[#0E7490]">{rate}% حضور</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- خريطة الازدحام + ملاحظات ---------- */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <section className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E4EAEE] px-5 py-4">
            <div>
              <h2 className="text-[15px] font-extrabold">خريطة الازدحام الأسبوعية</h2>
              <p className="mt-0.5 text-[11px] text-[#64748B]">آخر 60 يوماً · {heatSample.length} حجز · اليوم × الساعة</p>
            </div>
            <div className="flex items-center gap-1 text-[9.5px] text-[#94A3B8]">
              أقل
              {[0.15, 0.35, 0.55, 0.8].map((v) => (
                <span key={v} className="h-3 w-3 rounded-sm" style={{ background: `rgba(15,163,163,${v})` }} />
              ))}
              أكثر
            </div>
          </div>
          <div className="overflow-x-auto px-5 pb-4 pt-5">
            <div className="min-w-[540px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: '44px repeat(7, minmax(0, 1fr))' }}>
                <span />
                {occupancy.byDay.map((d) => (
                  <span key={d.i} className="pb-1 text-center text-[10px] font-bold text-[#64748B]">{d.name}</span>
                ))}
                {heatHours.map((h, hi) => (
                  <React.Fragment key={h}>
                    <span className="flex items-center justify-end pe-1 text-[9.5px] tabular-nums text-[#94A3B8]">{hourLabel(h)}</span>
                    {occupancy.byDay.map((d) => {
                      const c = heatMatrix[d.i]?.[hi] || 0;
                      const ratio = c / heatMax;
                      return (
                        <div
                          key={`${d.i}-${h}`}
                          title={`${d.name} ${hourLabel(h)}: ${c}`}
                          className="grid h-6 place-items-center rounded-sm text-[9.5px] tabular-nums"
                          style={{
                            background: c ? `rgba(15,163,163,${(0.1 + ratio * 0.75).toFixed(2)})` : '#F4F7F8',
                            color: ratio > 0.55 ? '#FFFFFF' : '#475569',
                          }}
                        >
                          {c || ''}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-[#94A3B8]">
                الرقم داخل المربع = عدد الحجوزات في تلك الساعة. السبت عادةً مغلق.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#E4EAEE] border-t border-[#E4EAEE] text-center">
            <div className="py-2.5">
              <p className="text-[10px] text-[#0E7490]">محجوز 7 أيام</p>
              <p className="text-[15px] font-bold tabular-nums text-[#0E7490]">{weekBooked}</p>
            </div>
            <div className="py-2.5">
              <p className="text-[10px] text-[#64748B]">شاغر 7 أيام</p>
              <p className="text-[15px] font-bold tabular-nums text-[#64748B]">{weekGaps}</p>
            </div>
            <div className="py-2.5">
              <p className="text-[10px] text-[#64748B]">امتلاء اليوم</p>
              <p className="text-[15px] font-bold tabular-nums">{occupancy.todayFill == null ? '—' : `${occupancy.todayFill}%`}</p>
            </div>
          </div>
        </section>

        <section className={panel}>
          <div className="border-b border-[#E4EAEE] px-5 py-4">
            <h2 className="text-[15px] font-extrabold">ملاحظات ذكية</h2>
          </div>
          <ul className="space-y-2.5 px-5 py-4">
            {(occupancy.tips || []).map((tip) => (
              <li key={tip} className="flex gap-2 text-[12px] leading-relaxed text-[#334155]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0FA3A3]" />
                <span>{tip}</span>
              </li>
            ))}
            {health.curr?.attendRate != null && (
              <li className="flex gap-2 text-[12px] leading-relaxed text-[#047857]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#059669]" />
                <span>نسبة الحضور هذا الشهر {health.curr.attendRate}%.</span>
              </li>
            )}
            {(occupancy.services || []).length > 0 && (
              <li className="rounded-lg border border-[#E4EAEE] px-3 py-2">
                <p className="mb-1 text-[10.5px] font-bold text-[#64748B]">أكثر الخدمات حجزاً</p>
                {occupancy.services.map((s) => (
                  <p key={s.name} className="flex justify-between gap-2 text-[11.5px]">
                    <span className="truncate">{s.name}</span>
                    <span className="font-bold tabular-nums">{s.count}</span>
                  </p>
                ))}
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* ---------- إجراءات سريعة + الموقع ---------- */}
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <section className={panel}>
          <div className="border-b border-[#E4EAEE] px-5 py-4">
            <h2 className="text-[15px] font-extrabold">إجراءات سريعة</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            <Link to="/appointments" className="rounded-lg border border-[#E4EAEE] px-3 py-2.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#059669] hover:text-[#059669]">جدول اليوم</Link>
            {userRole !== 'worker' && <Link to="/customers" className="rounded-lg border border-[#E4EAEE] px-3 py-2.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">عميلة جديدة</Link>}
            {hasCap('ops') && <Link to="/appointments/gaps" className="rounded-lg border border-[#E4EAEE] px-3 py-2.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">الفراغات</Link>}
            <Link to="/products?tab=orders" className="rounded-lg border border-[#E4EAEE] px-3 py-2.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">الطلبات</Link>
            {hasCap('ops') && <Link to="/appointments/reminders" className="rounded-lg border border-[#E4EAEE] px-3 py-2.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">التذكيرات</Link>}
            {userRole !== 'worker' && <Link to="/website" className="rounded-lg border border-[#E4EAEE] px-3 py-2.5 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">الموقع</Link>}
          </div>
        </section>

        {userRole !== 'worker' && (
          <section className={`${panel} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-extrabold">الموقع والحجز</h2>
                <p className="mt-1 text-[11px] text-[#64748B]">{site.published ? 'صفحة الحجز ظاهرة' : 'صفحة الحجز ناقصة'} · الثيم {site.theme}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                <Link to="/website" className="rounded-lg bg-[#059669] px-3 py-2 text-white transition-colors hover:bg-[#047857]">تعديل الموقع</Link>
                <Link to="/services" className="rounded-lg border border-[#E4EAEE] px-3 py-2 text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]">الخدمات</Link>
                <Link to="/products" className="rounded-lg border border-[#E4EAEE] px-3 py-2 text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]">المنتجات</Link>
                <a href={site.url || `/book/${clinicId}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[#C8EDF2] bg-[#ECFEFF] px-3 py-2 text-[#0E7490]">فتح الحجز</a>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="break-all font-mono text-[11px] text-[#334155]" dir="ltr">{site.url || '—'}</p>
              {site.url && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(site.url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch { /* clipboard blocked */ }
                  }}
                  className="text-[11px] font-bold text-[#0FA3A3] hover:text-[#059669]"
                >
                  {copied ? 'تم النسخ' : 'نسخ الرابط'}
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-2 text-[12px] sm:grid-cols-3">
              <div className="rounded-lg border border-[#E4EAEE] p-3">
                <p className="text-[10px] text-[#64748B]">ظهور الأقسام</p>
                <p className="mt-1 font-bold">{site.showServices ? 'الخدمات ظاهرة' : 'الخدمات مخفية'}</p>
                <p className="text-[10.5px] text-[#64748B]">{site.showProducts ? 'المنتجات ظاهرة' : 'المنتجات مخفية'} · {site.showBlog ? 'المدونة ظاهرة' : 'المدونة مخفية'}</p>
              </div>
              <div className="rounded-lg border border-[#E4EAEE] p-3">
                <p className="text-[10px] text-[#64748B]">الخدمات على الموقع</p>
                <p className="mt-1 font-bold">{site.services.length} خدمة</p>
                <p className="text-[10.5px] text-[#64748B]">{site.thinServices.length ? `${site.thinServices.length} بلا وصف` : 'كلها بوصف'}</p>
              </div>
              <div className="rounded-lg border border-[#E4EAEE] p-3">
                <p className="text-[10px] text-[#64748B]">المدونة</p>
                <p className="mt-1 font-bold">{site.blogCount} تدوينة</p>
                <Link to="/website" className="text-[10.5px] font-bold text-[#0FA3A3] hover:text-[#059669]">فتح إعدادات الموقع</Link>
              </div>
            </div>
            {site.thinServices.length > 0 && (
              <p className="mt-3 text-[10.5px] text-[#64748B]">بلا وصف: {site.thinServices.map((s) => s.title || s.name).filter(Boolean).join(' · ') || 'خدمة بلا اسم'}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
