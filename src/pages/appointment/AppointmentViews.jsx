import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp, FaClock, FaPlus } from 'react-icons/fa';
import { ref, onValue, push, set, update } from 'firebase/database';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import {
  mergeAptSettings, DEFAULT_APT_SETTINGS, rankWaitlist, upcomingGaps, reminderDue,
  noshowFollowupBody, waDigits, makeToken, appendHistory,
} from '../../utils/appointmentOps';
import { addDays, toYmd, parseTimeOffset, isFutureSlot } from '../../utils/scheduleSlots';
import { deliverAppointmentReminder } from '../../utils/sendClinicWaReminder';
import WhatsAppRemindersPanel from '../../components/settings/WhatsAppRemindersPanel';
import {
  shiftsFromDay, openShift, shiftMs, dayWorkedMs, monthWorkedMs, monthDaysPresent,
  formatDurationAr, formatHms, clockLabel, monthPrefixFromYmd, monthTitleAr,
} from '../../utils/staffHours';

const field = 'w-full p-3 rounded-xl bg-[#f8faf9] border border-[#e4eee8] outline-none focus:ring-2 focus:ring-emerald-200 text-sm';

const WAIT_STATUS = {
  waiting: { label: 'بالطابور', chip: 'nura-chip-lilac', card: 'stat-card-lilac' },
  offered: { label: 'عُرض عليها', chip: 'nura-chip-gold', card: 'stat-card-gold' },
  booked: { label: 'حُجز', chip: 'nura-chip-mint', card: 'stat-card-mint' },
};

function waitAgo(ts) {
  if (!ts) return '';
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

function preferredLabel(value) {
  if (value === 'morning') return 'صباح';
  if (value === 'afternoon') return 'بعد الظهر';
  return 'أي وقت';
}

function useAptDesk() {
  const { clinicPath, clinicId, clinicInfo } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settingsRaw, setSettingsRaw] = useState(null);
  const [form, setForm] = useState(DEFAULT_APT_SETTINGS);
  const [waitForm, setWaitForm] = useState({
    name: '', phone: '', serviceId: '', branchId: '', specialistId: '', preferredTimes: 'any',
  });

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
        setStaff(list);
      }, fail),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => {
        const val = s.val();
        setSettingsRaw(val);
        setForm(mergeAptSettings(val));
      }, fail),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicPath]);

  const today = new Date();
  const todayStr = toYmd(today);
  const tomStr = toYmd(addDays(today, 1));
  const openVacancies = vacancies.filter((v) => v.open && isFutureSlot(v.date, v.time, today));
  const gapsToday = upcomingGaps({ schedules, appointments, branches, dateStr: todayStr });
  const gapsTom = upcomingGaps({ schedules, appointments, branches, dateStr: tomStr });

  const logAudit = async (action, detail) => {
    await push(ref(database, clinicPath('appointmentAudit')), { action, detail, at: Date.now() });
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
        price: 0,
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

  const offerFromGap = async (gap) => {
    if (!rankWaitlist(waitlist, gap).length) return toast.info('لا تطابق في قائمة الانتظار');
    const rec = {
      open: true,
      date: gap.date,
      time: gap.time,
      branchId: gap.branchId || '',
      specialistId: gap.specialistId || '',
      branchName: gap.branchName || '',
      service: gap.service || '',
      createdAt: Date.now(),
      fromSchedule: true,
    };
    const snap = await push(ref(database, clinicPath('waitlistEvents')), rec);
    await sendOffers({ id: snap.key, ...rec });
  };

  const sendReminder = async (apt, hoursKey) => {
    const count = Object.keys(apt.remindersSent || {}).length;
    if (count >= Number(settings.reminderCap || 3)) return toast.info('بلغ سقف التواصل لهذا الموعد');
    const result = await deliverAppointmentReminder({
      clinicId,
      clinicName: clinicInfo?.name,
      apt,
      hoursKey,
    });
    if (result.skipped === 'opt_out') return toast.info('العميلة أوقفت التواصل');
    if (result.skipped === 'duplicate') return toast.info('أُرسل هذا التذكير مسبقاً');
    if (result.channel === 'twilio') toast.success('أُرسل القالب المعتمد عبر Twilio');
    else if (result.channel === 'wa.me') toast.info(result.skipped === 'pending_approval' ? 'القالب بانتظار الاعتماد — فُتح واتساب اليدوي' : 'فُتح واتساب اليدوي لأن الإرسال عبر Twilio غير جاهز');
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
      remindersSent: { ...(apt.remindersSent || {}), [String(hoursKey)]: Date.now() },
      messageCount: (apt.messageCount || 0) + 1,
      history: appendHistory(apt, { action: 'reminder', hours: hoursKey, channel: result.channel }),
    });
    await logAudit('reminder', { appointmentId: apt.id, channel: result.channel });
  };

  const followNoshow = async (apt) => {
    if (apt.noshowFollowupSent) return toast.info('أُرسلت متابعة مسبقاً');
    const body = noshowFollowupBody(clinicInfo?.name, apt, clinicId);
    window.open(`https://wa.me/${waDigits(apt.phoneNumber)}?text=${encodeURIComponent(body)}`, '_blank');
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
      noshowFollowupSent: true,
      messageCount: (apt.messageCount || 0) + 1,
    });
  };

  const savePolicy = async () => {
    const reminderHours = String(form.reminderHoursText || (form.reminderHours || []).join(','))
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => n > 0);
    await set(ref(database, clinicPath('appointmentSettings')), { ...form, reminderHours });
    toast.success('حُفظت سياسة المواعيد');
  };

  const patchApt = async (apt, data, historyEntry) => {
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
      ...data,
      history: appendHistory(apt, historyEntry),
    });
  };

  return {
    clinicPath, clinicId, clinicInfo, appointments, waitlist, vacancies, schedules, branches, services, staff,
    settings, form, setForm, waitForm, setWaitForm, todayStr, tomStr, openVacancies, gapsToday, gapsTom,
    addWaitlist, sendOffers, offerFromGap, sendReminder, followNoshow, savePolicy, patchApt,
  };
}

export function WaitlistView() {
  const d = useAptDesk();
  const [filter, setFilter] = useState('all');
  const waiting = d.waitlist.filter((w) => w.status === 'waiting');
  const offered = d.waitlist.filter((w) => w.status === 'offered');
  const booked = d.waitlist.filter((w) => w.status === 'booked');
  const visible = (filter === 'all' ? d.waitlist : d.waitlist.filter((w) => w.status === filter))
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const staffName = (id) => d.staff.find((s) => s.id === id)?.name;
  const branchName = (id) => d.branches.find((b) => b.id === id)?.name;
  const filters = [
    { id: 'waiting', label: 'بالطابور', n: waiting.length },
    { id: 'offered', label: 'عُرض عليها', n: offered.length },
    { id: 'booked', label: 'حُجز', n: booked.length },
    { id: 'all', label: 'الكل', n: d.waitlist.length },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">قائمة الانتظار</h1>
          <p className="text-sm text-[#8a9199] mt-1">الطابور الحقيقي للعيادة — أول من يناسب الشاغر يُعرض عليها الموعد.</p>
        </div>
        <Link to="/appointments/gaps" className="nura-chip nura-chip-sky">المواعيد المتاحة</Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="saas-card stat-card-lilac p-4">
          <p className="text-[12px] text-[#6d28d9]">بالطابور</p>
          <p className="stat-num text-[28px] leading-none mt-2">{waiting.length}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-[12px] text-[#b45309]">عُرض عليها</p>
          <p className="stat-num text-[28px] leading-none mt-2">{offered.length}</p>
        </div>
        <div className="saas-card stat-card-mint p-4">
          <p className="text-[12px] text-[#047857]">حُجز من الطابور</p>
          <p className="stat-num text-[28px] leading-none mt-2">{booked.length}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-[12px] text-[#0369a1]">شواغر مفتوحة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{d.openVacancies.length}</p>
        </div>
      </div>

      {d.openVacancies.length > 0 && (
        <section className="saas-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-bold text-[#111827]">شواغر جاهزة للعرض</h2>
            <span className="text-xs text-[#8a9199]">يُرسل العرض لأعلى 5 تطابقاً · مهلة {d.settings.waitlistOfferMinutes} د</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {d.openVacancies.slice(0, 6).map((v) => {
              const matches = rankWaitlist(d.waitlist, v);
              return (
                <div key={v.id} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                  <p className="font-bold text-sm text-[#111827]">{v.service || 'ساعة شاغرة'}</p>
                  <p className="text-xs text-[#0369a1] mt-1">{v.date} · {v.time}{v.branchName ? ` · ${v.branchName}` : ''}</p>
                  <p className="text-xs text-[#8a9199] mt-2">{matches.length} عميلة تناسب هذا الشاغر</p>
                  <button
                    type="button"
                    onClick={() => d.sendOffers(v)}
                    disabled={!matches.length}
                    className="mt-3 w-full py-2 rounded-xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-40"
                  >
                    إرسال عروض
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_20rem] gap-4 items-start">
        <section className="saas-card p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  filter === f.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {f.label} {f.n}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {visible.map((w, i) => {
              const st = WAIT_STATUS[w.status] || WAIT_STATUS.waiting;
              const matches = d.openVacancies.filter((v) => rankWaitlist([w], v).length).length;
              return (
                <article key={w.id} className={`rounded-2xl border p-4 ${st.card}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/80 text-[#6d28d9] font-bold flex items-center justify-center shrink-0">
                      {w.status === 'waiting' ? i + 1 : (w.name || 'ع').trim().charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-[#111827] truncate">{w.name || 'عميلة'}</p>
                        <span className={`nura-chip ${st.chip}`}>{st.label}</span>
                      </div>
                      <p className="text-sm text-[#6b7280] mt-1">{w.service || 'بدون خدمة'}{w.duration ? ` · ${w.duration}` : ''}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#8a9199] mt-2">
                        {w.phone && <span dir="ltr">{w.phone}</span>}
                        {branchName(w.branchId) && <span>{branchName(w.branchId)}</span>}
                        {staffName(w.specialistId) && <span>{staffName(w.specialistId)}</span>}
                        <span>{preferredLabel(w.preferredTimes)}</span>
                        {w.createdAt && (
                          <span className="inline-flex items-center gap-1"><FaClock className="text-[10px]" /> {waitAgo(w.createdAt)}</span>
                        )}
                      </div>
                      {matches > 0 && w.status !== 'booked' && (
                        <p className="text-[12px] font-bold text-sky-700 mt-2">{matches} شاغر يناسبها الآن</p>
                      )}
                    </div>
                    {w.phone && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/${waDigits(w.phone)}`, '_blank')}
                        className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shrink-0"
                        aria-label="واتساب"
                      >
                        <FaWhatsapp />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {!visible.length && (
              <div className="text-center py-12">
                <p className="font-bold text-[#111827]">لا أحد في هذا التبويب</p>
                <p className="text-sm text-[#8a9199] mt-1">أضيفي عميلة من البطاقة الجانبية حتى يظهر الطابور هنا.</p>
              </div>
            )}
          </div>
        </section>

        <form onSubmit={d.addWaitlist} className="saas-card p-5 space-y-3 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><FaPlus className="text-xs" /></span>
            <h2 className="font-bold text-[#111827]">إضافة للطابور</h2>
          </div>
          <label className="block text-xs font-bold text-[#6b7280]">الاسم
            <input value={d.waitForm.name} onChange={(e) => d.setWaitForm({ ...d.waitForm, name: e.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-bold text-[#6b7280]">الهاتف
            <input value={d.waitForm.phone} onChange={(e) => d.setWaitForm({ ...d.waitForm, phone: e.target.value })} className={`${field} mt-1`} dir="ltr" />
          </label>
          <label className="block text-xs font-bold text-[#6b7280]">الخدمة
            <select value={d.waitForm.serviceId} onChange={(e) => d.setWaitForm({ ...d.waitForm, serviceId: e.target.value })} className={`${field} mt-1`}>
              <option value="">اختاري الخدمة</option>
              {d.services.map((s) => <option key={s.id} value={s.id}>{s.title} {s.duration ? `· ${s.duration}` : ''}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-[#6b7280]">الفرع
              <select value={d.waitForm.branchId} onChange={(e) => d.setWaitForm({ ...d.waitForm, branchId: e.target.value })} className={`${field} mt-1`}>
                <option value="">أي فرع</option>
                {d.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#6b7280]">المختصة
              <select value={d.waitForm.specialistId} onChange={(e) => d.setWaitForm({ ...d.waitForm, specialistId: e.target.value })} className={`${field} mt-1`}>
                <option value="">أي مختصة</option>
                {d.staff.filter((s) => s.role !== 'admin').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-bold text-[#6b7280]">الوقت المفضّل
            <select value={d.waitForm.preferredTimes} onChange={(e) => d.setWaitForm({ ...d.waitForm, preferredTimes: e.target.value })} className={`${field} mt-1`}>
              <option value="any">أي وقت</option>
              <option value="morning">صباح</option>
              <option value="afternoon">بعد الظهر</option>
            </select>
          </label>
          <button type="submit" className="w-full py-3 rounded-xl bg-[#10b981] text-white font-bold">إضافة للطابور</button>
        </form>
      </div>
    </div>
  );
}

function groupGaps(gaps, staff) {
  const map = {};
  (gaps || []).forEach((g) => {
    const key = `${g.date}|${g.specialistId || ''}|${g.branchId || ''}`;
    if (!map[key]) {
      map[key] = {
        date: g.date,
        specialistId: g.specialistId,
        branchId: g.branchId,
        branchName: g.branchName,
        specialistName: staff.find((s) => s.id === g.specialistId)?.name || 'بدون تعيين',
        slots: [],
      };
    }
    map[key].slots.push(g);
  });
  Object.values(map).forEach((row) => {
    row.slots.sort((a, b) => (parseTimeOffset(a.time) ?? 99) - (parseTimeOffset(b.time) ?? 99));
  });
  return Object.values(map);
}

export function GapsView() {
  const d = useAptDesk();
  const [tab, setTab] = useState('today');
  const [staffFilter, setStaffFilter] = useState('all');
  const staffList = d.staff.filter((s) => s.role !== 'admin');
  const byStaff = (list) => (staffFilter === 'all' ? list : list.filter((g) => g.specialistId === staffFilter));
  const todayGaps = byStaff(d.gapsToday);
  const tomGaps = byStaff(d.gapsTom);
  const vacancies = byStaff(d.openVacancies);
  const waiting = d.waitlist.filter((w) => w.status === 'waiting' || w.status === 'offered').length;
  const matchCount = (slot) => rankWaitlist(d.waitlist, slot).length;
  const groups = groupGaps(tab === 'tomorrow' ? tomGaps : todayGaps, d.staff);
  const tabs = [
    { id: 'today', label: 'اليوم', n: todayGaps.length },
    { id: 'tomorrow', label: 'غداً', n: tomGaps.length },
    { id: 'cancelled', label: 'بعد إلغاء', n: vacancies.length },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">المواعيد المتاحة</h1>
          <p className="text-sm text-[#8a9199] mt-1">ساعات الجدول الفارغة، والشواغر بعد إلغاء — للعرض على الطابور.</p>
        </div>
        <Link to="/appointments/waitlist" className="nura-chip nura-chip-lilac">قائمة الانتظار</Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="saas-card stat-card-sky p-4">
          <p className="text-[12px] text-[#0369a1]">فراغ اليوم</p>
          <p className="stat-num text-[28px] leading-none mt-2">{d.gapsToday.length}</p>
        </div>
        <div className="saas-card stat-card-mint p-4">
          <p className="text-[12px] text-[#047857]">فراغ غداً</p>
          <p className="stat-num text-[28px] leading-none mt-2">{d.gapsTom.length}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-[12px] text-[#b45309]">بعد إلغاء</p>
          <p className="stat-num text-[28px] leading-none mt-2">{d.openVacancies.length}</p>
        </div>
        <div className="saas-card stat-card-lilac p-4">
          <p className="text-[12px] text-[#6d28d9]">بالطابور</p>
          <p className="stat-num text-[28px] leading-none mt-2">{waiting}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                tab === t.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {t.label} {t.n}
            </button>
          ))}
        </div>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="px-3 py-2 rounded-2xl bg-white border border-[#e4eee8] text-sm font-bold"
        >
          <option value="all">كل الفريق</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {tab === 'cancelled' && (
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {vacancies.map((v) => {
            const n = matchCount(v);
            return (
              <article key={v.id} className="saas-card stat-card-gold p-4">
                <p className="font-bold text-[#111827]">{v.service || 'ساعة شاغرة'}</p>
                <p className="text-sm text-[#b45309] mt-1">{v.date} · {v.time}{v.branchName ? ` · ${v.branchName}` : ''}</p>
                <p className="text-xs text-[#8a9199] mt-2">{n} عميلة في الطابور تناسب هذا الموعد</p>
                <button
                  type="button"
                  onClick={() => d.sendOffers(v)}
                  disabled={!n}
                  className="mt-3 w-full py-2 rounded-xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-40"
                >
                  إرسال عروض · {d.settings.waitlistOfferMinutes} د
                </button>
              </article>
            );
          })}
          {!vacancies.length && (
            <div className="saas-card p-10 text-center md:col-span-2 xl:col-span-3">
              <p className="font-bold text-[#111827]">لا شاغر من إلغاء الآن</p>
              <p className="text-sm text-[#8a9199] mt-1">عند إلغاء موعد يظهر هنا حتى يُعرض على الطابور.</p>
            </div>
          )}
        </section>
      )}

      {tab !== 'cancelled' && (
        <div className="space-y-3">
          {groups.map((row) => (
            <section key={`${row.date}-${row.specialistId}-${row.branchId}`} className="saas-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                    {(row.specialistName || 'ع').trim().charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827]">{row.specialistName}</p>
                    <p className="text-xs text-[#8a9199]">{row.date}{row.branchName ? ` · ${row.branchName}` : ''} · {row.slots.length} ساعة</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.slots.map((slot) => {
                  const n = matchCount(slot);
                  return (
                    <button
                      key={`${slot.time}-${slot.specialistId}`}
                      type="button"
                      onClick={() => d.offerFromGap(slot)}
                      className={`min-w-[6.5rem] text-right rounded-2xl border px-3 py-2.5 ${
                        n ? 'bg-violet-50 border-violet-100' : 'bg-[#f8faf9] border-[#e4eee8]'
                      }`}
                    >
                      <p className="text-sm font-bold text-[#111827]">{slot.time}</p>
                      <p className={`text-[11px] mt-0.5 ${n ? 'text-violet-700 font-bold' : 'text-[#8a9199]'}`}>
                        {n ? `${n} بالطابور` : 'بدون تطابق'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!groups.length && (
            <div className="saas-card p-10 text-center">
              <p className="font-bold text-[#111827]">لا ساعات فارغة في هذا اليوم</p>
              <p className="text-sm text-[#8a9199] mt-1">الفراغ يُحسب من دوام الموظفات ناقص الحجوزات غير الملغاة.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RemindersView() {
  const d = useAptDesk();
  const due = d.appointments.filter((a) => reminderDue(a, d.settings).length > 0);
  const pending = d.appointments.filter((a) => a.status === 'pending' && a.date >= d.todayStr);

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div>
        <h1 className="font-product text-2xl md:text-3xl">التذكيرات والقواعد</h1>
        <p className="text-stone-500 text-sm mt-1">تذكيرات مستحقة، قواعد العيادة، وقوالب واتساب للتأكيد والتذكير والإلغاء.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <h3 className="font-product text-xl">تذكيرات مستحقة</h3>
          {due.map((a) => {
            const hours = reminderDue(a, d.settings)[0];
            return (
              <div key={a.id} className="saas-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{a.customerName}</p>
                  <p className="text-xs text-stone-500">{a.date} · {a.time} · {a.service}</p>
                </div>
                <button type="button" onClick={() => d.sendReminder(a, hours)} className="px-4 py-2 rounded-full bg-[#172B3A] text-white text-sm font-bold">
                  تذكير واتساب · {hours}س
                </button>
              </div>
            );
          })}
          {!due.length && <div className="saas-card p-8 text-sm text-stone-400">لا تذكير داخل النافذة الآن.</div>}
          <h3 className="font-product text-xl pt-2">تحتاج تأكيد العميلة</h3>
          {pending.map((a) => (
            <div key={a.id} className="saas-card p-4 flex justify-between gap-3 text-sm">
              <span>{a.customerName} · {a.date} {a.time}</span>
              <button type="button" onClick={() => d.sendReminder(a, 'confirm')} className="text-[#172B3A] font-bold">تذكير تأكيد</button>
            </div>
          ))}
          {!pending.length && <p className="text-sm text-stone-400">لا حجوزات معلّقة قادمة.</p>}
        </div>
        <div className="saas-card p-6 space-y-3">
          <h3 className="font-product text-2xl mb-2">قواعد العيادة</h3>
          <p className="text-xs text-stone-500 -mt-1">هذه القواعد تشغّل قوالب واتساب في الأسفل: متى يُرسل التأكيد، والتذكير، والإلغاء.</p>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={!!d.form.autoConfirm} onChange={(e) => d.setForm({ ...d.form, autoConfirm: e.target.checked })} />
            تأكيد تلقائي بعد الحجز (قالب التأكيد)
          </label>
          <label className="text-sm block">تذكيرات واتساب — قبل الموعد بكم ساعة
            <input
              value={d.form.reminderHoursText ?? (d.form.reminderHours || []).join(',')}
              onChange={(e) => d.setForm({ ...d.form, reminderHoursText: e.target.value })}
              className={`${field} mt-1`}
              placeholder="24, 3"
            />
          </label>
          <p className="text-[11px] text-stone-400 -mt-1">24 فما فوق = قالب «قبل 24 ساعة». أقل من 18 = قالب «يوم الموعد».</p>
          <label className="text-sm block">سقف الرسائل لكل موعد (يمنع تكرار القالب)
            <input type="number" value={d.form.reminderCap} onChange={(e) => d.setForm({ ...d.form, reminderCap: Number(e.target.value) })} className={`${field} mt-1`} />
          </label>
          <textarea value={d.form.cancellationPolicy} onChange={(e) => d.setForm({ ...d.form, cancellationPolicy: e.target.value })} className={field} rows={3} />
          <label className="text-sm block">مهلة العرض (د)
            <input type="number" value={d.form.waitlistOfferMinutes} onChange={(e) => d.setForm({ ...d.form, waitlistOfferMinutes: Number(e.target.value) })} className={`${field} mt-1`} />
          </label>
          <label className="text-sm block">المنطقة الزمنية
            <input value={d.form.timezone} onChange={(e) => d.setForm({ ...d.form, timezone: e.target.value })} className={`${field} mt-1`} />
          </label>
          <p className="text-xs text-stone-400">بيانات هذه العيادة فقط. لا عقوبات آلية.</p>
          <button type="button" onClick={d.savePolicy} className="px-5 py-3 rounded-xl bg-[#172B3A] text-white font-bold">حفظ القواعد</button>
        </div>
      </div>
      <WhatsAppRemindersPanel
        policy={{
          ...d.form,
          reminderHoursText: d.form.reminderHoursText ?? (d.form.reminderHours || []).join(','),
        }}
      />
    </div>
  );
}

export function AttendanceView() {
  const d = useAptDesk();
  const { user, userMeta } = useAuth();
  const [byDate, setByDate] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState('clients');
  const todayApts = d.appointments.filter((a) => a.date === d.todayStr);
  const expected = todayApts
    .filter((a) => ['pending', 'confirmed', 'rescheduled'].includes(a.status))
    .slice()
    .sort((a, b) => (parseTimeOffset(a.time) ?? 99) - (parseTimeOffset(b.time) ?? 99));
  const arrived = todayApts.filter((a) => a.status === 'attended');
  const missed = todayApts.filter((a) => a.status === 'noshow');
  const monthKey = monthPrefixFromYmd(d.todayStr);
  const attendance = byDate[d.todayStr] || {};

  useEffect(() => {
    if (!d.clinicPath) return undefined;
    return onValue(ref(database, d.clinicPath('staffAttendance')), (s) => {
      setByDate(s.val() || {});
    });
  }, [d.clinicPath]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const people = useMemo(() => {
    const map = new Map();
    d.staff.forEach((s) => map.set(s.id, s));
    if (user?.uid && !map.has(user.uid)) {
      map.set(user.uid, {
        id: user.uid,
        name: userMeta?.name || d.clinicInfo?.name || 'حسابي',
        role: userMeta?.role,
      });
    }
    const list = [...map.values()];
    list.sort((a, b) => {
      if (a.id === user?.uid) return -1;
      if (b.id === user?.uid) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
    return list;
  }, [d.staff, d.clinicInfo?.name, user?.uid, userMeta?.name, userMeta?.role]);

  const workingCount = people.filter((p) => openShift(attendance[p.id])).length;

  const stamp = async (person, kind) => {
    if (!person?.id) return;
    const dayPath = d.clinicPath(`staffAttendance/${d.todayStr}/${person.id}`);
    const row = attendance[person.id];
    const open = openShift(row);
    if (kind === 'start') {
      if (open) return toast.info('الشغل بدأ مسبقاً — أغلقي الوردية قبل بدء واحدة جديدة');
      await update(ref(database, dayPath), {
        userId: person.id,
        name: person.name || '',
        role: person.role || '',
        category: person.category || '',
      });
      await push(ref(database, `${dayPath}/shifts`), { startAt: Date.now(), endAt: null });
      toast.success(`بدأ العمل الساعة ${clockLabel(Date.now())}`);
    } else {
      if (!open?.id || open.id === 'legacy') {
        if (row?.inAt && !row?.outAt) {
          await update(ref(database, dayPath), { outAt: Date.now() });
          toast.success(`أُغلق العمل الساعة ${clockLabel(Date.now())}`);
          return;
        }
        return toast.info('ابدئي العمل أولاً حتى تُسجَّل ساعة الدخول');
      }
      await update(ref(database, `${dayPath}/shifts/${open.id}`), { endAt: Date.now() });
      toast.success(`أُغلق العمل الساعة ${clockLabel(Date.now())}`);
    }
  };

  const markClient = async (apt, status) => {
    await d.patchApt(apt, { status }, { action: 'status', from: apt.status, to: status });
    toast.success(status === 'attended' ? 'سُجّل حضور العلاج' : 'سُجّل عدم الحضور');
  };

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">الحضور</h1>
          <p className="text-sm text-[#8a9199] mt-1">حضور العميلات للعلاج اليوم، وبدء/إغلاق شغل الفريق مع ساعات الشهر.</p>
        </div>
        <Link to="/appointments" className="nura-chip nura-chip-sky">التقويم</Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="saas-card stat-card-sky p-4">
          <p className="text-[12px] text-[#0369a1]">بانتظار الحضور</p>
          <p className="stat-num text-[28px] leading-none mt-2">{expected.length}</p>
        </div>
        <div className="saas-card stat-card-mint p-4">
          <p className="text-[12px] text-[#047857]">حضرت</p>
          <p className="stat-num text-[28px] leading-none mt-2">{arrived.length}</p>
        </div>
        <div className="saas-card stat-card-rose p-4">
          <p className="text-[12px] text-[#be123c]">لم تحضر</p>
          <p className="stat-num text-[28px] leading-none mt-2">{missed.length}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-[12px] text-[#b45309]">في الشغل الآن</p>
          <p className="stat-num text-[28px] leading-none mt-2">{workingCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'clients', label: 'العميلات', n: expected.length + arrived.length + missed.length },
          { id: 'staff', label: 'الفريق', n: people.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              tab === t.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            {t.label} {t.n}
          </button>
        ))}
      </div>

      {tab === 'clients' && (
        <div className="space-y-3">
          {expected.map((a) => (
            <article key={a.id} className="saas-card stat-card-sky p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white text-sky-700 font-bold flex items-center justify-center shrink-0">
                {(a.customerName || 'ع').trim().charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#111827] truncate">{a.customerName}</p>
                <p className="text-xs text-[#0369a1] mt-0.5">{a.time} · {a.service || '—'}{a.specialistName ? ` · ${a.specialistName}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => markClient(a, 'attended')} className="px-3 py-2 rounded-xl bg-[#10b981] text-white text-sm font-bold">حضرت</button>
                <button type="button" onClick={() => markClient(a, 'noshow')} className="nura-chip nura-chip-rose">لم تحضر</button>
              </div>
            </article>
          ))}
          {!expected.length && (
            <div className="saas-card p-10 text-center">
              <p className="font-bold text-[#111827]">لا مواعيد تنتظر الحضور اليوم</p>
              <p className="text-sm text-[#8a9199] mt-1">المعلّق والمؤكد والمُعاد جدولته يظهر هنا.</p>
            </div>
          )}
          {arrived.length > 0 && (
            <section className="saas-card stat-card-mint p-4">
              <h3 className="font-bold text-emerald-800 mb-2">حضرت للعلاج</h3>
              {arrived.map((a) => (
                <p key={a.id} className="text-sm py-1.5 border-t border-emerald-100 first:border-0">{a.time} · {a.customerName} · {a.service || '—'}</p>
              ))}
            </section>
          )}
          {missed.length > 0 && (
            <section className="saas-card stat-card-rose p-4">
              <h3 className="font-bold text-rose-700 mb-2">لم تحضر</h3>
              {missed.map((a) => (
                <div key={a.id} className="flex justify-between gap-2 py-1.5 text-sm border-t border-rose-100 first:border-0">
                  <span>{a.time} · {a.customerName}</span>
                  {!a.noshowFollowupSent && (
                    <button type="button" className="font-bold text-rose-700" onClick={() => d.followNoshow(a)}>متابعة واتساب</button>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-3">
          {people.map((s) => {
            const row = attendance[s.id];
            const shifts = shiftsFromDay(row);
            const open = openShift(row);
            const todayMs = dayWorkedMs(row, now, { live: true });
            const monthMs = monthWorkedMs(byDate, s.id, monthKey, now);
            const days = monthDaysPresent(byDate, s.id, monthKey);
            const liveMs = open ? shiftMs(open, now) : todayMs;
            return (
              <article key={s.id} className={`saas-card p-4 space-y-3 ${open ? 'stat-card-mint' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl font-bold flex items-center justify-center shrink-0 ${open ? 'bg-white text-emerald-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {(s.name || 'م').trim().charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#111827] truncate">{s.name}{s.id === user?.uid ? ' · أنتِ' : ''}</p>
                    {open ? (
                      <p className="text-xs text-emerald-700 mt-1">في الشغل منذ {clockLabel(open.startAt)}</p>
                    ) : shifts.length ? (
                      <p className="text-xs text-[#8a9199] mt-1">آخر إغلاق {clockLabel(shifts[shifts.length - 1].endAt)}</p>
                    ) : (
                      <p className="text-xs text-[#8a9199] mt-1">لم يبدأ العمل بعد</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button type="button" onClick={() => stamp(s, 'start')} disabled={!!open} className="px-3 py-2 rounded-xl bg-[#10b981] text-white text-xs font-bold disabled:opacity-40">
                      بدء العمل
                    </button>
                    <button type="button" onClick={() => stamp(s, 'close')} disabled={!open} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold disabled:opacity-40">
                      إغلاق العمل
                    </button>
                  </div>
                </div>
                <div className={`rounded-2xl px-4 py-3 text-center ${open ? 'bg-white' : 'bg-[#f8faf9]'}`}>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[#8a9199]">{open ? 'الوردية الحالية' : 'عداد اليوم'}</p>
                  <p className="text-[34px] font-bold text-emerald-700 leading-none mt-1 tabular-nums" dir="ltr">{formatHms(liveMs)}</p>
                  <p className="text-[11px] text-[#8a9199] mt-2">اليوم {formatDurationAr(todayMs)} · الشهر {formatDurationAr(monthMs)}</p>
                </div>
                {shifts.length > 0 && (
                  <ul className="text-xs text-[#6b7280] space-y-1 border-t border-emerald-100 pt-2">
                    {shifts.map((sh) => (
                      <li key={sh.id}>
                        دخول {clockLabel(sh.startAt)}
                        {sh.endAt ? ` → إغلاق ${clockLabel(sh.endAt)} · ${formatDurationAr(sh.endAt - sh.startAt)}` : ' → ما زالت في الشغل'}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-[#8a9199]">{monthTitleAr(monthKey)}: {formatDurationAr(monthMs)} · {days} يوم حضور</p>
              </article>
            );
          })}
          {!people.length && (
            <div className="saas-card p-10 text-center">
              <p className="font-bold text-[#111827]">لا حسابات فريق في السجل</p>
            </div>
          )}
          <section className="saas-card p-4">
            <h3 className="font-bold text-[#111827] mb-2">ساعات {monthTitleAr(monthKey)}</h3>
            {people.map((s) => (
              <div key={s.id} className="flex justify-between text-sm py-2 border-t border-[#e4eee8] first:border-0">
                <span>{s.name}</span>
                <b className="text-emerald-700">{formatDurationAr(monthWorkedMs(byDate, s.id, monthKey, now))}</b>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
