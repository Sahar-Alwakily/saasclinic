import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
  FaWhatsapp, FaPause, FaPlay, FaStop, FaSync, FaUserNurse, FaBan,
} from 'react-icons/fa';
import {
  mergeSettings, DEFAULT_WINBACK_SETTINGS, CATEGORY_LABELS, buildJourneys, rankOpportunities,
  groupLapsed, buildMessage, firstOpenSlots, waDigits, suggestSegments, campaignMetrics,
  channelInsights, monthlyReport, publicServiceLabel, normalizePhone,
} from '../utils/winback';

const TABS = [
  { id: 'detect', label: 'الاكتشاف' },
  { id: 'chance', label: 'فرصة العودة' },
  { id: 'campaigns', label: 'الحملات' },
  { id: 'offers', label: 'العروض' },
  { id: 'auto', label: 'الأتمتة' },
  { id: 'results', label: 'النتائج' },
  { id: 'advanced', label: 'المتقدم' },
];

const Winback = () => {
  const { clinicPath, clinicId, clinicInfo } = useClinic();
  const [tab, setTab] = useState('detect');
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
      window.open(`https://wa.me/${waDigits(msg.phone)}?text=${encodeURIComponent(msg.body || '')}`, '_blank');
      await update(ref(database, clinicPath(`winbackMessages/${msg.id}`)), { status: 'sent', sentAt: Date.now(), attempt: (msg.attempt || 0) + 1 });
      toast.success('فُتح واتساب — سجّلّي الحالة بعد الإرسال');
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
    setTab('chance');
    toast.info('شُحنت الشريحة للمراجعة');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">استرجاع العميلات المنقطعات</h1>
        <p className="text-sm text-gray-500 mt-1">اكتشاف، مراجعة، حملة مصرّح بها، دون توصيات طبية آلية.</p>
      </div>

      <div className="flex gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-3 py-2 rounded-xl text-sm font-bold ${tab === t.id ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'detect' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <Stat label="منقطعات" value={lapsed.length} />
            <Stat label="مؤهلات للحملة" value={ranked.length} />
            <Stat label="قادم لديهن موعد" value={journeys.filter((j) => j.upcoming.length).length} />
            <Stat label="طلبن عدم التواصل" value={journeys.filter((j) => j.doNotContact).length} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <h3 className="font-bold mb-3 dark:text-white">حسب الخدمة السابقة</h3>
              {Object.entries(groups.byService).map(([k, n]) => <p key={k} className="text-sm flex justify-between py-1"><span>{k}</span><span className="font-bold">{n}</span></p>)}
              {!Object.keys(groups.byService).length && <p className="text-sm text-gray-400">لا بيانات بعد</p>}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
              <h3 className="font-bold mb-3 dark:text-white">حسب الفرع وآخر زيارة</h3>
              {lapsed.slice(0, 8).map((j) => (
                <p key={j.phoneKey} className="text-sm flex justify-between py-1 gap-2">
                  <span className="truncate">{j.displayName} · {j.lastBranch || '—'}</span>
                  <span className="text-gray-400 shrink-0">{j.daysSince} يوم</span>
                </p>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500">
                <tr>
                  <th className="p-3 text-right">العميلة</th>
                  <th className="p-3 text-right">آخر خدمة / فرع</th>
                  <th className="p-3 text-right">آخر زيارة</th>
                  <th className="p-3 text-right">حد الانقطاع</th>
                  <th className="p-3 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {lapsed.map((j) => (
                  <tr key={j.phoneKey} className="border-t border-gray-50 dark:border-slate-700">
                    <td className="p-3 font-bold dark:text-white">{j.displayName}<div className="text-xs text-gray-400" dir="ltr">{j.phone}</div></td>
                    <td className="p-3">{j.lastService || '—'}<div className="text-xs text-gray-400">{j.lastBranch}</div></td>
                    <td className="p-3">{j.daysSince} يوم</td>
                    <td className="p-3">{j.thresholdDays} يوم {j.lastService ? `(${publicServiceLabel(j.lastService, services)})` : ''}</td>
                    <td className="p-3 text-xs">
                      {j.upcoming.length ? 'موعد قادم' : j.doNotContact ? 'بدون تواصل' : j.holdout ? 'مجموعة مقارنة' : j.eligible ? 'مؤهلة' : 'مستبعدة (سقف تواصل)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!lapsed.length && <p className="p-8 text-center text-gray-400">لا توجد منقطعات وفق مدة العيادة الحالية.</p>}
          </div>
        </div>
      )}

      {tab === 'chance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 space-y-3">
            <h3 className="font-bold dark:text-white">مراجعة المستهدفات قبل الإطلاق</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="p-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              <select value={draftChannel} onChange={(e) => setDraftChannel(e.target.value)} className="p-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600">
                {settings.channels.whatsapp && <option value="whatsapp">واتساب</option>}
                {settings.channels.sms && <option value="sms">رسالة نصية</option>}
                {settings.channels.email && <option value="email">بريد</option>}
              </select>
              <select value={draftOffer} onChange={(e) => setDraftOffer(e.target.value)} className="p-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600">
                <option value="">بدون عرض</option>
                {offers.filter((o) => o.adminApproved).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={draftVariant} onChange={(e) => setDraftVariant(e.target.checked)} /> اختبار صيغتين (أ/ب)</label>
            <button onClick={() => createCampaign('review')} className="bg-pink-500 text-white px-4 py-2 rounded-xl font-bold">حفظ للمراجعة</button>
          </div>
          {ranked.map((j) => (
            <label key={j.phoneKey} className="flex gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
              <input type="checkbox" checked={!!selected[j.phoneKey]} onChange={() => toggleSelect(j.phoneKey)} />
              <div className="flex-1">
                <p className="font-bold dark:text-white">{j.displayName} <span className="text-xs text-gray-400">نقاط {j.score}</span></p>
                <p className="text-xs text-gray-500">انقطاع {j.daysSince} يوم · {j.visitCount} حجوزات · احتمال عودة {j.returnChance}% ({j.confidence})</p>
                <p className="text-xs text-gray-400 mt-1">توقيت مقترح: {j.suggestedAt.toLocaleString('ar')}</p>
                {j.customerId && <Link className="text-xs text-pink-600" to={`/customers/${j.customerId}`}>الملف</Link>}
              </div>
              <button type="button" onClick={() => optOut(j)} className="text-xs text-rose-500 flex items-center gap-1"><FaBan /> انسحاب</button>
            </label>
          ))}
          {!ranked.length && <p className="text-center text-gray-400 py-10">لا مؤهلات حالياً (مواعيد قادمة، انسحاب، أو سقف تواصل).</p>}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 && <p className="text-gray-400 text-center py-10">لا حملات بعد. اختاري العميلات من «فرصة العودة».</p>}
          {campaigns.map((c) => {
            const campMsgs = messages.filter((m) => m.campaignId === c.id);
            return (
              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold dark:text-white">{c.name}</h3>
                    <p className="text-xs text-gray-400">{c.status} · {c.channel} · { (c.targetIds || []).length } مستهدفة · مقارنة {(c.holdoutIds || []).length}</p>
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'review' && <button onClick={() => launchCampaign(c)} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm font-bold"><FaPlay className="inline ml-1" /> إطلاق</button>}
                    {c.status === 'active' && <button onClick={() => update(ref(database, clinicPath(`winbackCampaigns/${c.id}`)), { status: 'paused' })} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm"><FaPause /></button>}
                    {c.status === 'paused' && <button onClick={() => update(ref(database, clinicPath(`winbackCampaigns/${c.id}`)), { status: 'active' })} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm"><FaPlay /></button>}
                    {c.status !== 'stopped' && <button onClick={() => stopCampaign(c.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm"><FaStop /></button>}
                  </div>
                </div>
                <div className="space-y-2">
                  {campMsgs.map((m) => (
                    <div key={m.id} className="text-sm border border-gray-50 dark:border-slate-700 rounded-xl p-3">
                      <div className="flex justify-between gap-2">
                        <p className="font-bold dark:text-white">{m.name} <span className="text-xs font-normal text-gray-400">{m.status} · {m.variant}</span></p>
                        <div className="flex flex-wrap gap-1">
                          {m.status === 'queued' && <button onClick={() => sendMessage(m)} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs"><FaWhatsapp /> إرسال</button>}
                          {m.status === 'failed' && <button onClick={() => retryFailed(m)} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs"><FaSync /> إعادة</button>}
                          {m.status === 'sent' && (
                            <>
                              <button onClick={() => markStatus(m, 'delivered')} className="px-2 py-1 bg-gray-50 rounded-lg text-xs">وصلت</button>
                              <button onClick={() => markStatus(m, 'read')} className="px-2 py-1 bg-gray-50 rounded-lg text-xs">قُرئت</button>
                              <button onClick={() => sendReminder(m)} className="px-2 py-1 bg-gray-50 rounded-lg text-xs">تذكير واحد</button>
                            </>
                          )}
                          <button onClick={() => handoff(m)} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs"><FaUserNurse /> استقبال</button>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-gray-500 mt-2 font-sans">{m.body}</pre>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {inbox.filter((i) => i.status === 'open').length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
              <h3 className="font-bold mb-2">صندوق الاستقبال</h3>
              {inbox.filter((i) => i.status === 'open').map((i) => (
                <div key={i.id} className="text-sm flex justify-between py-2">
                  <span>{i.name} — {i.phone}</span>
                  <button onClick={() => update(ref(database, clinicPath(`winbackInbox/${i.id}`)), { status: 'done' })} className="text-xs font-bold">تم</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="grid md:grid-cols-2 gap-4">
          <form onSubmit={saveOffer} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border space-y-3">
            <h3 className="font-bold dark:text-white">عرض عودة (موافقة الإدارة)</h3>
            <input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="اسم العرض" className="w-full p-2.5 border rounded-xl dark:bg-slate-700" />
            <div className="flex gap-2">
              <select value={offerForm.discountType} onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value })} className="flex-1 p-2.5 border rounded-xl dark:bg-slate-700">
                <option value="percent">نسبة خصم</option>
                <option value="amount">قيمة ثابتة ₪</option>
              </select>
              <input type="number" value={offerForm.value} onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })} className="w-28 p-2.5 border rounded-xl dark:bg-slate-700" />
            </div>
            <input type="date" value={offerForm.expiresAt} onChange={(e) => setOfferForm({ ...offerForm, expiresAt: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-700" />
            <select value={offerForm.serviceId} onChange={(e) => setOfferForm({ ...offerForm, serviceId: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-700">
              <option value="">كل الخدمات المؤهلة</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={offerForm.adminApproved} onChange={(e) => setOfferForm({ ...offerForm, adminApproved: e.target.checked })} /> موافقة الإدارة</label>
            <p className="text-xs text-amber-700">لا تكتبي نتائج علاجية. العرض تنظيمي لجلسة محددة وينتهي بتاريخ الصلاحية. الكوبون يُستخدم مرة لكل عميلة.</p>
            <button className="w-full bg-pink-500 text-white py-2.5 rounded-xl font-bold">حفظ العرض</button>
          </form>
          <div className="space-y-3">
            {offers.map((o) => {
              const used = Object.keys(o.usedBy || {}).length;
              const camp = campaigns.filter((c) => c.offerId === o.id);
              const relatedApt = appointments.filter((a) => camp.some((c) => a.campaignId === c.id));
              const revenue = relatedApt.reduce((s, a) => s + Number(a.price || 0), 0);
              const cost = o.discountType === 'percent' ? revenue * (Number(o.value) / 100) : relatedApt.length * Number(o.value || 0);
              return (
                <div key={o.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border">
                  <p className="font-bold dark:text-white">{o.title}</p>
                  <p className="text-xs text-gray-500">ينتهي {o.expiresAt || '—'} · استخدامات {used} · إيراد {Math.round(revenue)} ₪ · تكلفة خصم {Math.round(cost)} ₪</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'auto' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border space-y-4 max-w-2xl">
          <h3 className="font-bold dark:text-white">قواعد تحددها العيادة</h3>
          <label className="text-sm">مدة الانقطاع الافتراضية (يوم)
            <input type="number" value={settingsForm.defaultLapseDays} onChange={(e) => setSettingsForm({ ...settingsForm, defaultLapseDays: Number(e.target.value) })} className="w-full mt-1 p-2.5 border rounded-xl dark:bg-slate-700" />
          </label>
          {Object.keys(CATEGORY_LABELS).map((cat) => (
            <label key={cat} className="text-sm block">انقطاع {CATEGORY_LABELS[cat]}
              <input type="number" value={settingsForm.lapseByCategory?.[cat] ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, lapseByCategory: { ...settingsForm.lapseByCategory, [cat]: Number(e.target.value) } })} className="w-full mt-1 p-2.5 border rounded-xl dark:bg-slate-700" />
            </label>
          ))}
          <div className="flex gap-3 text-sm">
            {['whatsapp', 'sms', 'email'].map((ch) => (
              <label key={ch} className="flex items-center gap-1"><input type="checkbox" checked={!!settingsForm.channels?.[ch]} onChange={(e) => setSettingsForm({ ...settingsForm, channels: { ...settingsForm.channels, [ch]: e.target.checked } })} /> {ch}</label>
            ))}
          </div>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!settingsForm.reminderEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, reminderEnabled: e.target.checked })} /> تذكير واحد بعد أيام
            <input type="number" className="w-16 p-1 border rounded" value={settingsForm.reminderAfterDays} onChange={(e) => setSettingsForm({ ...settingsForm, reminderAfterDays: Number(e.target.value) })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">سقف أيام بين الرسائل<input type="number" value={settingsForm.contactCapDays} onChange={(e) => setSettingsForm({ ...settingsForm, contactCapDays: Number(e.target.value) })} className="w-full p-2 border rounded-xl dark:bg-slate-700" /></label>
            <label className="text-sm">حد الرسائل شهرياً<input type="number" value={settingsForm.contactCapPerMonth} onChange={(e) => setSettingsForm({ ...settingsForm, contactCapPerMonth: Number(e.target.value) })} className="w-full p-2 border rounded-xl dark:bg-slate-700" /></label>
            <label className="text-sm">نسبة مجموعة المقارنة<input type="number" value={settingsForm.holdoutPercent} onChange={(e) => setSettingsForm({ ...settingsForm, holdoutPercent: Number(e.target.value) })} className="w-full p-2 border rounded-xl dark:bg-slate-700" /></label>
            <label className="text-sm">حد النقاط للأتمتة<input type="number" value={settingsForm.autoMinScore} onChange={(e) => setSettingsForm({ ...settingsForm, autoMinScore: Number(e.target.value) })} className="w-full p-2 border rounded-xl dark:bg-slate-700" /></label>
          </div>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={!!settingsForm.autoRulesEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, autoRulesEnabled: e.target.checked })} /> تشغيل مسودة تلقائية للمؤهلات فوق حد النقاط (تبقى للمراجعة)</label>
          <button type="button" onClick={saveSettings} className="bg-pink-500 text-white px-4 py-2 rounded-xl font-bold">حفظ القواعد</button>
          {settings.autoRulesEnabled && (
            <button type="button" className="block text-sm text-pink-600 font-bold" onClick={() => {
              const next = {};
              ranked.filter((j) => j.score >= settings.autoMinScore).forEach((j) => { next[j.phoneKey] = true; });
              setSelected(next);
              setTab('chance');
              toast.info('شُحنت المسودة للمراجعة — لن تُرسل دون إطلاقكِ');
            }}>تشغيل القواعد الآن</button>
          )}
        </div>
      )}

      {tab === 'results' && (
        <ResultsPanel campaigns={campaigns} messages={messages} appointments={appointments} journeys={journeys} offers={offers} />
      )}

      {tab === 'advanced' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border">
            <h3 className="font-bold mb-2 dark:text-white">شرائح مقترحة لحملة جديدة</h3>
            {segments.map((s) => (
              <div key={s.id} className="flex justify-between items-center py-2 text-sm">
                <span>{s.title} ({s.count})</span>
                <button onClick={() => applySegment(s)} className="text-pink-600 font-bold">مراجعة</button>
              </div>
            ))}
            {!segments.length && <p className="text-sm text-gray-400">لا شرائح كافية بعد.</p>}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border">
            <h3 className="font-bold mb-2 dark:text-white">أداء القنوات والصيغ</h3>
            {channelInsights(messages).map((c) => (
              <p key={c.channel} className="text-sm">{c.channel}: إرسال {c.sent} · رد {c.replyRate}%</p>
            ))}
            {!messages.length && <p className="text-sm text-gray-400">بعد الإطلاق تظهر أفضل قناة ووقت حسب النتائج.</p>}
            <p className="text-xs text-gray-400 mt-2">اختبار أ/ب يوزّع الصيغ عند الإطلاق. سقف التواصل من قواعد العيادة يمنع الإرهاق.</p>
          </div>
          <MonthlyPanel campaigns={campaigns} messages={messages} appointments={appointments} journeys={journeys} offers={offers} />
        </div>
      )}
    </div>
  );
};

function Stat({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold dark:text-white">{value}</p>
    </div>
  );
}

function ResultsPanel({ campaigns, messages, appointments, journeys, offers }) {
  if (!campaigns.length) return <p className="text-gray-400 text-center py-10">لا نتائج حتى إطلاق حملة.</p>;
  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const m = campaignMetrics(c, messages.filter((x) => x.campaignId === c.id), appointments, journeys, offers.find((o) => o.id === c.offerId));
        return (
          <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border grid md:grid-cols-4 gap-3 text-sm">
            <p className="md:col-span-4 font-bold dark:text-white">{c.name}</p>
            <p>مستهدفات {m.targeted}</p>
            <p>تسليم {m.deliveryRate}%</p>
            <p>استجابة {m.responseRate}%</p>
            <p>حجوزات {m.bookings}</p>
            <p>حضور {m.attended}</p>
            <p>إيراد {m.revenue} ₪</p>
            <p>تكلفة خصم {m.discountCost} ₪</p>
            <p>صافي {m.net} ₪</p>
            <p className="md:col-span-4 text-xs text-gray-400">عودة مجموعة المقارنة {m.holdoutReturned} · أثر محتمل (فرق النسب) {m.incrementalRate} نقطة</p>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyPanel({ campaigns, messages, appointments, journeys, offers }) {
  const list = campaigns.map((c) => campaignMetrics(c, messages.filter((x) => x.campaignId === c.id), appointments, journeys, offers.find((o) => o.id === c.offerId)));
  const r = monthlyReport(campaigns, list);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border">
      <h3 className="font-bold mb-2 dark:text-white">تقرير شهري تقديري</h3>
      <p className="text-sm">إيرادات إضافية مقدّرة (صافي بعد الخصم): {r.extra} ₪</p>
      <p className="text-xs text-gray-400 mt-1">موثوقية التقدير: {r.reliability}. ليست ضمان إيراد ولا نتيجة علاجية.</p>
    </div>
  );
}

export default Winback;
