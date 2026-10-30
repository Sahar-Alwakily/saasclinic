import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import {
  clinicHealth, dailyTasks, interventionAlerts, answerFromData, siteStatus, occupancyInsights, toYmd,
} from '../utils/clinicInsights';
import { FaUsers, FaCalendarDay, FaChartLine, FaClipboardList } from 'react-icons/fa';

const TONES = {
  azure: '#0ea5e9',
  coral: '#f43f5e',
  mint: '#10b981',
  gold: '#f59e0b',
  lilac: '#8b5cf6',
};

const APT_STATUS = {
  pending: { label: 'معلّق', cls: 'bg-orange-50 text-orange-600' },
  confirmed: { label: 'مؤكد', cls: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: 'ملغى', cls: 'bg-rose-50 text-rose-500' },
  attended: { label: 'حضرت', cls: 'bg-emerald-50 text-emerald-600' },
  noshow: { label: 'غياب', cls: 'bg-rose-50 text-rose-500' },
};

const PROMPTS = [
  { id: 'drop', text: 'ليش انخفضت الحجوزات هذا الشهر؟' },
  { id: 'crowd', text: 'أي ساعات وأيام فيها ازدحام؟' },
  { id: 'today', text: 'شو يحتاج تدخل اليوم؟' },
];

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
  const [settings, setSettings] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [ask, setAsk] = useState(PROMPTS[0].text);
  const [reply, setReply] = useState(null);
  const replyRef = useRef(null);
  const [calDay, setCalDay] = useState(() => toYmd(new Date()));

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

  const runAsk = (prompt) => {
    const text = typeof prompt === 'object' && prompt?.text ? prompt.text : (typeof prompt === 'string' && prompt ? prompt : ask);
    const intent = typeof prompt === 'object' ? prompt.id : undefined;
    setAsk(text);
    try {
      const next = answerFromData(text, { health, tasks, appointments, services, waitlist, occupancy, intent });
      setReply(next || { answer: 'لا رد من الأرقام المخزّنة.', facts: [], missing: [] });
    } catch (err) {
      console.error(err);
      setReply({ answer: 'تعذّر قراءة الأرقام. حدّثي الصفحة إن استمرّ.', facts: [], missing: [] });
    }
    setTimeout(() => replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  if (loadingClinic || loadingData) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="جاري التحميل">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#111827]" />
      </div>
    );
  }

  const score = health.score;
  const ring = score == null ? 0 : score;
  const circ = 2 * Math.PI * 36;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const who = clinicInfo?.ownerName || clinicInfo?.name || 'نورا';
  const todayYmd = toYmd(new Date());
  const todayApts = appointments.filter((a) => a.date === todayYmd);
  const pendingToday = todayApts.filter((a) => a.status === 'pending').length;
  const cancelledToday = todayApts.filter((a) => a.status === 'cancelled').length;
  const bookDelta = health.deltas?.book;
  const calList = appointments
    .filter((a) => a.date === calDay)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const visibleAlerts = alerts.filter((a) => {
    if (a.to === '/ops' && !hasCap('ops')) return false;
    if (a.to === '/winback' && !hasCap('winback')) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#111827] tracking-tight">
            {greet}، {who}
          </h1>
        </div>
        {userRole !== 'worker' && (
          <Link to="/customers" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#111827] text-white text-sm font-bold">
            + عميلة جديدة
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="saas-card stat-card-mint p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#047857]">العميلات</p>
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><FaUsers /></span>
          </div>
          <p className="stat-num text-[34px] leading-none mt-3">{customers.length}</p>
          <p className="text-[12px] text-[#6b7280] mt-3">مسجّلات في العيادة</p>
        </div>
        <div className="saas-card stat-card-sky p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#0369a1]">مواعيد اليوم</p>
            <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center"><FaCalendarDay /></span>
          </div>
          <p className="stat-num text-[34px] leading-none mt-3">{todayApts.length}</p>
          <p className="text-[12px] mt-3">
            <span className="text-orange-500">{pendingToday} معلّق</span>
            <span className="text-rose-500 mr-2">{cancelledToday} ملغى</span>
          </p>
        </div>
        <div className="saas-card stat-card-lilac p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#6d28d9]">حجوزات هذا الشهر</p>
            <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><FaChartLine /></span>
          </div>
          <p className="stat-num text-[34px] leading-none mt-3">{health.curr?.total ?? 0}</p>
          <p className="text-[12px] mt-3">
            {bookDelta == null ? 'مقارنة الشهر السابق غير متاحة' : (
              <span className={bookDelta >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                {bookDelta >= 0 ? '+' : ''}{bookDelta}% عن الفترة المقابلة
              </span>
            )}
          </p>
        </div>
        <div className="saas-card stat-card-gold p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#b45309]">مهام معلّقة</p>
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><FaClipboardList /></span>
          </div>
          <p className="stat-num text-[34px] leading-none mt-3">{tasks.pending.length}</p>
          <p className="text-[12px] text-[#6b7280] mt-3">تأكيد حجوزات من السجل</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.4fr_0.9fr] gap-4">
        <section className="saas-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-[#111827]">مواعيد التقويم</h2>
            <Link to="/appointments" className="text-xs font-bold text-[#6b7280]">الكل</Link>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3">
            {(occupancy.lookahead || []).map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setCalDay(d.date)}
                className={`shrink-0 min-w-11 h-11 rounded-2xl text-sm font-bold ${
                  calDay === d.date ? 'bg-[#111827] text-white' : 'text-[#6b7280] hover:bg-[#f3f5f7]'
                }`}
              >
                {d.date.slice(-2)}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {calList.length === 0 && <p className="text-sm text-[#8a9199] py-6 text-center">لا مواعيد في هذا اليوم.</p>}
            {calList.slice(0, 6).map((a) => {
              const st = APT_STATUS[a.status] || { label: a.status || '—', cls: 'bg-slate-50 text-slate-500' };
              return (
                <Link key={a.id} to="/appointments" className="flex items-center gap-3 rounded-2xl border border-[#ebeef2] px-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#ecfdf3] text-[#15803d] font-bold flex items-center justify-center text-sm shrink-0">
                    {(a.customerName || 'ع').trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{a.customerName || 'عميلة'}</p>
                    <p className="text-[11px] text-[#8a9199] truncate">{a.service || a.serviceName || '—'} · {a.time || '—'}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="saas-card p-5">
          <h2 className="font-bold text-[#111827] mb-4">صندوق المتابعة</h2>
          {visibleAlerts.length === 0 && <p className="text-sm text-emerald-700">لا بند يحتاج تدخلاً من القواعد الحالية.</p>}
          <div className="space-y-2">
            {visibleAlerts.slice(0, 5).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => a.to && navigate(a.to)}
                className="w-full text-right rounded-2xl p-3 bg-rose-50/80 border border-rose-100"
              >
                <span className="block font-bold text-sm">{a.title}</span>
                <span className="block text-xs text-[#8a9199] mt-0.5">{a.detail}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="saas-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative w-[104px] h-[104px] shrink-0">
            <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
              <circle cx="44" cy="44" r="36" fill="none" stroke="#E5E9EC" strokeWidth="8" />
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke={ring >= 70 ? TONES.mint : ring >= 45 ? TONES.gold : TONES.coral}
                strokeWidth="8"
                strokeDasharray={`${(ring / 100) * circ} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-product text-2xl leading-none">{score == null ? '—' : score}</span>
              <span className="text-[10px] text-stone-400">صحة</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <h2 className="font-product text-xl">مؤشر صحة العيادة</h2>
            <p className="text-xs text-stone-500 mt-1">
              مقارنة {health.windows.thisStart} → {health.windows.thisEnd} مع {health.windows.prevStart} → {health.windows.prevEnd}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {health.pillars.map((p) => (
                <div key={p.id} className="rounded-xl bg-emerald-50/70 dark:bg-[#1A2C38] p-3">
                  <p className="text-[11px] text-stone-400">{p.label}</p>
                  <p className="font-product text-2xl">
                    {p.value == null ? '—' : `${p.value}${p.unit}`}
                  </p>
                  {p.prev != null && (
                    <p className="text-[11px] text-stone-500">السابق {p.prev}{p.unit}</p>
                  )}
                  {p.note && <p className="text-[10px] text-stone-400 mt-1">{p.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="saas-card p-5 md:p-6">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <div>
            <h2 className="font-product text-xl">الازدحام والأيام</h2>
            <p className="text-xs text-stone-500 mt-1">آخر 60 يوماً من الحجوزات غير الملغاة · امتلاء اليوم من الجدول إن وُجد</p>
          </div>
          <p className="text-sm font-bold" style={{ color: occupancy.todayFill == null ? TONES.gold : occupancy.todayFill >= 80 ? TONES.coral : TONES.mint }}>
            اليوم {occupancy.todayFill == null ? 'بلا سعة جدول' : `${occupancy.todayFill}% ممتلئ`}
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-6 mt-4">
          <div>
            <p className="text-[11px] text-stone-400 mb-2">حسب اليوم</p>
            <div className="space-y-1.5">
              {occupancy.byDay.map((d) => (
                <div key={d.i} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-xs shrink-0">{d.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#E5E9EC] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${occupancy.sample ? Math.max(4, (d.count / Math.max(...occupancy.byDay.map((x) => x.count), 1)) * 100) : 0}%`,
                        background: d.i === occupancy.peakDay?.i ? TONES.coral : TONES.azure,
                      }}
                    />
                  </div>
                  <span className="w-6 text-left text-xs font-bold">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 mb-2">حسب الساعة</p>
            <div className="flex items-end gap-1 h-28">
              {occupancy.byHour.map((h) => {
                const max = Math.max(...occupancy.byHour.map((x) => x.count), 1);
                const hot = occupancy.peakHour?.hour === h.hour;
                return (
                  <div key={h.hour} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
                    <div
                      className="w-full rounded-t-md"
                      style={{ height: `${Math.max(6, (h.count / max) * 100)}%`, background: hot ? TONES.coral : TONES.azure, opacity: h.count ? 1 : 0.25 }}
                      title={`${h.label}: ${h.count}`}
                    />
                    <span className="text-[9px] text-stone-400 leading-none">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {occupancy.lookahead.map((d) => (
              <div key={d.date} className="w-[4.6rem] rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-2 text-center">
                <p className="text-[10px] text-stone-400">{d.name}</p>
                <p className="font-product text-lg leading-none mt-1">{d.fill == null ? '—' : `${d.fill}%`}</p>
                <p className="text-[10px] text-stone-500 mt-1">{d.booked}/{d.cap || '—'}</p>
              </div>
            ))}
          </div>
        </div>
        {occupancy.tips.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
            {occupancy.tips.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="saas-card p-5">
          <h2 className="font-product text-xl mb-3">وردية اليوم</h2>
          {occupancy.agenda.length === 0 && <p className="text-sm text-stone-500">لا مواعيد مؤكدة أو معلّقة اليوم.</p>}
          <div className="space-y-2">
            {occupancy.agenda.slice(0, 6).map((a) => (
              <Link key={a.id} to="/appointments" className="flex justify-between gap-3 rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-3 text-sm">
                <span>
                  <span className="font-bold block">{a.customerName}</span>
                  <span className="text-xs text-stone-500">{a.service}{a.branchName ? ` · ${a.branchName}` : ''}</span>
                </span>
                <span className="text-xs font-bold shrink-0">{a.time}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="saas-card p-5">
          <h2 className="font-product text-xl mb-3">الخدمات الأكثر حجزاً</h2>
          {occupancy.services.length === 0 && <p className="text-sm text-stone-500">لا توزيع خدمات بعد.</p>}
          <div className="space-y-2">
            {occupancy.services.map((s) => (
              <div key={s.name} className="flex justify-between text-sm rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] px-3 py-2">
                <span>{s.name}</span>
                <span className="font-product">{s.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="saas-card p-5">
          <h2 className="font-product text-xl mb-3">مركز التنبيهات</h2>
          {alerts.length === 0 && (
            <p className="text-sm text-[#3F5E57]">لا بند يحتاج تدخلاً من القواعد الحالية.</p>
          )}
          <div className="space-y-2">
            {alerts.filter((a) => {
              if (a.to === '/ops' && !hasCap('ops')) return false;
              if (a.to === '/winback' && !hasCap('winback')) return false;
              return true;
            }).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => a.to && navigate(a.to)}
                className="w-full text-right rounded-xl p-3 flex gap-3 items-start bg-[#F7F8F6] dark:bg-[#1A2C38]"
              >
                <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: TONES[a.tone] || TONES.azure }} />
                <span>
                  <span className="block font-bold text-sm">{a.title}</span>
                  <span className="block text-xs text-stone-500 mt-0.5">{a.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="saas-card p-5">
          <h2 className="font-product text-xl mb-3">مركز المهام اليومية</h2>
          <ul className="space-y-2 text-sm">
            <TaskRow to="/appointments" label="حجوزات تحتاج تأكيد العميلة" count={tasks.pending.length} tone={tasks.pending.length ? TONES.gold : TONES.mint} />
            <TaskRow to="/appointments/attendance" label="غياب اليوم بلا متابعة" count={tasks.noshowToday.length} tone={tasks.noshowToday.length ? TONES.coral : TONES.mint} />
            {hasCap('ops') && (
              <>
                <TaskRow to="/appointments/gaps" label="مواعيد متاحة اليوم" count={tasks.gaps.length} tone={TONES.mint} />
                <TaskRow to="/appointments/reminders" label="تذكيرات مستحقة" count={tasks.followups.length} tone={tasks.followups.length ? TONES.azure : TONES.mint} />
              </>
            )}
            {hasCap('winback') && (
              <TaskRow to="/winback" label="رسائل فشل إرسالها" count={tasks.failed.length} tone={tasks.failed.length ? TONES.coral : TONES.mint} />
            )}
          </ul>
        </section>
      </div>

      <section className="saas-card p-5">
        <h2 className="font-product text-xl">مساعد الأرقام</h2>
        <p className="text-xs text-stone-500 mt-1">يقرأ الحجوزات والحضور والمواعيد المتاحة المخزّنة. لا يخترع سبباً خارج السجل.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => runAsk(p)}
              className={`text-xs px-3 py-1.5 rounded-full ${ask === p.text ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}
            >
              {p.text}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runAsk(ask); } }}
            className="flex-1 min-w-0 p-3 rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] outline-none"
            placeholder="اسألي عن الحجوزات أو الحضور..."
          />
          <button type="button" onClick={() => runAsk(ask)} className="px-4 py-3 rounded-xl bg-[#10b981] text-white text-sm font-bold shrink-0">اسألي</button>
        </div>
        <div ref={replyRef} className="mt-4 rounded-2xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-4 space-y-2 min-h-[5.5rem]">
          {reply ? (
            <>
              <p className="text-sm leading-relaxed text-[#172B3A] dark:text-white">{reply.answer}</p>
              {reply.facts?.map((f) => (
                <p key={f} className="text-[11px] text-stone-500">{f}</p>
              ))}
              {reply.missing?.length > 0 && (
                <p className="text-[11px] text-[#9A3F32]">{reply.missing.join(' ')}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400">اضغطي سؤالاً جاهزاً أو اكتبي واضغطي اسألي — الجواب يظهر هنا من سجل العيادة.</p>
          )}
        </div>
      </section>

      {userRole !== 'worker' && (
        <section className="saas-card p-5">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h2 className="font-product text-xl">مركز إدارة الموقع</h2>
              <p className="text-xs text-stone-500 mt-1">ثيم {site.theme} · جاهزية {site.ready}/{site.total} · خدمات ناقصة {site.thinServices.length}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/products" className="text-xs font-bold text-emerald-700">المنتجات</Link>
              <Link to="/website" className="text-xs font-bold text-emerald-700">الموقع والمدونة</Link>
              <a href={site.url || `/book/${clinicId}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-sky-700">فتح الموقع العام</a>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4 text-xs">
            <div className="rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-3">المنتجات من قسم المنتجات · المدونة من موقع العيادة</div>
            <div className="rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-3">النشر: {site.published ? 'اسم العيادة موجود' : 'ناقص الاسم'}</div>
            <div className="rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-3 break-all" dir="ltr">{site.url || '—'}</div>
            <div className="rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] p-3">
              SEO: {clinicInfo?.seoTitle ? 'عنوان موجود' : 'بدون عنوان'}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

function TaskRow({ to, label, count, tone }) {
  return (
    <li>
      <Link to={to} className="flex justify-between items-center rounded-xl px-3 py-2 bg-[#F7F8F6] dark:bg-[#1A2C38]">
        <span>{label}</span>
        <span className="font-product text-lg" style={{ color: tone || TONES.azure }}>{count}</span>
      </Link>
    </li>
  );
}

export default Dashboard;
