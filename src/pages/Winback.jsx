import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
  FaWhatsapp, FaPause, FaPlay, FaStop, FaSync, FaBan, FaEllipsisV, FaCog, FaPlus, FaPaperPlane,
} from 'react-icons/fa';
import {
  mergeSettings, DEFAULT_WINBACK_SETTINGS, CATEGORY_LABELS, buildJourneys, rankOpportunities,
  groupLapsed, buildMessage, firstOpenSlots, waDigits, suggestSegments, campaignMetrics,
  channelInsights, monthlyReport, normalizePhone,
} from '../utils/winback';
import { deliverUtilityNotice } from '../utils/sendClinicWaReminder';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const card = 'rounded-lg border border-[#E4EAEE] bg-white';
const primaryBtn = 'inline-flex items-center gap-1 rounded-lg bg-[#059669] px-3 py-2 text-[12.5px] font-bold text-white hover:bg-[#047857]';
const pillActive = 'shrink-0 rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-3 py-1.5 text-[11.5px] font-bold text-[#0E7490]';
const pillIdle = 'shrink-0 rounded-full border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3]';
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-bold text-[#047857]';
const chipGold = 'rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#B45309]';
const chipMuted = 'rounded-full border border-[#E4EAEE] bg-[#F4F7F8] px-2.5 py-0.5 text-[10px] font-bold text-[#64748B]';
const chipRose = 'rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[10px] font-bold text-[#B91C1C]';

const MAIN_TABS = [
  { id: 'who', label: 'مين ما رجعوا؟' },
  { id: 'campaigns', label: 'الحملات' },
  { id: 'results', label: 'النتائج' },
];

const ADVANCED_SECTIONS = [
  { id: 'offers', label: 'العروض' },
  { id: 'auto', label: 'إرسال تلقائي' },
  { id: 'advanced', label: 'مجموعات وأدوات' },
];

function starsForChance(pct) {
  const n = pct >= 80 ? 5 : pct >= 60 ? 4 : pct >= 40 ? 3 : pct >= 20 ? 2 : 1;
  return '⭐'.repeat(n);
}

function journeyStatusBadge(j) {
  if (j.upcoming?.length) return { label: 'موعد قادم', accent: '#B45309', chip: chipGold };
  if (j.doNotContact) return { label: 'ما منبعتلها', accent: '#94A3B8', chip: chipMuted };
  if (j.holdout) return { label: 'للمقارنة', accent: '#94A3B8', chip: chipMuted };
  if (!j.eligible) return { label: 'وصلنا الحد', accent: '#DC2626', chip: chipRose };
  return { label: 'جاهزة', accent: '#059669', chip: chipMint };
}

function campaignAccent(status) {
  if (status === 'active') return '#059669';
  if (status === 'review') return '#0FA3A3';
  if (status === 'paused') return '#B45309';
  return '#94A3B8';
}

function campaignStatusLabel(status) {
  if (status === 'review') return 'مسودة';
  if (status === 'active') return 'شغالة';
  if (status === 'paused') return 'متوقفة مؤقتاً';
  if (status === 'stopped') return 'متوقفة';
  return status || '—';
}

function channelLabel(ch) {
  if (ch === 'whatsapp') return 'واتساب';
  if (ch === 'sms') return 'رسالة نصية';
  if (ch === 'email') return 'بريد';
  return ch || 'واتساب';
}

function variantLabel(v) {
  return v === 'B' ? 'الرسالة الثانية' : 'الرسالة الأولى';
}

const Winback = () => {
  const { clinicPath, clinicId, clinicInfo } = useClinic();
  const [tab, setTab] = useState('who');
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [settingsRaw, setSettingsRaw] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [offers, setOffers] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [optOuts, setOptOuts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [draftName, setDraftName] = useState('حملة استرجاع');
  const [draftChannel, setDraftChannel] = useState('whatsapp');
  const [draftOffer, setDraftOffer] = useState('');
  const [draftVariant, setDraftVariant] = useState(true);
  const [offerForm, setOfferForm] = useState({ title: '', discountType: 'percent', value: 10, expiresAt: '', serviceId: '', adminApproved: false });
  const [settingsForm, setSettingsForm] = useState(DEFAULT_WINBACK_SETTINGS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState('offers');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [msgMenuOpen, setMsgMenuOpen] = useState(null);

  const settings = useMemo(() => mergeSettings(settingsRaw), [settingsRaw]);

  useEffect(() => {
    if (!clinicPath) {
      setLoading(false);
      return undefined;
    }
    const fail = () => setLoading(false);
    const unsubs = [
      onValue(ref(database, clinicPath('customers')), (s) => {
        setCustomers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
        setLoading(false);
      }, fail),
      onValue(ref(database, clinicPath('appointments')), (s) => setAppointments(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('services')), (s) => setServices(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('scheduleSettings')), (s) => setSchedules(s.val() || {}), fail),
      onValue(ref(database, clinicPath('winbackSettings')), (s) => {
        const val = s.val();
        setSettingsRaw(val);
        setSettingsForm(mergeSettings(val));
      }, fail),
      onValue(ref(database, clinicPath('winbackCampaigns')), (s) => setCampaigns(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('winbackOffers')), (s) => setOffers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('winbackInbox')), (s) => setInbox(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []), fail),
      onValue(ref(database, clinicPath('winbackOptOuts')), (s) => setOptOuts(s.val() || {}), fail),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicPath]);

  const journeys = useMemo(
    () => buildJourneys({ customers, appointments, services, settings, logs: messages, optOuts }),
    [customers, appointments, services, settings, messages, optOuts],
  );
  const lapsed = journeys.filter((j) => j.lapsed);
  const ranked = rankOpportunities(journeys);
  const groups = groupLapsed(journeys);
  const slots = useMemo(() => firstOpenSlots(schedules, 3), [schedules]);
  const segments = suggestSegments(journeys);

  useEffect(() => {
    if (!clinicPath || !campaigns.length) return;
    campaigns.filter((c) => c.status === 'active').forEach((c) => {
      const targets = new Set(c.targetIds || []);
      const converted = new Set(
        appointments
          .filter((a) => {
            const key = normalizePhone(a.phoneNumber);
            if (!targets.has(key)) return false;
            if (a.campaignId === c.id) return true;
            return (a.createdAt || 0) >= (c.launchedAt || 0) && ['pending', 'confirmed', 'completed'].includes(a.status);
          })
          .map((a) => normalizePhone(a.phoneNumber)),
      );
      messages
        .filter((m) => m.campaignId === c.id && m.status !== 'stopped' && converted.has(m.phoneKey || normalizePhone(m.phone)))
        .forEach((m) => {
          update(ref(database, clinicPath(`winbackMessages/${m.id}`)), { status: 'stopped', stoppedReason: 'booking', booked: true });
        });
      const offer = offers.find((o) => o.id === c.offerId);
      if (offer) {
        converted.forEach((key) => {
          if (!offer.usedBy?.[key]) {
            set(ref(database, clinicPath(`winbackOffers/${offer.id}/usedBy/${key}`)), true);
          }
        });
      }
    });
  }, [appointments, campaigns, messages, clinicPath, offers]);

  const toggleSelect = (phoneKey) => setSelected((prev) => ({ ...prev, [phoneKey]: !prev[phoneKey] }));
  const selectedJourneys = ranked.filter((j) => selected[j.phoneKey]);

  const contactWhatsApp = (journey) => {
    if (journey.doNotContact) return toast.info('هذه العميلة طلبت عدم التواصل');
    const digits = waDigits(journey.phone);
    if (!digits) return toast.error('لا يوجد رقم واتساب');
    const clinic = clinicInfo?.name || 'العيادة';
    const text = `مرحبا ${journey.displayName}، معكِ ${clinic}. مرّ وقت على آخر زيارة، وحابين نحجزلكِ موعد لما يناسبك.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const bulkWhatsAppReady = () => {
    const list = ranked.filter((j) => j.eligible && !j.doNotContact);
    if (!list.length) return toast.info('ما في عميلات جاهزين نبعتلهم اليوم');
    list.slice(0, 5).forEach((j) => contactWhatsApp(j));
    if (list.length > 5) toast.info(`فُتح واتساب لـ 5 — الباقي ${list.length - 5} من القائمة`);
  };

  const prepareCampaignTargets = () => {
    const next = {};
    ranked.filter((j) => j.eligible).forEach((j) => { next[j.phoneKey] = true; });
    setSelected(next);
  };

  const saveSettings = async () => {
    await set(ref(database, clinicPath('winbackSettings')), settingsForm);
    toast.success('تم حفظ قواعد العيادة');
  };

  const saveOffer = async (e) => {
    e.preventDefault();
    if (!offerForm.title) return toast.error('اسم العرض مطلوب');
    if (!offerForm.adminApproved) return toast.error('العرض يحتاج موافقة الإدارة قبل الحفظ');
    const r = push(ref(database, clinicPath('winbackOffers')));
    await set(r, {
      ...offerForm,
      value: Number(offerForm.value || 0),
      usedBy: {},
      createdAt: Date.now(),
    });
    toast.success('تم إنشاء العرض');
    setOfferForm({ title: '', discountType: 'percent', value: 10, expiresAt: '', serviceId: '', adminApproved: false });
  };

  const createCampaign = async (status = 'review') => {
    const targets = (selectedJourneys.length ? selectedJourneys : ranked).filter((j) => j.eligible);
    if (!targets.length) return toast.error('لا توجد عميلات مؤهلات في القائمة');
    const holdout = lapsed.filter((j) => j.holdout && !j.doNotContact).map((j) => j.phoneKey);
    const r = push(ref(database, clinicPath('winbackCampaigns')));
    await set(r, {
      name: draftName,
      status,
      channel: draftChannel,
      offerId: draftOffer || '',
      abTest: !!draftVariant,
      targetIds: targets.map((j) => j.phoneKey),
      holdoutIds: holdout,
      createdAt: Date.now(),
    });
    const nextSel = {};
    targets.forEach((j) => { nextSel[j.phoneKey] = true; });
    setSelected(nextSel);
    toast.success(status === 'review' ? 'أُنشئت الحملة للمراجعة' : 'تم الحفظ');
    setShowNewCampaign(false);
    setTab('campaigns');
  };

  const launchCampaign = async (campaign) => {
    if (campaign.status === 'active') return;
    const offer = offers.find((o) => o.id === campaign.offerId);
    if (offer && (!offer.adminApproved || (offer.expiresAt && new Date(offer.expiresAt) < new Date()))) {
      return toast.error('العرض غير صالح أو غير موافق عليه');
    }
    const targets = journeys.filter((j) => (campaign.targetIds || []).includes(j.phoneKey));
    const now = Date.now();
    await Promise.all(targets.map(async (j, idx) => {
      const variant = campaign.abTest && idx % 2 === 1 ? 'B' : 'A';
      const text = buildMessage({
        clinicName: clinicInfo?.name,
        clinicId,
        journey: j,
        offer,
        slots,
        variant,
      }) + (offer ? `\nكود العرض يُطبَّق عند الحجز من الرابط فقط.` : '') + `\n${window.location.origin}/book/${clinicId}?wb=${campaign.id}`;
      const msgRef = push(ref(database, clinicPath('winbackMessages')));
      await set(msgRef, {
        campaignId: campaign.id,
        customerId: j.customerId || '',
        phone: j.phone,
        phoneKey: j.phoneKey,
        name: j.displayName,
        channel: campaign.channel || 'whatsapp',
        status: 'queued',
        variant,
        body: text,
        attempt: 0,
        createdAt: now,
      });
    }));
    await update(ref(database, clinicPath(`winbackCampaigns/${campaign.id}`)), { status: 'active', launchedAt: now });
    toast.success('الحملة نشطة. راجعي الرسائل وأرسلي عبر القناة المصرّح بها.');
  };

  const sendMessage = async (msg) => {
    const campaign = campaigns.find((c) => c.id === msg.campaignId);
    if (campaign && ['stopped', 'paused'].includes(campaign.status)) return toast.error('الحملة متوقفة');
    const journey = journeys.find((j) => j.phoneKey === msg.phoneKey);
    if (journey?.doNotContact || journey?.winbackOptOut) {
      await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { status: 'stopped', stoppedReason: 'opt-out' });
      return toast.info('أُوقف الإرسال: العميلة طلبت عدم التواصل');
    }
    if (['sent', 'delivered', 'read'].includes(msg.status) && !msg.forceReminder) {
      return toast.info('تم الإرسال مسبقاً — لن نكرر الرسالة');
    }
    const ch = msg.channel || 'whatsapp';
    if (ch === 'whatsapp' && settings.channels.whatsapp) {
      const notice = await deliverUtilityNotice({
        clinicId,
        eventId: 'followup',
        toPhone: msg.phone,
        idempotencyKey: msg.id,
        vars: {
          1: msg.name || 'عميلتنا',
          2: clinicInfo?.name || 'العيادة',
          3: campaign?.title || 'زيارة سابقة',
          4: `${window.location.origin}/book/${clinicId}`,
        },
      });
      if (!notice.ok) {
        window.open(`https://wa.me/${waDigits(msg.phone)}?text=${encodeURIComponent(msg.body || '')}`, '_blank');
      }
      await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { status: 'sent', sentAt: Date.now(), attempt: (msg.attempt || 0) + 1, channelResult: notice.ok ? 'template' : 'wa.me' });
      toast.success(notice.ok ? 'أُرسل قالب المتابعة المعتمد' : 'فُتح واتساب — سجّلي الحالة بعد الإرسال');
    } else {
      toast.error('هذه القناة غير مفعّلة أو غير متصلة');
      await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { status: 'failed', lastError: 'channel-disabled', attempt: (msg.attempt || 0) + 1, nextRetryAt: Date.now() + 3600000 });
    }
  };

  const retryFailed = async (msg) => {
    if (msg.status !== 'failed') return;
    if (['sent', 'delivered', 'read'].includes(msg.status)) return;
    await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { status: 'queued' });
    await sendMessage({ ...msg, status: 'queued' });
  };

  const markStatus = (msg, status) => update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { status, [`${status}At`]: Date.now() });

  const sendReminder = async (msg) => {
    if (!settings.reminderEnabled) return toast.info('التذكير الثاني غير مفعّل في سياسة العيادة');
    if (msg.reminderSent) return toast.info('تم إرسال تذكير واحد مسبقاً');
    const launched = campaigns.find((c) => c.id === msg.campaignId)?.launchedAt || msg.sentAt || 0;
    const wait = Number(settings.reminderAfterDays || 3) * 86400000;
    if (Date.now() - launched < wait) return toast.info('لم يمر زمن سياسة التذكير بعد');
    if (msg.booked || msg.stoppedReason) return;
    await sendMessage({ ...msg, forceReminder: true, status: 'queued' });
    await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { reminderSent: true });
  };

  const stopCampaign = async (id) => {
    await update(ref(database, clinicPath(`winbackCampaigns/${id}`)), { status: 'stopped', stoppedAt: Date.now() });
    const open = messages.filter((m) => m.campaignId === id && ['queued', 'failed'].includes(m.status));
    await Promise.all(open.map((m) => update(ref(database, clinicPath(`winbackMessages/${m.id}`)), { status: 'stopped', stoppedReason: 'campaign-stopped' })));
    toast.success('أُوقفت الحملة');
  };

  const handoff = async (msg) => {
    const r = push(ref(database, clinicPath('winbackInbox')));
    await set(r, { messageId: msg.id, name: msg.name, phone: msg.phone, body: msg.body, createdAt: Date.now(), status: 'open' });
    await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { replied: true, handedOff: true });
    toast.success('حُوّل لاستقبال العيادة');
  };

  const optOut = async (journey) => {
    await set(ref(database, clinicPath(`winbackOptOuts/${journey.phoneKey}`)), { at: Date.now(), phone: journey.phone, name: journey.displayName });
    if (journey.customerId) {
      await update(ref(database, clinicPath(`customers/${journey.customerId}`)), { winbackOptOut: true, doNotContact: true, optOutAt: Date.now() });
    }
    toast.success('سُجّل الانسحاب ولن تُرسل رسائل');
  };

  const applySegment = (seg) => {
    const next = {};
    ranked.filter((j) => seg.phones.includes(j.phoneKey)).forEach((j) => { next[j.phoneKey] = true; });
    setSelected(next);
    setTab('who');
    toast.info('شُحنت المجموعة للمراجعة');
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4EAEE] border-t-[#059669]" /></div>;
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const returnedThisMonth = appointments.filter((a) => (a.createdAt || 0) >= monthStart && a.campaignId).length;

  const whoKpis = [
    { label: 'غايبين', value: String(lapsed.length), note: 'ما إجوش من فترة', accent: '#B45309' },
    { label: 'جاهزين نبعتلهم', value: String(ranked.length), note: 'ممكن نبعتلهم اليوم', accent: '#059669' },
    { label: 'رجعوا هالشهر', value: String(returnedThisMonth), note: 'حجزوا موعد من جديد', accent: '#0FA3A3' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">التواصل والعودة</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">رجّعي عميلاتك اللي غابوا</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">شوفي مين غاب، ابعتي لهم واتساب، وتتبّعي الحملات ببساطة.</p>
        </div>
        <button type="button" onClick={() => setAdvancedOpen(true)} className={ghost}>
          <FaCog className="text-[12px] text-[#0FA3A3]" />
          إعدادات متقدمة
        </button>
      </header>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MAIN_TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tab === t.id ? pillActive : pillIdle}>{t.label}</button>
        ))}
      </div>

      {tab === 'who' && (
        <div className="space-y-4">
          <section aria-label="ملخص سريع" className="grid grid-cols-3 border-y border-[#E4EAEE]">
            {whoKpis.map((k, i) => (
              <div key={k.label} className={`px-5 py-4 ${i > 0 ? 'border-s border-[#E4EAEE]' : ''}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
                  {k.label}
                </p>
                <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
                <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
                <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
              </div>
            ))}
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={bulkWhatsAppReady} className={primaryBtn}>
              <FaWhatsapp /> ابعتيلهن واتساب
            </button>
            <button
              type="button"
              onClick={() => { prepareCampaignTargets(); setShowNewCampaign(true); setTab('campaigns'); }}
              className={ghost}
            >
              حمّلي الجاهزين لحملة
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#334155]">
              الغائبات عن العيادة <span className="font-medium text-[#94A3B8]">{lapsed.length}</span>
            </p>
            {lapsed.length === 0 && (
              <div className="rounded-xl border border-[#E4EAEE] bg-white p-10 text-center text-[13px] text-[#64748B]">
                ما في عميلات غايبين حسب مدة العيادة.
              </div>
            )}
            {lapsed.map((j) => {
              const st = journeyStatusBadge(j);
              const initials = String(j.displayName || '?').trim().charAt(0);
              return (
                <article key={j.phoneKey} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-3 py-3 transition-colors hover:border-[#CBD5E1]">
                  <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: st.accent }} />
                  <div className="flex flex-wrap items-start justify-between gap-3 ps-1.5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F4F7F8] text-[12px] font-extrabold text-[#0E7490]">{initials}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13px] font-bold text-[#0F172A]">{j.displayName}</h3>
                          <span className={st.chip}>{st.label}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#64748B]" dir="ltr">{j.phone}</p>
                        {j.customerId && (
                          <Link className="mt-1 inline-block text-[11px] font-bold text-[#0E7490] hover:underline" to={`/customers/${j.customerId}`}>الملف</Link>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => contactWhatsApp(j)} className={ghost}>
                        <FaWhatsapp className="text-[#059669]" /> واتساب
                      </button>
                      <button type="button" onClick={() => optOut(j)} className="inline-flex h-8 items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 text-[11.5px] font-bold text-[#B91C1C]">
                        <FaBan className="text-[10px]" /> انسحاب
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 border-t border-[#EDF1F4] pt-3 ps-1.5 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] text-[#94A3B8]">آخر زيارة</p>
                      <p className="mt-1 text-[13px] font-bold text-[#334155]">من {j.daysSince} يوم</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#94A3B8]">آخر خدمة</p>
                      <p className="mt-1 text-[13px] font-bold text-[#334155]">{j.lastService || '—'}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {ranked.length > 0 && (
            <div className={`${card} p-4`}>
              <h3 className="text-[15px] font-bold text-[#0F172A]">أولوية للتواصل اليوم</h3>
              <p className="mt-1 text-[12px] text-[#64748B]">مرتّبين حسب فرصة ترجع.</p>
              <ul className="mt-3 space-y-2">
                {ranked.map((j) => (
                  <li key={j.phoneKey} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-3 py-3">
                    <span className="absolute inset-y-0 start-0 w-[3px] bg-[#059669]" />
                    <div className="flex flex-wrap items-center justify-between gap-2 ps-1.5">
                      <div>
                        <p className="text-[13px] font-bold">{j.displayName}</p>
                        <p className="text-[11px] text-[#64748B]">
                          غايبة {j.daysSince} يوم · فرصة ترجع <span className="text-[12px]">{starsForChance(j.returnChance)}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => contactWhatsApp(j)} className={ghost}><FaWhatsapp className="text-[#059669]" /> واتساب</button>
                        <button type="button" onClick={() => optOut(j)} className="text-[11px] font-bold text-[#B91C1C]">انسحاب</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-[#334155]">الحملات النشطة والمسودات</p>
            <button
              type="button"
              onClick={() => { setShowNewCampaign((v) => !v); if (!showNewCampaign) prepareCampaignTargets(); }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]"
            >
              <FaPlus className="text-[11px]" /> حملة جديدة
            </button>
          </div>

          {showNewCampaign && (
            <div className={`${card} space-y-3 p-4`}>
              <h3 className="text-[15px] font-bold text-[#0F172A]">حملة جديدة</h3>
              <label className="block text-[12px] font-bold text-[#64748B]">
                اسم الحملة
                <input value={draftName} onChange={(e) => setDraftName(e.target.value)} className={`${field} mt-1`} />
              </label>
              <label className="block text-[12px] font-bold text-[#64748B]">
                طريقة التواصل
                <select value={draftChannel} onChange={(e) => setDraftChannel(e.target.value)} className={`${field} mt-1`}>
                  <option value="whatsapp">واتساب</option>
                  {settings.channels.sms && <option value="sms">رسالة نصية</option>}
                  {settings.channels.email && <option value="email">بريد</option>}
                </select>
              </label>
              <label className="block text-[12px] font-bold text-[#64748B]">
                عرض اختياري
                <select value={draftOffer} onChange={(e) => setDraftOffer(e.target.value)} className={`${field} mt-1`}>
                  <option value="">بدون عرض</option>
                  {offers.filter((o) => o.adminApproved).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[12.5px]">
                <input type="checkbox" checked={draftVariant} onChange={(e) => setDraftVariant(e.target.checked)} />
                جربي رسالتين وشوفي أي وحدة أحسن
              </label>
              <button type="button" onClick={() => createCampaign('review')} className={primaryBtn}>حفظ الحملة</button>
            </div>
          )}

          {campaigns.length === 0 && !showNewCampaign && (
            <div className="rounded-xl border border-[#E4EAEE] bg-white p-10 text-center text-[13px] text-[#64748B]">
              ما في حملات بعد. اضغطي «حملة جديدة».
            </div>
          )}

          {campaigns.map((c) => {
            const campMsgs = messages.filter((m) => m.campaignId === c.id);
            const accent = campaignAccent(c.status);
            return (
              <article key={c.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white p-4">
                <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2 ps-1">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-bold text-[#0F172A]">{c.name}</h3>
                      <span className={c.status === 'active' ? chipMint : c.status === 'review' ? 'rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[10px] font-bold text-[#0369A1]' : chipGold}>{campaignStatusLabel(c.status)}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#64748B]">
                      {channelLabel(c.channel)} · عدد اللي رح نبعتلهم {(c.targetIds || []).length}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status === 'review' && (
                      <button type="button" onClick={() => launchCampaign(c)} className={primaryBtn}>
                        <FaPlay className="text-[10px]" /> ابدئي الإرسال
                      </button>
                    )}
                    {c.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => update(ref(database, clinicPath(`winbackCampaigns/${c.id}`)), { status: 'paused' })}
                        className={ghost}
                      >
                        <FaPause className="text-[10px]" /> إيقاف مؤقت
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => update(ref(database, clinicPath(`winbackCampaigns/${c.id}`)), { status: 'active' })}
                        className={primaryBtn}
                      >
                        <FaPlay className="text-[10px]" /> متابعة
                      </button>
                    )}
                    {c.status !== 'stopped' && (
                      <button type="button" onClick={() => stopCampaign(c.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] font-bold text-[#B91C1C]">
                        <FaStop className="text-[10px]" /> إيقاف نهائي
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {campMsgs.map((m) => (
                    <MessageRow
                      key={m.id}
                      msg={m}
                      msgMenuOpen={msgMenuOpen}
                      setMsgMenuOpen={setMsgMenuOpen}
                      sendMessage={sendMessage}
                      retryFailed={retryFailed}
                      markStatus={markStatus}
                      sendReminder={sendReminder}
                      handoff={handoff}
                    />
                  ))}
                </div>
              </article>
            );
          })}

          {inbox.filter((i) => i.status === 'open').length > 0 && (
            <div className={`${card} p-4`}>
              <h3 className="text-[15px] font-bold text-[#0F172A]">محادثات محوّلة للموظفة</h3>
              {inbox.filter((i) => i.status === 'open').map((i) => (
                <div key={i.id} className="flex justify-between py-2 text-[13px]">
                  <span>{i.name} — {i.phone}</span>
                  <button type="button" onClick={() => update(ref(database, clinicPath(`winbackInbox/${i.id}`)), { status: 'done' })} className="text-[11px] font-bold text-[#047857]">تم</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'results' && (
        <ResultsPanel campaigns={campaigns} messages={messages} appointments={appointments} journeys={journeys} offers={offers} />
      )}

      {advancedOpen && (
        <AdvancedModal
          onClose={() => setAdvancedOpen(false)}
          advancedTab={advancedTab}
          setAdvancedTab={setAdvancedTab}
          offerForm={offerForm}
          setOfferForm={setOfferForm}
          saveOffer={saveOffer}
          offers={offers}
          campaigns={campaigns}
          services={services}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          saveSettings={saveSettings}
          settings={settings}
          ranked={ranked}
          setSelected={setSelected}
          setTab={setTab}
          setAdvancedOpen={setAdvancedOpen}
          segments={segments}
          applySegment={applySegment}
          groups={groups}
          messages={messages}
          appointments={appointments}
          journeys={journeys}
        />
      )}
    </div>
  );
};

function MessageRow({
  msg, msgMenuOpen, setMsgMenuOpen, sendMessage, retryFailed, markStatus, sendReminder, handoff,
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white p-3 text-[13px]">
      <span className="absolute inset-y-0 start-0 w-[3px] bg-[#0FA3A3]" />
      <div className="flex flex-wrap items-center justify-between gap-2 ps-1.5">
        <div>
          <p className="font-bold text-[#0F172A]">{msg.name}</p>
          <p className="text-[11px] text-[#64748B]">{variantLabel(msg.variant)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {msg.status === 'queued' && (
            <button type="button" onClick={() => sendMessage(msg)} className={primaryBtn}>
              <FaPaperPlane className="text-[10px]" /> إرسال
            </button>
          )}
          {msg.status === 'failed' && (
            <button type="button" onClick={() => retryFailed(msg)} className={ghost}>
              <FaSync className="text-[10px]" /> إعادة
            </button>
          )}
          {msg.status === 'sent' && (
            <>
              <button type="button" onClick={() => markStatus(msg, 'delivered')} className={ghost}>وصلت</button>
              <button type="button" onClick={() => markStatus(msg, 'read')} className={ghost}>قُرئت</button>
            </>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label="خيارات إضافية"
              onClick={() => setMsgMenuOpen(msgMenuOpen === msg.id ? null : msg.id)}
              className="rounded-lg border border-[#E4EAEE] bg-white px-2 py-2 text-[#64748B]"
            >
              <FaEllipsisV />
            </button>
            {msgMenuOpen === msg.id && (
              <div className="absolute end-0 z-10 mt-1 min-w-[160px] rounded-lg border border-[#E4EAEE] bg-white p-1 shadow-lg">
                {msg.status === 'sent' && (
                  <button type="button" onClick={() => { sendReminder(msg); setMsgMenuOpen(null); }} className="block w-full rounded px-3 py-2 text-right text-[12px] font-bold hover:bg-[#F8FBFC]">تذكير مرة ثانية</button>
                )}
                <button type="button" onClick={() => { handoff(msg); setMsgMenuOpen(null); }} className="block w-full rounded px-3 py-2 text-right text-[12px] font-bold hover:bg-[#F8FBFC]">حوّليها للموظفة</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedModal({
  onClose, advancedTab, setAdvancedTab, offerForm, setOfferForm, saveOffer, offers, campaigns, services,
  settingsForm, setSettingsForm, saveSettings, settings, ranked, setSelected, setTab, setAdvancedOpen,
  segments, applySegment, groups, messages, appointments, journeys,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="flex max-h-[min(92vh,900px)] w-full max-w-[1360px] flex-col overflow-hidden rounded-xl border border-[#E4EAEE] bg-[#F4F7F8] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E4EAEE] bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">استرجاع العميلات</p>
            <h2 className="mt-1 text-[20px] font-extrabold tracking-tight text-[#0F172A]">إعدادات متقدمة</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">العروض، الإرسال التلقائي، والمجموعات الجاهزة.</p>
          </div>
          <button type="button" onClick={onClose} className={ghost}>إغلاق</button>
        </header>
        <div className="flex gap-1.5 overflow-x-auto border-b border-[#E4EAEE] bg-white px-5 py-2">
          {ADVANCED_SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => setAdvancedTab(s.id)} className={advancedTab === s.id ? pillActive : pillIdle}>{s.label}</button>
          ))}
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
        {advancedTab === 'offers' && (
          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={saveOffer} className={`${card} space-y-3 p-4`}>
              <h3 className="text-[15px] font-bold text-[#0F172A]">عرض عودة (موافقة الإدارة)</h3>
              <input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="اسم العرض" className={field} />
              <div className="flex gap-2">
                <select value={offerForm.discountType} onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value })} className={`flex-1 ${field}`}>
                  <option value="percent">نسبة خصم</option>
                  <option value="amount">قيمة ثابتة ₪</option>
                </select>
                <input type="number" value={offerForm.value} onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })} className="w-28 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px]" />
              </div>
              <input type="date" value={offerForm.expiresAt} onChange={(e) => setOfferForm({ ...offerForm, expiresAt: e.target.value })} className={field} />
              <select value={offerForm.serviceId} onChange={(e) => setOfferForm({ ...offerForm, serviceId: e.target.value })} className={field}>
                <option value="">كل الخدمات المؤهلة</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={offerForm.adminApproved} onChange={(e) => setOfferForm({ ...offerForm, adminApproved: e.target.checked })} /> موافقة الإدارة</label>
              <p className="text-xs text-[#B45309]">لا تكتبي نتائج علاجية. العرض تنظيمي لجلسة محددة وينتهي بتاريخ الصلاحية.</p>
              <button type="submit" className={`w-full ${primaryBtn} justify-center py-2.5`}>حفظ العرض</button>
            </form>
            <div className="space-y-3">
              {offers.map((o) => {
                const used = Object.keys(o.usedBy || {}).length;
                const camp = campaigns.filter((c) => c.offerId === o.id);
                return (
                  <div key={o.id} className={`${card} p-4`}>
                    <p className="font-bold">{o.title}</p>
                    <p className="text-xs text-[#64748B]">ينتهي {o.expiresAt || '—'} · استخدامات {used} · حملات {camp.length}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {advancedTab === 'auto' && (
          <div className={`${card} max-w-2xl space-y-4 p-5`}>
            <h3 className="text-[15px] font-bold text-[#0F172A]">قواعد العيادة</h3>
            <label className="text-[13px] font-bold text-[#64748B]">كم يوم بدون زيارة نعتبرها غايبة
              <input type="number" value={settingsForm.defaultLapseDays} onChange={(e) => setSettingsForm({ ...settingsForm, defaultLapseDays: Number(e.target.value) })} className={`${field} mt-1`} />
            </label>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <label key={cat} className="block text-[13px] font-bold text-[#64748B]">غياب {CATEGORY_LABELS[cat]}
                <input type="number" value={settingsForm.lapseByCategory?.[cat] ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, lapseByCategory: { ...settingsForm.lapseByCategory, [cat]: Number(e.target.value) } })} className={`${field} mt-1`} />
              </label>
            ))}
            <div className="flex flex-wrap gap-3 text-sm">
              {['whatsapp', 'sms', 'email'].map((ch) => (
                <label key={ch} className="flex items-center gap-1">
                  <input type="checkbox" checked={!!settingsForm.channels?.[ch]} onChange={(e) => setSettingsForm({ ...settingsForm, channels: { ...settingsForm.channels, [ch]: e.target.checked } })} />
                  {channelLabel(ch)}
                </label>
              ))}
            </div>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <input type="checkbox" checked={!!settingsForm.reminderEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, reminderEnabled: e.target.checked })} />
              تذكير واحد بعد أيام
              <input type="number" className="w-20 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] p-2" value={settingsForm.reminderAfterDays} onChange={(e) => setSettingsForm({ ...settingsForm, reminderAfterDays: Number(e.target.value) })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">أقل أيام بين الرسائل<input type="number" value={settingsForm.contactCapDays} onChange={(e) => setSettingsForm({ ...settingsForm, contactCapDays: Number(e.target.value) })} className={`${field} mt-1`} /></label>
              <label className="text-sm">أقصى عدد رسائل شهرياً<input type="number" value={settingsForm.contactCapPerMonth} onChange={(e) => setSettingsForm({ ...settingsForm, contactCapPerMonth: Number(e.target.value) })} className={`${field} mt-1`} /></label>
              <label className="text-sm">ناس ما منبعتلهم (للمقارنة) %<input type="number" value={settingsForm.holdoutPercent} onChange={(e) => setSettingsForm({ ...settingsForm, holdoutPercent: Number(e.target.value) })} className={`${field} mt-1`} /></label>
              <label className="text-sm">أقل أهمية عشان تتبعت تلقائي<input type="number" value={settingsForm.autoMinScore} onChange={(e) => setSettingsForm({ ...settingsForm, autoMinScore: Number(e.target.value) })} className={`${field} mt-1`} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!settingsForm.autoRulesEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, autoRulesEnabled: e.target.checked })} />
              إرسال تلقائي — مسودة للمراجعة فقط
            </label>
            <button type="button" onClick={saveSettings} className={primaryBtn}>حفظ القواعد</button>
            {settings.autoRulesEnabled && (
              <button
                type="button"
                className="block text-sm font-bold text-[#047857]"
                onClick={() => {
                  const next = {};
                  ranked.filter((j) => j.score >= settings.autoMinScore).forEach((j) => { next[j.phoneKey] = true; });
                  setSelected(next);
                  setTab('who');
                  setAdvancedOpen(false);
                  toast.info('شُحنت المسودة للمراجعة — لن تُرسل دون «ابدئي الإرسال»');
                }}
              >
                شغّلي الإرسال التلقائي الآن
              </button>
            )}
          </div>
        )}

        {advancedTab === 'advanced' && (
          <div className="space-y-4">
            <div className={`${card} p-4`}>
              <h3 className="mb-2 text-[15px] font-bold text-[#0F172A]">مجموعات جاهزة</h3>
              {segments.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{s.title} ({s.count})</span>
                  <button type="button" onClick={() => { applySegment(s); setAdvancedOpen(false); }} className="text-[12px] font-bold text-[#047857] hover:underline">استخدمي</button>
                </div>
              ))}
              {!segments.length && <p className="text-sm text-[#94A3B8]">لا مجموعات كافية بعد.</p>}
            </div>
            <div className={`${card} p-4`}>
              <h3 className="mb-2 text-[15px] font-bold text-[#0F172A]">توزيع الغائبات حسب الخدمة</h3>
              {Object.entries(groups.byService).map(([k, n]) => (
                <p key={k} className="flex justify-between border-b border-[#EDF1F4] py-2 text-[13px] last:border-0">
                  <span className="text-[#64748B]">{k}</span>
                  <span className="font-bold tabular-nums">{n}</span>
                </p>
              ))}
              {!Object.keys(groups.byService).length && <p className="text-sm text-[#94A3B8]">لا بيانات بعد</p>}
            </div>
            <div className={`${card} p-4`}>
              <h3 className="mb-2 text-[15px] font-bold text-[#0F172A]">أي طريقة تواصل أنجح؟</h3>
              {channelInsights(messages).map((c) => (
                <p key={c.channel} className="text-sm">{channelLabel(c.channel)}: أرسلنا {c.sent} · ردّوا {c.replyRate}%</p>
              ))}
              {!messages.length && <p className="text-sm text-[#94A3B8]">بعد أول حملة تظهر الأرقام هنا.</p>}
              <p className="mt-2 text-xs text-[#94A3B8]">جربي رسالتين يختار النظام بينهما. أقصى عدد رسائل يحمي العميلات من الإزعاج.</p>
            </div>
            <MonthlyPanel campaigns={campaigns} messages={messages} appointments={appointments} journeys={journeys} offers={offers} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ campaigns, messages, appointments, journeys, offers }) {
  if (!campaigns.length) {
    return (
      <div className="rounded-xl border border-[#E4EAEE] bg-white p-10 text-center text-[13px] text-[#64748B]">
        لا نتائج حتى تبدئي حملة وترسلي.
      </div>
    );
  }
  const resultStats = [
    { key: 'sent', label: 'بعتنا لـ', accent: '#059669' },
    { key: 'delivered', label: 'وصلت', accent: '#0FA3A3' },
    { key: 'replied', label: 'ردّوا', accent: '#B45309' },
    { key: 'bookings', label: 'حجزوا', accent: '#059669' },
  ];
  return (
    <div className="space-y-4">
      {campaigns.map((c) => {
        const campMsgs = messages.filter((x) => x.campaignId === c.id);
        const m = campaignMetrics(c, campMsgs, appointments, journeys, offers.find((o) => o.id === c.offerId));
        const cameBack = Math.min(10, Math.max(0, Math.round(Number(m.incrementalRate || 0) / 10)));
        const replied = campMsgs.filter((x) => x.replied).length;
        const values = { sent: m.sent, delivered: m.delivered, replied, bookings: m.bookings };
        return (
          <article key={c.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white">
            <span className="absolute inset-y-0 start-0 w-[3px] bg-[#059669]" />
            <div className="p-4 ps-5">
              <h3 className="text-[16px] font-bold text-[#0F172A]">{c.name}</h3>
              <section className="mt-4 grid grid-cols-2 border-y border-[#E4EAEE] sm:grid-cols-4">
                {resultStats.map((k, i) => (
                  <div key={k.key} className={`px-4 py-3 ${i > 0 ? 'border-s border-[#E4EAEE]' : ''}`}>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
                      {k.label}
                    </p>
                    <p className="mt-2 text-[28px] font-light tabular-nums leading-none">{values[k.key] ?? 0}</p>
                  </div>
                ))}
              </section>
              <p className="mt-4 text-[13px] text-[#334155]">
                من كل 10 بعتنالهم، رجعوا <span className="font-bold tabular-nums">{cameBack}</span> بسبب الرسائل.
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MonthlyPanel({ campaigns, messages, appointments, journeys, offers }) {
  const list = campaigns.map((c) => campaignMetrics(c, messages.filter((x) => x.campaignId === c.id), appointments, journeys, offers.find((o) => o.id === c.offerId)));
  const r = monthlyReport(campaigns, list);
  return (
    <div className={`${card} p-4`}>
      <h3 className="mb-2 text-[15px] font-bold text-[#0F172A]">ملخص الشهر</h3>
      <p className="text-[13px] text-[#64748B]">حملات هذا الشهر: <span className="font-bold tabular-nums text-[#0F172A]">{r.campaigns}</span></p>
    </div>
  );
}

export default Winback;