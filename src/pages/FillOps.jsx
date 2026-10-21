import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, push, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaWhatsapp, FaCheck, FaTimes } from 'react-icons/fa';
import {
  mergeAptSettings, DEFAULT_APT_SETTINGS, noShowRisk, rankWaitlist,
  upcomingGaps, reminderDue, reminderBody, noshowFollowupBody, recoveredRevenue, fillTimes,
  statusRates, cancelHotspots, staffBranchCompare, experimentStats, winbackReturnRate,
  waDigits, makeToken, manageUrl, appendHistory,
} from '../utils/appointmentOps';

const TABS = [
  { id: 'desk', label: 'تقرير سريع', color: '#4d7cff' },
  { id: 'wait', label: 'قائمة الانتظار', color: '#22c9a0' },
  { id: 'risk', label: 'غياب بدون إشعار', color: '#ff6b4a' },
  { id: 'revenue', label: 'الإيراد', color: '#f0b429' },
  { id: 'tests', label: 'الرسائل', color: '#a78bfa' },
  { id: 'reports', label: 'التقارير', color: '#4d7cff' },
  { id: 'policy', label: 'القواعد', color: '#14121c' },
];

const field = 'w-full p-3 rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] border-0 outline-none focus:ring-2 focus:ring-[#4d7cff]/40';

const FillOps = () => {
  const { clinicPath, clinicId, clinicInfo, isAdmin, hasCap } = useClinic();
  const [tab, setTab] = useState('desk');
  const [appointments, setAppointments] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settingsRaw, setSettingsRaw] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [form, setForm] = useState(DEFAULT_APT_SETTINGS);
  const [waitForm, setWaitForm] = useState({ name: '', phone: '', serviceId: '', branchId: '', specialistId: '', preferredTimes: 'any' });
  const [baseline, setBaseline] = useState({ cancelRate: 0, attendRate: 0 });

  const settings = useMemo(() => mergeAptSettings(settingsRaw), [settingsRaw]);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const fail = () => {};
    const unsubs = [
      onValue(ref(database, clinicPath('appointments')), (s) => setAppointments(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('waitlist')), (s) => setWaitlist(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('waitlistEvents')), (s) => setVacancies(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('scheduleSettings')), (s) => setSchedules(s.val() || {}), fail),
      onValue(ref(database, clinicPath('branches')), (s) => setBranches(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('services')), (s) => setServices(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('users')), (s) => {
        const list = s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [];
        setStaff(list.filter((u) => u.role !== 'admin'));
      }, fail),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => {
        const val = s.val();
        setSettingsRaw(val);
        setForm(mergeAptSettings(val));
      }, fail),
      onValue(ref(database, clinicPath('opsApprovals')), (s) => setApprovals(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('appointmentAudit')), (s) => setAudit(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('opsBaseline')), (s) => setBaseline(s.val() || { cancelRate: 0, attendRate: 0 })),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicPath]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tom = new Date(today); tom.setDate(tom.getDate() + 1);
  const tomStr = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;

  const todayApts = appointments.filter((a) => a.date === todayStr);
  const unconfirmed = appointments.filter((a) => a.status === 'pending' && a.date >= todayStr);
  const gapsToday = upcomingGaps({ schedules, appointments, branches, dateStr: todayStr });
  const gapsTom = upcomingGaps({ schedules, appointments, branches, dateStr: tomStr });
  const risks = appointments
    .filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= todayStr)
    .map((a) => ({ ...a, risk: noShowRisk(appointments, a) }))
    .filter((a) => a.risk.earlyConfirm)
    .sort((a, b) => (b.risk.score || 0) - (a.risk.score || 0));
  const recovery = recoveredRevenue(appointments, settings);
  const fills = fillTimes(appointments);
  const rates = statusRates(appointments);
  const hot = cancelHotspots(appointments);
  const compare = staffBranchCompare(appointments);
  const experiments = experimentStats(appointments);
  const wb = winbackReturnRate(appointments);
  const openVacancies = vacancies.filter((v) => v.open);

  const logAudit = async (action, detail) => {
    await push(ref(database, clinicPath('appointmentAudit')), { action, detail, at: Date.now() });
  };

  const requestApproval = async (title, payload) => {
    await push(ref(database, clinicPath('opsApprovals')), { title, payload, status: 'pending', createdAt: Date.now() });
    toast.info('أُرسل للمديرة للموافقة');
  };

  const addWaitlist = async (e) => {
    e.preventDefault();
    if (!waitForm.name || !waitForm.phone) return toast.error('الاسم والهاتف مطلوبان');
    const svc = services.find((s) => s.id === waitForm.serviceId);
    await push(ref(database, clinicPath('waitlist')), {
      ...waitForm,
      service: svc?.title || '',
      duration: svc?.duration || '',
      status: 'waiting',
      createdAt: Date.now(),
    });
    toast.success('أُضيفت لقائمة الانتظار');
    setWaitForm({ name: '', phone: '', serviceId: '', branchId: '', specialistId: '', preferredTimes: 'any' });
  };

  const sendOffers = async (vacancy) => {
    const ranked = rankWaitlist(waitlist, vacancy).slice(0, 5);
    if (!ranked.length) return toast.info('لا تطابق في قائمة الانتظار');
    const expiresAt = Date.now() + Number(settings.waitlistOfferMinutes || 30) * 60000;
    await Promise.all(ranked.map(async (entry) => {
      const token = makeToken();
      await set(ref(database, clinicPath(`waitlistOffers/${token}`)), {
        vacancyId: vacancy.id,
        waitlistId: entry.id,
        name: entry.name,
        phone: entry.phone,
        service: vacancy.service,
        serviceId: vacancy.serviceId,
        branchId: vacancy.branchId,
        specialistId: vacancy.specialistId || entry.specialistId || '',
        date: vacancy.date,
        time: vacancy.time,
        price: vacancy.price || 0,
        fromAppointmentId: vacancy.fromAppointmentId || '',
        cancelledAt: vacancy.createdAt,
        status: 'open',
        expiresAt,
        createdAt: Date.now(),
      });
      await update(ref(database, clinicPath(`waitlist/${entry.id}`)), { status: 'offered' });
      const url = `${window.location.origin}/book/${clinicId}/offer/${token}`;
      const body = `شاغر مناسب لجلسة ${vacancy.service} يوم ${vacancy.date} ${vacancy.time}. للقبول خلال ${settings.waitlistOfferMinutes} دقيقة: ${url}`;
      window.open(`https://wa.me/${waDigits(entry.phone)}?text=${encodeURIComponent(body)}`, '_blank');
    }));
    await logAudit('waitlist-offers', { vacancyId: vacancy.id, count: ranked.length });
    toast.success('أُرسلت العروض — أول قبول يثبت الموعد');
  };

  const sendReminder = async (apt, hoursKey) => {
    const count = Object.keys(apt.remindersSent || {}).length;
    if (count >= Number(settings.reminderCap || 3)) return toast.info('بلغ سقف التواصل لهذا الموعد');
    const variant = apt.reminderVariant || 'A';
    const body = reminderBody(clinicInfo?.name, apt, clinicId, variant);
    window.open(`https://wa.me/${waDigits(apt.phoneNumber)}?text=${encodeURIComponent(body)}`, '_blank');
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
      remindersSent: { ...(apt.remindersSent || {}), [String(hoursKey)]: Date.now() },
      messageCount: (apt.messageCount || 0) + 1,
      history: appendHistory(apt, { action: 'reminder', hours: hoursKey }),
    });
    await logAudit('reminder', { appointmentId: apt.id });
  };

  const followNoshow = async (apt) => {
    if (apt.noshowFollowupSent) return toast.info('أُرسلت متابعة مسبقاً');
    const body = noshowFollowupBody(clinicInfo?.name, apt, clinicId);
    window.open(`https://wa.me/${waDigits(apt.phoneNumber)}?text=${encodeURIComponent(body)}`, '_blank');
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), { noshowFollowupSent: true, messageCount: (apt.messageCount || 0) + 1 });
  };

  const savePolicy = async () => {
    const reminderHours = String(form.reminderHoursText || (form.reminderHours || []).join(',')).split(/[,\s]+/).map(Number).filter((n) => n > 0);
    await set(ref(database, clinicPath('appointmentSettings')), { ...form, reminderHours });
    toast.success('حُفظت سياسة المواعيد');
  };

  const exportMonthly = () => {
    const payload = {
      clinic: clinicInfo?.name,
      month: todayStr.slice(0, 7),
      rates, recovery, fills, experiments, wb, compare, generatedAt: new Date().toISOString(),
      note: 'إيراد تقديري ≠ إيراد محصّل. لا يُحتسب الموعد مرتين.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ops-${todayStr.slice(0, 7)}.json`;
    a.click();
  };

  const snapshotBaseline = async () => {
    await set(ref(database, clinicPath('opsBaseline')), { cancelRate: rates.cancelRate, attendRate: rates.attendRate, at: Date.now() });
    toast.success('حُفظت لقطة ما قبل التفعيل للمقارنة');
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const noshowOpen = appointments.filter((a) => a.status === 'noshow' && !a.noshowFollowupSent);

  return (
    <div className="space-y-6" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <section className="relative overflow-hidden rounded-[1.8rem] text-white p-6 md:p-8" style={{ background: 'linear-gradient(135deg,#17141f 0%,#1c2748 55%,#12352e 100%)' }}>
        <div className="absolute left-0 top-0 w-56 h-56 rounded-full bg-[#4d7cff]/30 blur-3xl" />
        <div className="absolute right-10 bottom-0 w-40 h-40 rounded-full bg-[#ff6b4a]/25 blur-3xl" />
        <p className="relative text-[11px] tracking-[0.28em] uppercase text-[#22c9a0]">ملء المواعيد الفارغة</p>
        <h1 className="relative font-product text-3xl md:text-4xl mt-1">إنقاذ المواعيد الضائعة</h1>
        <p className="relative text-white/65 text-sm mt-2 max-w-xl">ملخص سريع: مواعيد بحاجة لتأكيد، فترات هادئة، وقائمة انتظار جاهزة للحجز — بضغطة زر.</p>
      </section>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${tab === t.id ? 'text-white border-transparent' : 'bg-white/70 dark:bg-white/5 border-[#e4ddd0] dark:border-white/10 text-stone-600'}`}
            style={tab === t.id ? { background: t.color } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'desk' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="حجوزات تحتاج تأكيد" value={unconfirmed.length} accent="#f0b429" hint="العميلة لم تؤكد الحضور" />
            <Kpi label="مواعيد متاحة اليوم" value={gapsToday.length} accent="#22c9a0" hint="مواعيد لم تُحجز" />
            <Kpi label="مواعيد متاحة غداً" value={gapsTom.length} accent="#22c9a0" hint="مواعيد لم تُحجز" />
            <Kpi label="غياب بدون إشعار" value={risks.length} accent="#ff6b4a" hint="احتمال عدم حضور" />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-[1.5rem] p-5 text-white" style={{ background: '#14121c' }}>
              <p className="text-[11px] tracking-widest uppercase text-[#22c9a0]">تقرير سريع</p>
              <h2 className="font-product text-2xl mt-1 mb-3">ملخص العيادة</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                لديكِ اليوم <b className="text-white">{todayApts.length}</b> مواعيد (منها <b className="text-[#f0b429]">{todayApts.filter((a) => a.status === 'pending').length}</b> بحاجة لتأكيد العميلة)،
                و <b className="text-[#22c9a0]">{gapsTom.length}</b> فترة فارغة غداً يمكن تعبئتها من قائمة الانتظار.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <button className="px-4 py-2 rounded-full bg-[#4d7cff] text-sm font-bold" onClick={() => requestApproval('إرسال تذكيرات للعميلات', { type: 'remind-unconfirmed', ids: unconfirmed.map((a) => a.id) })}>إرسال تذكيرات للعميلات</button>
                <button className="px-4 py-2 rounded-full bg-[#22c9a0] text-[#042f24] text-sm font-bold" onClick={() => requestApproval('إرسال رسائل لملء الغد', { type: 'fill-gaps', count: gapsTom.length })}>إرسال رسائل لملء الغد</button>
              </div>
            </div>
            <div className="lg:col-span-2 saas-card p-5">
              <h3 className="font-product text-lg mb-3">موافقات المديرة</h3>
              {pendingApprovals.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-[#e4ddd0] last:border-0">
                  <span className="text-sm">{a.title}</span>
                  {isAdmin && (
                    <span className="flex gap-1">
                      <button className="w-8 h-8 rounded-full bg-[#22c9a0]/15 text-[#0f766e] flex items-center justify-center" onClick={() => update(ref(database, clinicPath(`opsApprovals/${a.id}`)), { status: 'approved', at: Date.now() })}><FaCheck /></button>
                      <button className="w-8 h-8 rounded-full bg-[#ff6b4a]/15 text-[#c2410c] flex items-center justify-center" onClick={() => update(ref(database, clinicPath(`opsApprovals/${a.id}`)), { status: 'rejected', at: Date.now() })}><FaTimes /></button>
                    </span>
                  )}
                </div>
              ))}
              {!pendingApprovals.length && <p className="text-sm text-stone-400">الطابور فارغ.</p>}
              <p className="text-[11px] text-stone-400 mt-4">سجل: {audit.slice(-4).reverse().map((a) => a.action).join(' · ') || '—'}</p>
            </div>
          </div>

          <div className="saas-card overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between bg-[#4d7cff]/10">
              <h3 className="font-product">حجوزات تحتاج تأكيد العميلة</h3>
              <span className="text-xs font-bold text-[#4d7cff]">{unconfirmed.length}</span>
            </div>
            {unconfirmed.slice(0, 10).map((a) => {
              const due = reminderDue(a, settings);
              return (
                <div key={a.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e4ddd0] text-sm">
                  <div>
                    <p className="font-semibold">{a.customerName}</p>
                    <p className="text-xs text-stone-500">{a.date} · {a.time} · {a.service}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {due[0] && <button onClick={() => sendReminder(a, due[0])} className="px-3 py-1.5 rounded-full bg-[#25d366] text-white text-xs font-bold flex items-center gap-1"><FaWhatsapp /> تذكير</button>}
                    {a.manageToken && <a className="text-xs font-bold text-[#4d7cff]" href={manageUrl(clinicId, a.manageToken)} target="_blank" rel="noreferrer">رابط العميلة</a>}
                  </div>
                </div>
              );
            })}
            {!unconfirmed.length && <p className="p-6 text-sm text-stone-400">لا مواعيد معلّقة.</p>}
          </div>

          {noshowOpen.map((a) => (
            <button key={a.id} onClick={() => followNoshow(a)} className="w-full text-right saas-card p-4 text-sm font-semibold text-[#b45309] hover:bg-[#f0b429]/10">
              متابعة لطيفة بعد فوات موعد {a.customerName}
            </button>
          ))}
        </div>
      )}

      {tab === 'wait' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={addWaitlist} className="saas-card p-6 space-y-3">
            <p className="text-[11px] tracking-widest uppercase text-[#22c9a0]">قائمة الانتظار</p>
            <h3 className="font-product text-2xl">أضيفي عميلة للطابور</h3>
            <input placeholder="الاسم" value={waitForm.name} onChange={(e) => setWaitForm({ ...waitForm, name: e.target.value })} className={field} />
            <input placeholder="الهاتف" value={waitForm.phone} onChange={(e) => setWaitForm({ ...waitForm, phone: e.target.value })} className={field} dir="ltr" />
            <select value={waitForm.serviceId} onChange={(e) => setWaitForm({ ...waitForm, serviceId: e.target.value })} className={field}>
              <option value="">الخدمة والمدة</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.title} {s.duration ? `· ${s.duration}` : ''}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={waitForm.branchId} onChange={(e) => setWaitForm({ ...waitForm, branchId: e.target.value })} className={field}>
                <option value="">الفرع</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={waitForm.specialistId} onChange={(e) => setWaitForm({ ...waitForm, specialistId: e.target.value })} className={field}>
                <option value="">المختصة</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <select value={waitForm.preferredTimes} onChange={(e) => setWaitForm({ ...waitForm, preferredTimes: e.target.value })} className={field}>
              <option value="any">أي وقت</option>
              <option value="morning">صباح</option>
              <option value="afternoon">بعد الظهر</option>
            </select>
            <button className="w-full py-3 rounded-xl bg-[#22c9a0] text-[#042f24] font-bold">إضافة للطابور</button>
          </form>
          <div className="space-y-3">
            <h3 className="font-product text-xl">مواعيد متاحة للملء</h3>
            {openVacancies.map((v) => {
              const matches = rankWaitlist(waitlist, v);
              return (
                <div key={v.id} className="rounded-[1.4rem] p-4 text-white" style={{ background: 'linear-gradient(120deg,#0f766e,#155e75)' }}>
                  <p className="font-product text-lg">{v.service}</p>
                  <p className="text-white/70 text-sm">{v.date} · {v.time}</p>
                  <p className="text-xs mt-2 text-[#a7f3d0]">{matches.length} مطابقة مرتّبة بالملاءمة ثم الأقدمية</p>
                  <button onClick={() => sendOffers(v)} className="mt-3 px-4 py-2 rounded-full bg-white text-[#0f766e] text-sm font-bold">إرسال عروض · {settings.waitlistOfferMinutes} د</button>
                </div>
              );
            })}
            {!openVacancies.length && <div className="saas-card p-8 text-sm text-stone-500">لا مواعيد متاحة للعرض الآن. تظهر هنا فور إلغاء حجز.</div>}
            <div className="saas-card p-4">
              <h4 className="text-xs font-bold text-stone-400 mb-2">الطابور</h4>
              {waitlist.map((w) => (
                <div key={w.id} className="flex justify-between py-2 text-sm border-t border-[#eee8dc] first:border-0">
                  <span>{w.name} · {w.service || '—'}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#4d7cff]/10 text-[#4d7cff]">{w.status === 'waiting' ? 'بالطابور' : w.status === 'offered' ? 'عُرض عليها' : w.status === 'booked' ? 'حُجز' : w.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'risk' && (
        <div className="space-y-3">
          {risks.map((a) => (
            <div key={a.id} className="saas-card p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#ff6b4a] text-white font-product text-xl flex items-center justify-center shrink-0">
                {a.risk.score ?? '—'}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{a.customerName} · {a.date} {a.time}</p>
                <p className="text-xs text-stone-500 mt-1">{a.risk.label} · ثقة {a.risk.confidence}</p>
                <div className="h-1.5 rounded-full bg-[#e4ddd0] mt-2 overflow-hidden">
                  <div className="h-full bg-[#ff6b4a]" style={{ width: `${Math.min(100, a.risk.score || 8)}%` }} />
                </div>
                {a.risk.n < 5 && <p className="text-xs text-[#b45309] mt-2">بيانات قليلة — لا إجراء آلي.</p>}
              </div>
              <button className="px-4 py-2 rounded-full bg-[#14121c] text-white text-sm font-bold" onClick={() => sendReminder(a, a.risk.extraReminderHours)}>مراجعة ثم تذكير</button>
            </div>
          ))}
          {!risks.length && <div className="saas-card p-10 text-center text-stone-400">لا مؤشرات غياب بدون إشعار الآن.</div>}
        </div>
      )}

      {tab === 'revenue' && (
        <div className="space-y-4">
          <div className="rounded-[1.6rem] p-6 md:p-8 text-[#14121c]" style={{ background: 'linear-gradient(135deg,#f0b429,#f6d36b)' }}>
            <p className="text-xs font-bold uppercase tracking-widest">صافي مستعاد</p>
            <p className="font-product text-5xl mt-1">{recovery.net} ₪</p>
            <p className="text-sm mt-2 opacity-80">فعلي {recovery.actual} · تقديري {recovery.estimated} · تكلفة {recovery.cost}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Kpi label="أُعيد ملؤها" value={recovery.filledCount} accent="#4d7cff" />
            <Kpi label="متوسط الملء (د)" value={fills.avgMinutes} accent="#22c9a0" />
            <Kpi label="عيّنات" value={fills.samples} accent="#a78bfa" />
          </div>
          <div className="saas-card p-5 text-sm space-y-2">
            <p>قبل التفعيل: إلغاء {baseline.cancelRate}% / حضور {baseline.attendRate}%</p>
            <p>الآن: إلغاء {rates.cancelRate}% / حضور {rates.attendRate}%</p>
            <p className="text-xs text-stone-400">لا يُحتسب الموعد مرتين لنفس الإلغاء.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={snapshotBaseline} className="px-4 py-2 rounded-full bg-[#14121c] text-white text-sm font-bold">حفظ لقطة قبل</button>
              <button onClick={exportMonthly} className="px-4 py-2 rounded-full border border-[#14121c] text-sm font-bold">تصدير JSON</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'tests' && (
        <div className="saas-card p-6 space-y-4">
          <h3 className="font-product text-2xl">مختبر الرسائل</h3>
          <p className="text-sm text-stone-500">كل حجز يأخذ صيغة أ أو ب. سقف التواصل من القواعد.</p>
          <div className="grid md:grid-cols-2 gap-3">
            {experiments.map((e) => (
              <div key={e.variant} className="rounded-2xl p-4 bg-[#f3efe6] dark:bg-[#1e1b28]">
                <p className="font-product text-xl">صيغة {e.variant}</p>
                <p className="text-sm mt-1">تأكيد {e.confirmRate}% · حضور {e.attendRate}% · {e.n} رسالة</p>
              </div>
            ))}
          </div>
          {experiments.length > 0 && <p className="text-sm font-bold text-[#4d7cff]">الأفضل حضورًا: {[...experiments].sort((a, b) => b.attendRate - a.attendRate)[0]?.variant}</p>}
          <Link to="/winback" className="inline-flex px-4 py-2 rounded-full bg-[#a78bfa] text-white text-sm font-bold">استرجاع المنقطعات</Link>
          <p className="text-xs text-stone-400">عودة الحملات: {wb.returned}/{wb.tagged} ({wb.rate}%)</p>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <Kpi label="حضور %" value={rates.attendRate} accent="#22c9a0" />
            <Kpi label="إلغاء %" value={rates.cancelRate} accent="#ff6b4a" />
            <Kpi label="لم يحضر %" value={rates.noshowRate} accent="#f0b429" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="saas-card p-5">
              <h3 className="font-product mb-3">خدمات تُلغى أكثر</h3>
              {Object.entries(hot.byService).map(([k, n]) => (
                <div key={k} className="flex justify-between text-sm py-1.5"><span>{k}</span><b>{n}</b></div>
              ))}
              {!Object.keys(hot.byService).length && <p className="text-sm text-stone-400">لا بيانات.</p>}
            </div>
            {isAdmin && hasCap('branchCompare') && (
              <div className="saas-card p-5">
                <h3 className="font-product mb-3">الفروع والفريق</h3>
                {compare.map((r) => <p key={r.label} className="text-sm py-1">{r.label} · {r.attended}/{r.total}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'policy' && (
        <div className="saas-card p-6 max-w-2xl space-y-3">
          <h3 className="font-product text-2xl mb-2">قواعد العيادة</h3>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!form.autoConfirm} onChange={(e) => setForm({ ...form, autoConfirm: e.target.checked })} /> تأكيد تلقائي بعد الحجز</label>
          <label className="text-sm block">تذكيرات (ساعات)<input value={form.reminderHoursText ?? (form.reminderHours || []).join(',')} onChange={(e) => setForm({ ...form, reminderHoursText: e.target.value })} className={`${field} mt-1`} /></label>
          <label className="text-sm block">سقف الرسائل<input type="number" value={form.reminderCap} onChange={(e) => setForm({ ...form, reminderCap: Number(e.target.value) })} className={`${field} mt-1`} /></label>
          <label className="text-sm flex items-center gap-2 flex-wrap">تأكيد إضافي فوق
            <input type="number" value={form.highValueAmount} onChange={(e) => setForm({ ...form, highValueAmount: Number(e.target.value) })} className="w-24 p-2 rounded-xl bg-[#f3efe6]" /> ₪
            <input type="checkbox" checked={!!form.extraConfirmEnabled} onChange={(e) => setForm({ ...form, extraConfirmEnabled: e.target.checked })} />
          </label>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!form.depositPolicyEnabled} onChange={(e) => setForm({ ...form, depositPolicyEnabled: e.target.checked })} /> عربون يدوي — بلا غرامة آلية</label>
          <textarea value={form.depositNote} onChange={(e) => setForm({ ...form, depositNote: e.target.value })} className={field} rows={2} />
          <textarea value={form.cancellationPolicy} onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })} className={field} rows={3} />
          <label className="text-sm block">مهلة العرض (د)<input type="number" value={form.waitlistOfferMinutes} onChange={(e) => setForm({ ...form, waitlistOfferMinutes: Number(e.target.value) })} className={`${field} mt-1`} /></label>
          <label className="text-sm block">تكلفة الرسالة ₪<input type="number" step="0.1" value={form.messageCost} onChange={(e) => setForm({ ...form, messageCost: Number(e.target.value) })} className={`${field} mt-1`} /></label>
          <label className="text-sm block">العطل<input value={form.holidays} onChange={(e) => setForm({ ...form, holidays: e.target.value })} className={`${field} mt-1`} /></label>
          <label className="text-sm block">المنطقة الزمنية<input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className={`${field} mt-1`} /></label>
          <p className="text-xs text-stone-400">بيانات هذه العيادة فقط. لا عقوبات آلية.</p>
          <button type="button" onClick={savePolicy} className="px-5 py-3 rounded-xl bg-[#14121c] text-white font-bold">حفظ القواعد</button>
        </div>
      )}
    </div>
  );
};

function Kpi({ label, value, accent, hint }) {
  return (
    <div className="saas-card p-4 relative overflow-hidden">
      <span className="absolute top-0 left-0 w-1.5 h-full" style={{ background: accent }} />
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="font-product text-3xl mt-1">{value}</p>
      {hint && <p className="text-[11px] mt-1" style={{ color: accent }}>{hint}</p>}
    </div>
  );
}

export default FillOps;
