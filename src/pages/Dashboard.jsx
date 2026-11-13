import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import {
  clinicHealth, dailyTasks, interventionAlerts, siteStatus, occupancyInsights, toYmd,
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
  const [range, setRange] = useState('week');

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

  if (loadingClinic || loadingData) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="جاري التحميل">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1F5C4D]" />
      </div>
    );
  }

  const score = health.score;
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const who = clinicInfo?.ownerName || clinicInfo?.name || 'وَرَف';
  const dateLabel = now.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });
  const branchName = branches.find((b) => b?.name)?.name;
  const todayYmd = toYmd(new Date());
  const todayApts = appointments.filter((a) => a.date === todayYmd);
  const pendingToday = todayApts.filter((a) => a.status === 'pending').length;
  const cancelledToday = todayApts.filter((a) => a.status === 'cancelled').length;
  const bookDelta = health.deltas?.book;
  const visibleAlerts = alerts.filter((a) => {
    if (a.to === '/ops' && !hasCap('ops')) return false;
    if (a.to === '/winback' && !hasCap('winback')) return false;
    return true;
  });

  const card = 'bg-white rounded-2xl shadow-[0_8px_30px_-12px_rgba(20,27,43,0.18)]';
  const chartRows = range === 'today'
    ? occupancy.byHour.map((h) => ({ label: String(h.hour), a: h.count }))
    : range === 'days'
      ? occupancy.byDay.map((d) => ({ label: d.name.replace('ال', '').slice(0, 4), a: d.count }))
      : (occupancy.lookahead || []).map((d) => ({ label: d.name, a: d.booked, b: d.gaps }));
  const chartMax = Math.max(1, ...chartRows.map((r) => Math.max(r.a || 0, r.b || 0)));
  const branchMap = new Map();
  appointments.forEach((a) => {
    if (a.status === 'cancelled') return;
    const key = a.branchName || 'العيادة';
    const row = branchMap.get(key) || { name: key, total: 0, pending: 0, attended: 0 };
    row.total += 1;
    if (a.status === 'pending') row.pending += 1;
    if (a.status === 'attended') row.attended += 1;
    branchMap.set(key, row);
  });
  const branchRows = [...branchMap.values()].sort((x, y) => y.total - x.total).slice(0, 6);
  const weekBooked = (occupancy.lookahead || []).reduce((n, d) => n + d.booked, 0);
  const weekGaps = (occupancy.lookahead || []).reduce((n, d) => n + d.gaps, 0);

  return (
    <div className="max-w-[1360px] mx-auto space-y-5 text-[#141b2b]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#6d7a77]">{dateLabel}{branchName ? ` · ${branchName}` : ''}</p>
          <h1 className="text-[26px] font-extrabold tracking-tight mt-1">{greet}، {who}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ['today', 'اليوم'],
            ['week', 'آخر 7 أيام'],
            ['days', 'حسب اليوم'],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setRange(id)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${range === id ? 'bg-white text-[#059669] shadow-sm' : 'text-[#6d7a77]'}`}>
              {label}
            </button>
          ))}
          <Link to="/appointments" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10b981] text-white text-sm font-bold hover:bg-[#059669]">
            جدول اليوم
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: <FaUsers />, tint: 'bg-emerald-50 text-[#059669]', label: 'العميلات', value: customers.length, note: 'مسجّلات في العيادة', bar: 'bg-[#10b981]' },
          { icon: <FaCalendarDay />, tint: 'bg-violet-50 text-[#6b4eff]', label: 'مواعيد اليوم', value: todayApts.length, note: `${pendingToday} معلّق · ${cancelledToday} ملغى`, bar: 'bg-[#6b4eff]', width: todayApts.length ? `${Math.round((pendingToday / todayApts.length) * 100)}%` : '0%' },
          { icon: <FaChartLine />, tint: 'bg-emerald-50 text-[#059669]', label: 'حجوزات هذا الشهر', value: health.curr?.total ?? 0, note: bookDelta == null ? 'بلا مقارنة للشهر السابق' : `${bookDelta >= 0 ? '+' : ''}${bookDelta}% عن الفترة المقابلة`, bar: 'bg-[#10b981]' },
          { icon: <FaClipboardList />, tint: 'bg-violet-50 text-[#6b4eff]', label: 'مهام معلّقة', value: tasks.pending.length, note: 'تأكيد حجوزات من السجل', bar: 'bg-[#6b4eff]' },
        ].map((item) => (
          <div key={item.label} className={`${card} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold text-[#3d4947]">{item.label}</p>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.tint}`}>{item.icon}</span>
            </div>
            <p className="text-[34px] font-extrabold leading-none mt-3">{item.value}</p>
            <p className="text-[11px] text-[#6d7a77] mt-2">{item.note}</p>
            <div className="mt-3 h-1.5 rounded-full bg-[#eef0ff] overflow-hidden">
              <div className={`h-full rounded-full ${item.bar}`} style={{ width: item.width || '100%' }} title={item.width ? 'نسبة المعلّق من مواعيد اليوم' : undefined} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-extrabold">
              {range === 'today' ? 'حجوزات اليوم حسب الساعة' : range === 'days' ? 'الحجوزات حسب اليوم · 60 يوماً' : 'الأيام السبعة القادمة'}
            </h2>
            {score != null && <span className="text-xs font-bold text-[#059669]">صحة {score}</span>}
          </div>
          <div className="flex items-end gap-2 h-52">
            {chartRows.map((r) => (
              <div key={r.label} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-2">
                <div className="w-full flex-1 flex items-end justify-center gap-1">
                  <div className="w-2.5 sm:w-3 rounded-t-md bg-[#10b981]" style={{ height: `${Math.max(r.a ? 6 : 0, (r.a / chartMax) * 100)}%` }} title={`${r.label}: ${r.a}`} />
                  {r.b != null && <div className="w-2.5 sm:w-3 rounded-t-md bg-[#6b4eff]" style={{ height: `${Math.max(r.b ? 6 : 0, (r.b / chartMax) * 100)}%` }} title={`${r.label} شاغر: ${r.b}`} />}
                </div>
                <span className="text-[10px] text-[#6d7a77] truncate w-full text-center">{r.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="rounded-xl bg-[#ecfdf5] py-2">
              <p className="text-[11px] text-[#059669]">محجوز 7 أيام</p>
              <p className="font-extrabold text-[#059669]">{weekBooked}</p>
            </div>
            <div className="rounded-xl bg-[#f3f0ff] py-2">
              <p className="text-[11px] text-[#6b4eff]">شاغر 7 أيام</p>
              <p className="font-extrabold text-[#6b4eff]">{weekGaps}</p>
            </div>
            <div className="rounded-xl bg-[#f7f8ff] py-2">
              <p className="text-[11px] text-[#6d7a77]">امتلاء اليوم</p>
              <p className="font-extrabold">{occupancy.todayFill == null ? '—' : `${occupancy.todayFill}%`}</p>
            </div>
          </div>
        </section>

        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold">تنبيهات المتابعة</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{visibleAlerts.length}</span>
          </div>
          {visibleAlerts.length === 0 && <p className="text-sm text-[#059669] mb-3">لا بند يحتاج تدخلاً الآن.</p>}
          <div className="space-y-2">
            {visibleAlerts.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-xl border border-[#eceefe] p-3">
                <p className="font-bold text-sm">{a.title}</p>
                <p className="text-xs text-[#6d7a77] mt-1">{a.detail}</p>
                {a.to && (
                  <button type="button" onClick={() => navigate(a.to)} className="mt-2 px-3 py-1 rounded-lg bg-[#10b981] text-white text-xs font-bold">فتح</button>
                )}
              </div>
            ))}
          </div>
          {occupancy.agenda.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-[#6d7a77]">وردية اليوم</p>
              {occupancy.agenda.slice(0, 4).map((a) => {
                const st = APT_STATUS[a.status] || { label: a.status || '—', cls: 'bg-slate-50 text-slate-500' };
                return (
                  <Link key={a.id} to="/appointments" className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{a.time} · {a.customerName}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className={`${card} p-5`}>
        <h2 className="font-extrabold mb-3">الحجوزات حسب الفرع</h2>
        {branchRows.length === 0 && <p className="text-sm text-[#6d7a77]">لا حجوزات غير ملغاة بعد.</p>}
        {branchRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>{['الفرع', 'الحجوزات', 'معلّق', 'حضرت', 'نسبة الحضور'].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {branchRows.map((b) => {
                  const rate = b.total ? Math.round((b.attended / b.total) * 100) : 0;
                  return (
                    <tr key={b.name}>
                      <td className="font-bold">{b.name}</td>
                      <td>{b.total}</td>
                      <td>{b.pending}</td>
                      <td>{b.attended}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-[#eef0ff] overflow-hidden">
                            <div className="h-full bg-[#10b981]" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-bold">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-4">
        <section className={`${card} p-5`}>
          <h2 className="font-extrabold mb-3">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/appointments" className="rounded-2xl bg-[#ecfdf5] text-[#059669] p-3 text-sm font-bold">جدول اليوم</Link>
            {userRole !== 'worker' && <Link to="/customers" className="rounded-2xl bg-[#f3f0ff] text-[#6b4eff] p-3 text-sm font-bold">عميلة جديدة</Link>}
            {hasCap('ops') && <Link to="/appointments/gaps" className="rounded-2xl bg-[#f7f8ff] p-3 text-sm font-bold">الفراغات</Link>}
            {userRole !== 'worker' && <Link to="/website" className="rounded-2xl bg-[#f7f8ff] p-3 text-sm font-bold">الموقع</Link>}
          </div>
        </section>
        <section className={`${card} p-5`}>
          <h2 className="font-extrabold mb-3">مهام اليوم</h2>
          <ul className="space-y-2 text-sm">
            <TaskRow to="/appointments" label="حجوزات تحتاج تأكيد" count={tasks.pending.length} tone={tasks.pending.length ? '#f59e0b' : '#10b981'} />
            <TaskRow to="/appointments/attendance" label="غياب اليوم" count={tasks.noshowToday.length} tone={tasks.noshowToday.length ? '#f43f5e' : '#10b981'} />
            {hasCap('ops') && <TaskRow to="/appointments/gaps" label="مواعيد متاحة اليوم" count={tasks.gaps.length} tone="#10b981" />}
            {hasCap('ops') && <TaskRow to="/appointments/reminders" label="تذكيرات مستحقة" count={tasks.followups.length} tone={tasks.followups.length ? '#6b4eff' : '#10b981'} />}
            {hasCap('winback') && <TaskRow to="/winback" label="رسائل فشل إرسالها" count={tasks.failed.length} tone={tasks.failed.length ? '#f43f5e' : '#10b981'} />}
          </ul>
        </section>
      </div>

      {userRole !== 'worker' && (
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-extrabold">الموقع</h2>
              <p className="text-xs text-[#6d7a77] mt-1">جاهزية {site.ready}/{site.total} · خدمات ناقصة {site.thinServices.length}</p>
            </div>
            <div className="flex gap-3 text-xs font-bold">
              <Link to="/products" className="text-[#059669]">المنتجات</Link>
              <Link to="/website" className="text-[#059669]">الموقع</Link>
              <a href={site.url || `/book/${clinicId}`} target="_blank" rel="noreferrer" className="text-[#6b4eff]">فتح الحجز</a>
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
      <Link to={to} className="flex justify-between items-center rounded-xl px-3 py-2 bg-[#FDFBF7] border border-[#E8E4DC]">
        <span>{label}</span>
        <span className="font-product text-lg" style={{ color: tone || TONES.azure }}>{count}</span>
      </Link>
    </li>
  );
}

export default Dashboard;
