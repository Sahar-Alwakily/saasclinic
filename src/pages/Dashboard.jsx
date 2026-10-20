import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { useAuth } from '../context/AuthContext';
import {
  clinicHealth, dailyTasks, interventionAlerts, answerFromData, siteStatus,
} from '../utils/clinicInsights';

const TONES = {
  azure: '#4d7cff',
  coral: '#ff6b4a',
  mint: '#22c9a0',
  gold: '#f0b429',
  lilac: '#a78bfa',
};

const PROMPTS = [
  'ليش انخفضت الحجوزات هذا الشهر؟',
  'كيف نسبة الحضور؟',
  'شو يحتاج تدخل اليوم؟',
  'وين الإيراد مقارنة بالشهر الماضي؟',
];

const Dashboard = () => {
  const { clinicInfo, clinicPath, clinicId, loadingClinic, userRole } = useClinic();
  const { user } = useAuth();
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
  const [ask, setAsk] = useState(PROMPTS[0]);
  const [reply, setReply] = useState(null);

  useEffect(() => {
    if (!clinicPath) {
      setLoadingData(false);
      return undefined;
    }
    const fail = () => setLoadingData(false);
    const unsubs = [
      onValue(ref(database, clinicPath('appointments')), (snap) => {
        let all = snap.val() ? Object.entries(snap.val()).map(([id, item]) => ({ id, ...item })) : [];
        if (userRole === 'worker' && user?.category) {
          all = all.filter((apt) => apt.category === user.category);
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
  }, [clinicPath, userRole, user]);

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

  const runAsk = (q) => {
    const text = q || ask;
    setAsk(text);
    setReply(answerFromData(text, { health, tasks, appointments, services, waitlist }));
  };

  if (loadingClinic || loadingData) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="جاري التحميل">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4d7cff]" />
      </div>
    );
  }

  const score = health.score;
  const ring = score == null ? 0 : score;
  const circ = 2 * Math.PI * 36;

  return (
    <div className="space-y-6">
      <div className="saas-card p-6 md:p-8 overflow-hidden relative">
        <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#4d7cff]/20 blur-2xl" />
        <p className="text-[11px] tracking-[0.25em] uppercase text-[#4d7cff] font-semibold relative">command center</p>
        <h1 className="font-product text-3xl md:text-4xl mt-1 relative">
          أهلاً، {clinicInfo?.ownerName || 'فريق العيادة'}
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-2 relative max-w-xl">
          ما يحتاج تفتيش كل قسم: التنبيهات والمهام وصحة العيادة من أرقامكِ فقط.
        </p>
      </div>

      <section className="saas-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative w-[104px] h-[104px] shrink-0">
            <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
              <circle cx="44" cy="44" r="36" fill="none" stroke="#e4ddd0" strokeWidth="8" />
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
                <div key={p.id} className="rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] p-3">
                  <p className="text-[11px] text-stone-400">{p.label}</p>
                  <p className="font-product text-2xl">
                    {p.value == null ? '—' : p.id === 'rev' ? Number(p.value).toLocaleString('ar') : `${p.value}${p.unit}`}
                  </p>
                  {p.prev != null && (
                    <p className="text-[11px] text-stone-500">السابق {p.id === 'rev' ? Number(p.prev).toLocaleString('ar') : `${p.prev}${p.unit}`}</p>
                  )}
                  {p.note && <p className="text-[10px] text-stone-400 mt-1">{p.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="saas-card p-5">
          <h2 className="font-product text-xl mb-3">مركز التنبيهات</h2>
          {alerts.length === 0 && (
            <p className="text-sm text-[#0f766e]">لا بند يحتاج تدخلاً من القواعد الحالية.</p>
          )}
          <div className="space-y-2">
            {alerts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => a.to && navigate(a.to)}
                className="w-full text-right rounded-xl p-3 flex gap-3 items-start bg-[#f3efe6] dark:bg-[#1e1b28]"
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
            <TaskRow to="/appointments" label="مواعيد غير مؤكدة" count={tasks.pending.length} />
            <TaskRow to="/ops" label="شواغر جدول اليوم" count={tasks.gaps.length} />
            <TaskRow to="/ops" label="تذكيرات مستحقة" count={tasks.followups.length} />
            <TaskRow to="/ops" label="غياب اليوم بلا متابعة" count={tasks.noshowToday.length} />
            <TaskRow to="/winback" label="رسائل فشل إرسالها" count={tasks.failed.length} />
          </ul>
        </section>
      </div>

      <section className="saas-card p-5">
        <h2 className="font-product text-xl">مساعد الأرقام</h2>
        <p className="text-xs text-stone-500 mt-1">يقرأ الحجوزات والحضور والإيراد والشواغر المخزّنة. لا يخترع سبباً خارج السجل.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => runAsk(p)} className="text-xs px-3 py-1.5 rounded-full bg-[#f3efe6] dark:bg-[#1e1b28]">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] outline-none"
            placeholder="اسألي عن الحجوزات أو الحضور..."
          />
          <button type="button" onClick={() => runAsk()} className="px-4 rounded-xl bg-[#14121c] text-white text-sm">اسألي</button>
        </div>
        {reply && (
          <div className="mt-4 rounded-2xl border border-[#e4ddd0] dark:border-white/10 p-4 space-y-2">
            <p className="text-sm leading-relaxed">{reply.answer}</p>
            {reply.facts?.map((f) => (
              <p key={f} className="text-[11px] text-stone-500">{f}</p>
            ))}
            {reply.missing?.length > 0 && (
              <p className="text-[11px] text-[#c2410c]">{reply.missing.join(' ')}</p>
            )}
          </div>
        )}
      </section>

      {userRole !== 'worker' && (
        <section className="saas-card p-5">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h2 className="font-product text-xl">مركز إدارة الموقع</h2>
              <p className="text-xs text-stone-500 mt-1">ثيم {site.theme} · جاهزية {site.ready}/{site.total} · خدمات ناقصة {site.thinServices.length}</p>
            </div>
            <Link to="/website" className="text-xs font-bold text-[#4d7cff]">فتح المركز</Link>
          </div>
          <div className="grid sm:grid-cols-4 gap-2 mt-4 text-xs">
            <Link to="/settings?tab=store" className="rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] p-3">التصميم</Link>
            <div className="rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] p-3">النشر: {site.published ? 'اسم العيادة موجود' : 'ناقص الاسم'}</div>
            <div className="rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] p-3 break-all" dir="ltr">{site.url || '—'}</div>
            <Link to="/settings?tab=store" className="rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] p-3">
              SEO: {clinicInfo?.seoTitle ? 'عنوان موجود' : 'بدون عنوان'}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

function TaskRow({ to, label, count }) {
  return (
    <li>
      <Link to={to} className="flex justify-between items-center rounded-xl px-3 py-2 bg-[#f3efe6] dark:bg-[#1e1b28]">
        <span>{label}</span>
        <span className="font-product text-lg" style={{ color: count ? '#ff6b4a' : '#22c9a0' }}>{count}</span>
      </Link>
    </li>
  );
}

export default Dashboard;
