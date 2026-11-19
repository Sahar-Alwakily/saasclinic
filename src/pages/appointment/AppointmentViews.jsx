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
  noshowFollowupBody, waDigits, makeToken, appendHistory, BOOKABLE_STATUSES,
} from '../../utils/appointmentOps';
import { addDays, toYmd, parseTimeOffset, isFutureSlot } from '../../utils/scheduleSlots';
import { deliverAppointmentReminder, deliverUtilityNotice } from '../../utils/sendClinicWaReminder';
import WhatsAppRemindersPanel from '../../components/settings/WhatsAppRemindersPanel';
import {
  shiftsFromDay, openShift, shiftMs, dayWorkedMs, monthWorkedMs, monthDaysPresent,
  formatDurationAr, formatHms, clockLabel, monthPrefixFromYmd, monthTitleAr,
} from '../../utils/staffHours';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0FA3A3]';
const panel = 'rounded-xl border border-[#E4EAEE] bg-white';
const seg = (on) => `rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${on ? 'bg-[#ECFEFF] text-[#0E7490]' : 'text-[#64748B] hover:text-[#334155]'}`;

const WAIT_STATUS = {
  waiting: { label: 'بالطابور', accent: '#B45309', soft: '#FFFBEB', softBorder: '#F3E2C2', ink: '#B45309' },
  offered: { label: 'عُرض عليها', accent: '#0FA3A3', soft: '#ECFEFF', softBorder: '#C6EEEE', ink: '#0E7490' },
  booked: { label: 'حُجز', accent: '#059669', soft: '#ECFDF5', softBorder: '#C9EEE0', ink: '#047857' },
};

function StatStrip({ items }) {
  return (
    <section className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={[
            'px-5 py-4',
            i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '',
            i > 1 ? 'border-t border-[#E4EAEE]' : '',
            'lg:border-t-0',
            i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : '',
          ].join(' ')}
        >
          <p className="text-[11px] text-[#64748B]">{it.label}</p>
          <p className="mt-1.5 text-[30px] font-light leading-none tabular-nums tracking-tight" style={{ color: it.accent }}>{it.value}</p>
          {it.note && <p className="mt-1.5 truncate text-[10.5px] text-[#7C8A99]">{it.note}</p>}
        </div>
      ))}
    </section>
  );
}

function EmptyNote({ title, hint }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[12.5px] font-bold text-[#334155]">{title}</p>
      {hint && <p className="mt-1 text-[11px] text-[#94A3B8]">{hint}</p>}
    </div>
  );
}

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
      const notice = await deliverUtilityNotice({
        clinicId,
        eventId: 'waitlist',
        toPhone: entry.phone,
        idempotencyKey: token,
        vars: {
          1: entry.name || 'عميلتنا',
          2: clinicInfo?.name || 'العيادة',
          3: `${vacancy.date} ${vacancy.time}`,
          4: url,
        },
      });
      if (!notice.ok) {
        const body = `شاغر مناسب لجلسة ${vacancy.service} يوم ${vacancy.date} ${vacancy.time}. للقبول خلال ${settings.waitlistOfferMinutes} دقيقة: ${url}`;
        window.open(`https://wa.me/${waDigits(entry.phone)}?text=${encodeURIComponent(body)}`, '_blank');
      }
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
    const reminderHours = String(form.reminderHoursText ?? (form.reminderHours || []).join(','))
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => n > 0);
    if (!reminderHours.length) return toast.error('اكتبي ساعة واحدة على الأقل، مثل 24, 3');
    const rest = { ...form };
    delete rest.reminderHoursText;
    try {
      await set(ref(database, clinicPath('appointmentSettings')), { ...rest, reminderHours });
      setForm((prev) => ({ ...prev, reminderHours, reminderHoursText: undefined }));
      toast.success('حُفظت قواعد المواعيد');
    } catch {
      toast.error('تعذّر حفظ القواعد');
    }
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
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/appointments" className="text-[11px] font-bold tracking-wide text-[#94A3B8] hover:text-[#0E7490]">المواعيد ←</Link>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">قائمة الانتظار</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">الطابور الحقيقي للعيادة — أول من يناسب الشاغر يُعرض عليها الموعد.</p>
        </div>
        <Link to="/appointments/gaps" className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">المواعيد المتاحة</Link>
      </header>

      <StatStrip
        items={[
          { label: 'بالطابور', value: waiting.length, note: 'بانتظار شاغر مناسب', accent: '#B45309' },
          { label: 'عُرض عليها', value: offered.length, note: `مهلة العرض ${d.settings.waitlistOfferMinutes} د`, accent: '#0FA3A3' },
          { label: 'حُجز من الطابور', value: booked.length, note: 'تحوّلت إلى موعد', accent: '#059669' },
          { label: 'شواغر مفتوحة', value: d.openVacancies.length, note: 'جاهزة للعرض الآن', accent: '#0E7490' },
        ]}
      />

      {d.openVacancies.length > 0 && (
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEE] px-5 py-3.5">
            <h2 className="text-[14px] font-extrabold">شواغر جاهزة للعرض</h2>
            <span className="text-[10.5px] text-[#94A3B8]">أعلى 5 تطابقاً · مهلة {d.settings.waitlistOfferMinutes} د</span>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-3">
            {d.openVacancies.slice(0, 6).map((v) => {
              const matches = rankWaitlist(d.waitlist, v);
              return (
                <div key={v.id} className="rounded-lg border border-[#E4EAEE] bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[12.5px] font-bold text-[#0F172A]">{v.service || 'ساعة شاغرة'}</p>
                    <span className="shrink-0 rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-1.5 py-0.5 text-[9.5px] font-bold text-[#0E7490]">{matches.length} تطابق</span>
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-[#64748B]">{v.date} · {v.time}{v.branchName ? ` · ${v.branchName}` : ''}</p>
                  <button
                    type="button"
                    onClick={() => d.sendOffers(v)}
                    disabled={!matches.length}
                    className="mt-2.5 w-full rounded-lg bg-[#059669] py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-40"
                  >
                    إرسال عروض
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <section className={`${panel} overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4EAEE] px-4 py-3">
            <h2 className="me-auto text-[14px] font-extrabold">الطابور</h2>
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E4EAEE] bg-white p-0.5">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={seg(filter === f.id)}
                >
                  {f.label} <span className="tabular-nums">{f.n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#EDF1F4]">
            {visible.map((w, i) => {
              const st = WAIT_STATUS[w.status] || WAIT_STATUS.waiting;
              const matches = d.openVacancies.filter((v) => rankWaitlist([w], v).length).length;
              return (
                <article key={w.id} className="relative overflow-hidden px-4 py-3">
                  <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: st.accent }} />
                  <div className="flex items-start gap-3 ps-1.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F4F7F8] text-[11.5px] font-bold text-[#475569]">
                      {w.status === 'waiting' ? i + 1 : (w.name || 'ع').trim().charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-bold text-[#0F172A]">{w.name || 'عميلة'}</p>
                        <span className="rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold" style={{ background: st.soft, color: st.ink, borderColor: st.softBorder }}>{st.label}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-[#64748B]">{w.service || 'بدون خدمة'}{w.duration ? ` · ${w.duration}` : ''}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[#94A3B8]">
                        {w.phone && <span dir="ltr" className="tabular-nums">{w.phone}</span>}
                        {branchName(w.branchId) && <span>{branchName(w.branchId)}</span>}
                        {staffName(w.specialistId) && <span>{staffName(w.specialistId)}</span>}
                        <span>{preferredLabel(w.preferredTimes)}</span>
                        {w.createdAt && (
                          <span className="inline-flex items-center gap-1"><FaClock className="text-[9px]" /> {waitAgo(w.createdAt)}</span>
                        )}
                      </div>
                      {matches > 0 && w.status !== 'booked' && (
                        <p className="mt-1 text-[10.5px] font-bold text-[#0E7490]">{matches} شاغر يناسبها الآن</p>
                      )}
                    </div>
                    {w.phone && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/${waDigits(w.phone)}`, '_blank')}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] text-[#059669] transition-colors hover:border-[#059669]"
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
              <EmptyNote title="لا أحد في هذا التبويب" hint="أضيفي عميلة من البطاقة الجانبية حتى يظهر الطابور هنا." />
            )}
          </div>
        </section>

        <form onSubmit={d.addWaitlist} className={`${panel} space-y-3 p-4 lg:sticky lg:top-24`}>
          <div className="flex items-center gap-2 border-b border-[#E4EAEE] pb-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ECFEFF] text-[#0E7490]"><FaPlus className="text-[10px]" /></span>
            <h2 className="text-[13px] font-extrabold">إضافة للطابور</h2>
          </div>
          <label className="block text-[10.5px] font-bold text-[#64748B]">الاسم
            <input value={d.waitForm.name} onChange={(e) => d.setWaitForm({ ...d.waitForm, name: e.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="block text-[10.5px] font-bold text-[#64748B]">الهاتف
            <input value={d.waitForm.phone} onChange={(e) => d.setWaitForm({ ...d.waitForm, phone: e.target.value })} className={`${field} mt-1`} dir="ltr" />
          </label>
          <label className="block text-[10.5px] font-bold text-[#64748B]">الخدمة
            <select value={d.waitForm.serviceId} onChange={(e) => d.setWaitForm({ ...d.waitForm, serviceId: e.target.value })} className={`${field} mt-1`}>
              <option value="">اختاري الخدمة</option>
              {d.services.map((s) => <option key={s.id} value={s.id}>{s.title} {s.duration ? `· ${s.duration}` : ''}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[10.5px] font-bold text-[#64748B]">الفرع
              <select value={d.waitForm.branchId} onChange={(e) => d.setWaitForm({ ...d.waitForm, branchId: e.target.value })} className={`${field} mt-1`}>
                <option value="">أي فرع</option>
                {d.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block text-[10.5px] font-bold text-[#64748B]">المختصة
              <select value={d.waitForm.specialistId} onChange={(e) => d.setWaitForm({ ...d.waitForm, specialistId: e.target.value })} className={`${field} mt-1`}>
                <option value="">أي مختصة</option>
                {d.staff.filter((s) => s.role !== 'admin').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-[10.5px] font-bold text-[#64748B]">الوقت المفضّل
            <select value={d.waitForm.preferredTimes} onChange={(e) => d.setWaitForm({ ...d.waitForm, preferredTimes: e.target.value })} className={`${field} mt-1`}>
              <option value="any">أي وقت</option>
              <option value="morning">صباح</option>
              <option value="afternoon">بعد الظهر</option>
            </select>
          </label>
          <button type="submit" className="w-full rounded-lg bg-[#059669] py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#047857]">إضافة للطابور</button>
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
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/appointments" className="text-[11px] font-bold tracking-wide text-[#94A3B8] hover:text-[#0E7490]">المواعيد ←</Link>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">المواعيد المتاحة</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">ساعات الجدول الفارغة، والشواغر بعد إلغاء — للعرض على الطابور.</p>
        </div>
        <Link to="/appointments/waitlist" className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">قائمة الانتظار</Link>
      </header>

      <StatStrip
        items={[
          { label: 'فراغ اليوم', value: d.gapsToday.length, note: 'ساعات فارغة قابلة للحجز', accent: '#0FA3A3' },
          { label: 'فراغ غداً', value: d.gapsTom.length, note: 'من دوام الفريق', accent: '#059669' },
          { label: 'بعد إلغاء', value: d.openVacancies.length, note: 'شواغر مفتوحة للعرض', accent: '#B45309' },
          { label: 'بالطابور', value: waiting, note: 'ينتظرن شاغراً مناسباً', accent: '#0E7490' },
        ]}
      />

      <div className={`${panel} flex flex-wrap items-center justify-between gap-2 px-3 py-2.5`}>
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E4EAEE] bg-white p-0.5">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={seg(tab === t.id)}>
              {t.label} <span className="tabular-nums">{t.n}</span>
            </button>
          ))}
        </div>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          aria-label="تصفية الفريق"
          className="h-8 rounded-lg border border-[#E4EAEE] bg-white px-2 text-[11.5px] font-bold text-[#334155] outline-none focus:border-[#0FA3A3]"
        >
          <option value="all">كل الفريق</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {tab === 'cancelled' && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vacancies.map((v) => {
            const n = matchCount(v);
            return (
              <article key={v.id} className="relative overflow-hidden rounded-xl border border-[#E4EAEE] bg-white p-4">
                <span className="absolute inset-y-0 start-0 w-[3px] bg-[#B45309]" />
                <div className="ps-1.5">
                  <p className="text-[13px] font-bold text-[#0F172A]">{v.service || 'ساعة شاغرة'}</p>
                  <p className="mt-1 text-[11px] tabular-nums text-[#64748B]">{v.date} · {v.time}{v.branchName ? ` · ${v.branchName}` : ''}</p>
                  <p className="mt-1.5 text-[10.5px] text-[#94A3B8]">{n} عميلة في الطابور تناسب هذا الموعد</p>
                  <button
                    type="button"
                    onClick={() => d.sendOffers(v)}
                    disabled={!n}
                    className="mt-3 w-full rounded-lg bg-[#059669] py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-40"
                  >
                    إرسال عروض · {d.settings.waitlistOfferMinutes} د
                  </button>
                </div>
              </article>
            );
          })}
          {!vacancies.length && (
            <div className={`${panel} md:col-span-2 xl:col-span-3`}>
              <EmptyNote title="لا شاغر من إلغاء الآن" hint="عند إلغاء موعد يظهر هنا حتى يُعرض على الطابور." />
            </div>
          )}
        </section>
      )}

      {tab !== 'cancelled' && (
        <div className="space-y-3">
          {groups.map((row) => (
            <section key={`${row.date}-${row.specialistId}-${row.branchId}`} className={`${panel} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEE] px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#ECFEFF] text-[11.5px] font-bold text-[#0E7490]">
                    {(row.specialistName || 'ع').trim().charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-[#0F172A]">{row.specialistName}</p>
                    <p className="text-[10.5px] text-[#94A3B8]">{row.date}{row.branchName ? ` · ${row.branchName}` : ''} · {row.slots.length} ساعة</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                {row.slots.map((slot) => {
                  const n = matchCount(slot);
                  return (
                    <button
                      key={`${slot.time}-${slot.specialistId}`}
                      type="button"
                      onClick={() => d.offerFromGap(slot)}
                      className={`min-w-[6.5rem] rounded-lg border px-3 py-2 text-start transition-colors ${
                        n ? 'border-[#C6EEEE] bg-[#ECFEFF] hover:border-[#0FA3A3]' : 'border-[#E4EAEE] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <p className="text-[12px] font-bold tabular-nums text-[#0F172A]">{slot.time}</p>
                      <p className={`mt-0.5 text-[10.5px] ${n ? 'font-bold text-[#0E7490]' : 'text-[#94A3B8]'}`}>
                        {n ? `${n} بالطابور` : 'بدون تطابق'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!groups.length && (
            <div className={panel}>
              <EmptyNote title="لا ساعات فارغة في هذا اليوم" hint="الفراغ يُحسب من دوام الموظفات ناقص الحجوزات غير الملغاة." />
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
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/appointments" className="text-[11px] font-bold tracking-wide text-[#94A3B8] hover:text-[#0E7490]">المواعيد ←</Link>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">التذكيرات والقواعد</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">تذكيرات مستحقة، قواعد العيادة، وقوالب واتساب للتأكيد والتذكير والإلغاء.</p>
        </div>
        <Link to="/appointments" className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">التقويم</Link>
      </header>

      <StatStrip
        items={[
          { label: 'تذكيرات مستحقة', value: due.length, note: 'داخل نافذة الإرسال', accent: '#0FA3A3' },
          { label: 'تحتاج تأكيد', value: pending.length, note: 'حجوزات معلّقة قادمة', accent: '#B45309' },
          { label: 'سقف الرسائل', value: d.form.reminderCap, note: 'لكل موعد', accent: '#64748B' },
          { label: 'مهلة العرض', value: `${d.form.waitlistOfferMinutes} د`, note: 'لقبول شاغر الانتظار', accent: '#0E7490' },
        ]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <section className={`${panel} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-4 py-3">
              <h2 className="text-[13px] font-extrabold">تذكيرات مستحقة</h2>
              <span className="rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-2 py-0.5 text-[10px] font-bold text-[#0E7490]">{due.length}</span>
            </div>
            <div className="divide-y divide-[#EDF1F4]">
              {due.map((a) => {
                const hours = reminderDue(a, d.settings)[0];
                return (
                  <div key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-[#0F172A]">{a.customerName}</p>
                      <p className="mt-0.5 text-[10.5px] tabular-nums text-[#64748B]">{a.date} · {a.time} · {a.service}</p>
                    </div>
                    <button type="button" onClick={() => d.sendReminder(a, hours)} className="shrink-0 rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] px-3 py-1.5 text-[11px] font-bold text-[#047857] transition-colors hover:border-[#059669]">
                      تذكير واتساب · {hours}س
                    </button>
                  </div>
                );
              })}
              {!due.length && <p className="px-4 py-6 text-[11.5px] text-[#94A3B8]">لا تذكير داخل النافذة الآن.</p>}
            </div>
          </section>

          <section className={`${panel} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-4 py-3">
              <h2 className="text-[13px] font-extrabold">تحتاج تأكيد العميلة</h2>
              <span className="rounded-full border border-[#F3E2C2] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">{pending.length}</span>
            </div>
            <div className="divide-y divide-[#EDF1F4]">
              {pending.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11.5px]">
                  <span className="truncate text-[#334155]">{a.customerName} · <span className="tabular-nums">{a.date} {a.time}</span></span>
                  <button type="button" onClick={() => d.sendReminder(a, 'confirm')} className="shrink-0 text-[11px] font-bold text-[#0E7490] hover:text-[#059669]">تذكير تأكيد</button>
                </div>
              ))}
              {!pending.length && <p className="px-4 py-6 text-[11.5px] text-[#94A3B8]">لا حجوزات معلّقة قادمة.</p>}
            </div>
          </section>
        </div>

        <section className={`${panel} space-y-3 p-5`}>
          <div className="border-b border-[#E4EAEE] pb-3">
            <h2 className="text-[14px] font-extrabold">قواعد العيادة</h2>
            <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">هذه القواعد تشغّل قوالب واتساب بالأسفل: متى يُرسل التأكيد، والتذكير، والإلغاء.</p>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#334155]">
            <input type="checkbox" className="accent-[#059669]" checked={!!d.form.autoConfirm} onChange={(e) => d.setForm({ ...d.form, autoConfirm: e.target.checked })} />
            تأكيد تلقائي بعد الحجز (قالب التأكيد)
          </label>
          <label className="block text-[11.5px] text-[#334155]">تذكيرات واتساب — قبل الموعد بكم ساعة
            <input
              value={d.form.reminderHoursText ?? (d.form.reminderHours || []).join(',')}
              onChange={(e) => d.setForm({ ...d.form, reminderHoursText: e.target.value })}
              className={`${field} mt-1`}
              placeholder="24, 3"
            />
          </label>
          <p className="-mt-1 text-[10px] text-[#94A3B8]">18 ساعة فأكثر = قالب «قبل 24 ساعة». أقل من 18 = قالب «يوم الموعد».</p>
          <label className="block text-[11.5px] text-[#334155]">سقف الرسائل لكل موعد (يمنع تكرار القالب)
            <input type="number" value={d.form.reminderCap} onChange={(e) => d.setForm({ ...d.form, reminderCap: Number(e.target.value) })} className={`${field} mt-1`} />
          </label>
          <label className="block text-[11.5px] text-[#334155]">نص الإلغاء للعميلة
            <textarea value={d.form.cancellationPolicy} onChange={(e) => d.setForm({ ...d.form, cancellationPolicy: e.target.value })} className={`${field} mt-1`} rows={3} />
            <span className="mt-1 block text-[10px] text-[#94A3B8]">يظهر في الحجز العام إذا سياسة الحجوزات على موقع العيادة فاضية.</span>
          </label>
          <label className="block text-[11.5px] text-[#334155]">مهلة قبول عرض الانتظار (بالدقائق)
            <input type="number" value={d.form.waitlistOfferMinutes} onChange={(e) => d.setForm({ ...d.form, waitlistOfferMinutes: Number(e.target.value) })} className={`${field} mt-1`} />
          </label>
          <label className="block text-[11.5px] text-[#334155]">المنطقة الزمنية
            <input value={d.form.timezone} onChange={(e) => d.setForm({ ...d.form, timezone: e.target.value })} className={`${field} mt-1`} />
          </label>
          <p className="text-[10.5px] text-[#94A3B8]">بيانات هذه العيادة فقط. لا عقوبات آلية.</p>
          <button type="button" onClick={d.savePolicy} className="w-full rounded-lg bg-[#059669] py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#047857]">حفظ القواعد</button>
        </section>
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
    .filter((a) => BOOKABLE_STATUSES.includes(a.status))
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
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/appointments" className="text-[11px] font-bold tracking-wide text-[#94A3B8] hover:text-[#0E7490]">المواعيد ←</Link>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">الحضور</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">حضور العميلات للعلاج اليوم، وبدء/إغلاق شغل الفريق مع ساعات الشهر.</p>
        </div>
        <Link to="/appointments" className="inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">التقويم</Link>
      </header>

      <StatStrip
        items={[
          { label: 'بانتظار الحضور', value: expected.length, note: 'معلّق · مؤكد · معاد جدولته', accent: '#0FA3A3' },
          { label: 'حضرت', value: arrived.length, note: 'سُجّل حضور العلاج', accent: '#059669' },
          { label: 'لم تحضر', value: missed.length, note: 'غياب اليوم', accent: '#DC2626' },
          { label: 'في الشغل الآن', value: workingCount, note: 'ورديات مفتوحة', accent: '#B45309' },
        ]}
      />

      <div className={`${panel} flex flex-wrap items-center gap-2 px-3 py-2.5`}>
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-[#E4EAEE] bg-white p-0.5">
          {[
            { id: 'clients', label: 'العميلات', n: expected.length + arrived.length + missed.length },
            { id: 'staff', label: 'الفريق', n: people.length },
          ].map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={seg(tab === t.id)}>
              {t.label} <span className="tabular-nums">{t.n}</span>
            </button>
          ))}
        </div>
        <span className="ms-auto text-[10.5px] text-[#94A3B8]">{clockLabel(now)}</span>
      </div>

      {tab === 'clients' && (
        <div className="space-y-3">
          {expected.map((a) => (
            <article key={a.id} className="relative overflow-hidden rounded-xl border border-[#E4EAEE] bg-white px-4 py-3">
              <span className="absolute inset-y-0 start-0 w-[3px] bg-[#0FA3A3]" />
              <div className="flex flex-col gap-3 ps-1.5 sm:flex-row sm:items-center">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#ECFEFF] text-[11.5px] font-bold text-[#0E7490]">
                  {(a.customerName || 'ع').trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#0F172A]">{a.customerName}</p>
                  <p className="mt-0.5 text-[10.5px] tabular-nums text-[#64748B]">{a.time} · {a.service || '—'}{a.specialistName ? ` · ${a.specialistName}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => markClient(a, 'attended')} className="rounded-lg bg-[#059669] px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-[#047857]">حضرت</button>
                  <button type="button" onClick={() => markClient(a, 'noshow')} className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-1.5 text-[11.5px] font-bold text-[#DC2626] transition-colors hover:border-[#DC2626]">لم تحضر</button>
                </div>
              </div>
            </article>
          ))}
          {!expected.length && (
            <div className={panel}>
              <EmptyNote title="لا مواعيد تنتظر الحضور اليوم" hint="المعلّق والمؤكد والمُعاد جدولته يظهر هنا." />
            </div>
          )}
          {arrived.length > 0 && (
            <section className={`${panel} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-[#E4EAEE] px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                <h3 className="text-[12.5px] font-extrabold text-[#334155]">حضرت للعلاج</h3>
                <span className="ms-auto text-[11px] font-bold tabular-nums text-[#047857]">{arrived.length}</span>
              </div>
              <div className="divide-y divide-[#EDF1F4]">
                {arrived.map((a) => (
                  <p key={a.id} className="px-4 py-2 text-[11.5px] text-[#334155]"><span className="tabular-nums text-[#64748B]">{a.time}</span> · {a.customerName} · <span className="text-[#94A3B8]">{a.service || '—'}</span></p>
                ))}
              </div>
            </section>
          )}
          {missed.length > 0 && (
            <section className={`${panel} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-[#E4EAEE] px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
                <h3 className="text-[12.5px] font-extrabold text-[#334155]">لم تحضر</h3>
                <span className="ms-auto text-[11px] font-bold tabular-nums text-[#DC2626]">{missed.length}</span>
              </div>
              <div className="divide-y divide-[#EDF1F4]">
                {missed.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 text-[11.5px]">
                    <span className="truncate text-[#334155]"><span className="tabular-nums text-[#64748B]">{a.time}</span> · {a.customerName}</span>
                    {!a.noshowFollowupSent && (
                      <button type="button" className="shrink-0 text-[11px] font-bold text-[#DC2626] hover:text-[#B91C1C]" onClick={() => d.followNoshow(a)}>متابعة واتساب</button>
                    )}
                  </div>
                ))}
              </div>
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
              <article key={s.id} className="relative overflow-hidden rounded-xl border border-[#E4EAEE] bg-white px-4 py-3.5">
                {open && <span className="absolute inset-y-0 start-0 w-[3px] bg-[#059669]" />}
                <div className="flex items-start gap-3 ps-1.5">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11.5px] font-bold ${open ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F4F7F8] text-[#475569]'}`}>
                    {(s.name || 'م').trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#0F172A]">{s.name}{s.id === user?.uid ? ' · أنتِ' : ''}</p>
                    {open ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-bold text-[#047857]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" /> في الشغل منذ {clockLabel(open.startAt)}
                      </p>
                    ) : shifts.length ? (
                      <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">آخر إغلاق {clockLabel(shifts[shifts.length - 1].endAt)}</p>
                    ) : (
                      <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">لم يبدأ العمل بعد</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button type="button" onClick={() => stamp(s, 'start')} disabled={!!open} className="rounded-lg bg-[#059669] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-40">
                      بدء العمل
                    </button>
                    <button type="button" onClick={() => stamp(s, 'close')} disabled={!open} className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490] disabled:opacity-40">
                      إغلاق العمل
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-[#EDF1F4] bg-[#FAFCFC] px-4 py-3 text-center">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">{open ? 'الوردية الحالية' : 'عداد اليوم'}</p>
                  <p className={`mt-1 text-[30px] font-light leading-none tabular-nums ${open ? 'text-[#047857]' : 'text-[#334155]'}`} dir="ltr">{formatHms(liveMs)}</p>
                  <p className="mt-2 text-[10.5px] text-[#94A3B8]">اليوم {formatDurationAr(todayMs)} · الشهر {formatDurationAr(monthMs)}</p>
                </div>
                {shifts.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-[#EDF1F4] pt-2 text-[10.5px] text-[#64748B]">
                    {shifts.map((sh) => (
                      <li key={sh.id} className="tabular-nums">
                        دخول {clockLabel(sh.startAt)}
                        {sh.endAt ? ` → إغلاق ${clockLabel(sh.endAt)} · ${formatDurationAr(sh.endAt - sh.startAt)}` : ' → ما زالت في الشغل'}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[10.5px] text-[#94A3B8]">{monthTitleAr(monthKey)}: {formatDurationAr(monthMs)} · {days} يوم حضور</p>
              </article>
            );
          })}
          {!people.length && (
            <div className={panel}>
              <EmptyNote title="لا حسابات فريق في السجل" />
            </div>
          )}
          <section className={`${panel} overflow-hidden`}>
            <div className="border-b border-[#E4EAEE] px-4 py-3">
              <h3 className="text-[12.5px] font-extrabold text-[#334155]">ساعات {monthTitleAr(monthKey)}</h3>
            </div>
            <div className="divide-y divide-[#EDF1F4] px-4">
              {people.map((s) => (
                <div key={s.id} className="flex justify-between py-2 text-[11.5px]">
                  <span className="text-[#334155]">{s.name}</span>
                  <b className="font-bold tabular-nums text-[#047857]">{formatDurationAr(monthWorkedMs(byDate, s.id, monthKey, now))}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
