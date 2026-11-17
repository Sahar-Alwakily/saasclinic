import { slotsForBooking } from './scheduleSlots';
import { GONE_STATUSES } from './statuses';

export const DEFAULT_WINBACK_SETTINGS = {
  defaultLapseDays: 60,
  lapseByCategory: { laser: 45, vitamins: 30, cosmetica: 40, beauty: 50, all: 60 },
  channels: { whatsapp: true, sms: false, email: false },
  reminderEnabled: true,
  reminderAfterDays: 3,
  contactCapDays: 21,
  contactCapPerMonth: 2,
  allowedHoursStart: 10,
  allowedHoursEnd: 18,
  holdoutPercent: 15,
  autoRulesEnabled: false,
  autoMinScore: 45,
};

export const CATEGORY_LABELS = {
  laser: 'ليزر',
  vitamins: 'فيتامينات',
  cosmetica: 'كوزمتكا',
  beauty: 'تجميل',
  all: 'عام',
};

export function normalizePhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('970') || d.startsWith('972')) return d.slice(-9);
  if (d.startsWith('0')) return d.replace(/^0+/, '');
  return d.slice(-9);
}

export function waDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('970') || d.startsWith('972')) return d;
  if (d.startsWith('0')) return `972${d.slice(1)}`;
  if (d.length === 9) return `972${d}`;
  return d;
}

export function mergeSettings(raw) {
  return {
    ...DEFAULT_WINBACK_SETTINGS,
    ...(raw || {}),
    lapseByCategory: { ...DEFAULT_WINBACK_SETTINGS.lapseByCategory, ...(raw?.lapseByCategory || {}) },
    channels: { ...DEFAULT_WINBACK_SETTINGS.channels, ...(raw?.channels || {}) },
  };
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetween(a, b) {
  return Math.floor((startOfDay(b) - startOfDay(a)) / 86400000);
}

function parseVisitDate(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime()) && String(value).includes('T')) return iso;
  const day = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(day.getTime()) ? null : day;
}

function hashPhone(phone) {
  let h = 0;
  const s = normalizePhone(phone);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return h;
}

export function lapseDaysFor(serviceTitle, category, services, settings) {
  const svc = (services || []).find((s) => s.title === serviceTitle || s.id === serviceTitle);
  const cat = category || svc?.category;
  const map = settings.lapseByCategory || {};
  if (cat && map[cat] != null && map[cat] !== '') return Number(map[cat]);
  return Number(settings.defaultLapseDays || 60);
}

export function publicServiceLabel(serviceTitle, services) {
  const svc = (services || []).find((s) => s.title === serviceTitle);
  const cat = svc?.category;
  if (cat && CATEGORY_LABELS[cat]) return CATEGORY_LABELS[cat];
  if (serviceTitle) return 'جلسة سابقة في العيادة';
  return 'جلسة عناية';
}

export function firstOpenSlots(schedules, count = 3) {
  const results = [];
  const keys = Object.keys(schedules || {});
  if (!keys.length) return results;
  for (let i = 1; i <= 21 && results.length < count; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (const key of keys) {
      const idx = key.indexOf('_');
      if (idx < 0 || key.startsWith('_')) continue;
      const branchId = key.slice(0, idx);
      const specialistId = key.slice(idx + 1);
      const info = slotsForBooking(schedules, branchId, specialistId, dateStr);
      if (info.slots?.length) {
        results.push({ date: dateStr, time: info.slots[0] });
        break;
      }
    }
  }
  return results;
}

export function suggestedContactAt(settings, now = new Date()) {
  const start = Number(settings.allowedHoursStart ?? 10);
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (next.getHours() >= Number(settings.allowedHoursEnd ?? 18) || next.getDay() === 5) {
    next.setDate(next.getDate() + (next.getDay() === 5 ? 2 : 1));
    next.setHours(start, 0, 0, 0);
  } else if (next.getHours() < start) {
    next.setHours(start, 0, 0, 0);
  } else {
    next.setHours(Math.min(next.getHours() + 1, Number(settings.allowedHoursEnd ?? 18) - 1), 0, 0, 0);
  }
  return next;
}

function messagesThisMonth(logs, phone, now) {
  const key = normalizePhone(phone);
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return (logs || []).filter((m) => normalizePhone(m.phone) === key && (m.sentAt || m.createdAt || 0) >= start && m.status !== 'failed').length;
}

function lastContactAt(logs, phone) {
  const key = normalizePhone(phone);
  const times = (logs || [])
    .filter((m) => normalizePhone(m.phone) === key && ['sent', 'delivered', 'read'].includes(m.status))
    .map((m) => m.sentAt || m.createdAt || 0);
  return times.length ? Math.max(...times) : 0;
}

export function buildJourneys({ customers = [], appointments = [], services = [], settings, logs = [], optOuts = {}, now = new Date() }) {
  const byPhone = {};

  const ensure = (phone, nameBits) => {
    const key = normalizePhone(phone);
    if (!key) return null;
    if (!byPhone[key]) {
      byPhone[key] = {
        phoneKey: key,
        phone: phone,
        customerId: null,
        firstName: nameBits.firstName || '',
        lastName: nameBits.lastName || '',
        displayName: [nameBits.firstName, nameBits.lastName].filter(Boolean).join(' ') || nameBits.fullName || 'عميلة',
        doNotContact: false,
        winbackOptOut: false,
        visits: [],
        upcoming: [],
      };
    }
    return byPhone[key];
  };

  customers.forEach((c) => {
    const row = ensure(c.phone, { firstName: c.firstName, lastName: c.lastName });
    if (!row) return;
    row.customerId = c.id;
    row.phone = c.phone;
    row.doNotContact = !!(c.doNotContact || c.winbackOptOut || optOuts[row.phoneKey]);
    row.winbackOptOut = !!(c.winbackOptOut || optOuts[row.phoneKey]);
    row.firstName = c.firstName || row.firstName;
    row.displayName = [c.firstName, c.lastName].filter(Boolean).join(' ') || row.displayName;
    (c.sessions || []).forEach((s) => {
      const d = parseVisitDate(s.recordedAt || s.date);
      if (d) row.visits.push({ date: d, service: s.serviceTitle || s.service, branchId: s.branchId, branchName: s.branchName, source: 'session' });
    });
  });

  appointments.forEach((apt) => {
    const row = ensure(apt.phoneNumber, { fullName: apt.customerName, firstName: (apt.customerName || '').split(' ')[0] });
    if (!row) return;
    if (!row.phone) row.phone = apt.phoneNumber;
    const d = parseVisitDate(apt.date);
    if (!d) return;
    const upcomingStatus = ['pending', 'confirmed'].includes(apt.status);
    if (upcomingStatus && d >= startOfDay(now)) {
      row.upcoming.push(apt);
    }
    if (apt.status !== 'cancelled') {
      row.visits.push({
        date: d,
        service: apt.service,
        serviceId: apt.serviceId,
        branchId: apt.branchId,
        branchName: apt.branchName,
        status: apt.status,
        campaignId: apt.campaignId || '',
        source: 'appointment',
        price: apt.price,
      });
    }
  });

  return Object.values(byPhone).map((row) => {
    if (optOuts[row.phoneKey]) {
      row.doNotContact = true;
      row.winbackOptOut = true;
    }
    const visits = row.visits.sort((a, b) => b.date - a.date);
    const last = visits[0] || null;
    const lastService = last?.service || '';
    const threshold = lapseDaysFor(lastService, null, services, settings);
    const daysSince = last ? daysBetween(last.date, now) : 999;
    const lapsed = !!last && daysSince >= threshold && row.upcoming.length === 0;
    const lastMsg = lastContactAt(logs, row.phone);
    const daysSinceMsg = lastMsg ? daysBetween(new Date(lastMsg), now) : 999;
    const monthCount = messagesThisMonth(logs, row.phone, now);
    const capHit = daysSinceMsg < Number(settings.contactCapDays || 21) || monthCount >= Number(settings.contactCapPerMonth || 2);
    const holdout = (hashPhone(row.phone) % 100) < Number(settings.holdoutPercent || 0);
    const visitCount = visits.length;
    const overdueRatio = threshold ? daysSince / threshold : 0;
    let score = Math.min(100, Math.round(overdueRatio * 28 + Math.min(visitCount, 8) * 7 + (daysSince > 90 ? 10 : 0)));
    if (row.upcoming.length) score = 0;
    let returnChance = Math.max(8, Math.min(78, Math.round(55 + visitCount * 4 - overdueRatio * 12)));
    let confidence = visitCount >= 4 ? 'مرتفعة' : visitCount >= 2 ? 'متوسطة' : 'منخفضة';
    const eligible = lapsed && !row.doNotContact && !row.winbackOptOut && !capHit && !holdout && score >= 20;
    return {
      ...row,
      visits,
      lastVisit: last,
      lastService,
      lastBranch: last?.branchName || '',
      lastBranchId: last?.branchId || '',
      thresholdDays: threshold,
      daysSince,
      lapsed,
      eligible,
      holdout,
      capHit,
      score,
      returnChance,
      confidence,
      suggestedAt: suggestedContactAt(settings, now),
      visitCount,
    };
  });
}

export function rankOpportunities(journeys) {
  return journeys
    .filter((j) => j.eligible)
    .sort((a, b) => b.score - a.score || b.daysSince - a.daysSince || b.visitCount - a.visitCount);
}

export function groupLapsed(journeys) {
  const byService = {};
  const byBranch = {};
  journeys.filter((j) => j.lapsed && !j.doNotContact).forEach((j) => {
    const s = j.lastService || 'غير محدد';
    const b = j.lastBranch || 'غير محدد';
    byService[s] = (byService[s] || 0) + 1;
    byBranch[b] = (byBranch[b] || 0) + 1;
  });
  return { byService, byBranch };
}

export function buildMessage({ clinicName, clinicId, journey, offer, slots, variant = 'A' }) {
  const name = journey.firstName || journey.displayName || 'عزيزتي';
  const serviceLabel = publicServiceLabel(journey.lastService, null);
  const slotText = (slots || []).slice(0, 3).map((s) => `${s.date} ${s.time}`).join('، ');
  const bookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${clinicId}${journey.lastService ? '' : ''}`
    : `/book/${clinicId}`;
  const offerLine = offer?.adminApproved
    ? (variant === 'B'
      ? `يتوفر عرض عودة صالح لفترة محدودة عند الحجز من الرابط.`
      : `إن رغبتِ، يتوفر عرض عودة على جلسات محددة حتى تاريخ انتهائه.`)
    : '';
  const body = [
    `مرحباً ${name}،`,
    `تواصل من ${clinicName || 'العيادة'} بخصوص إمكانية حجز جلسة ${serviceLabel}.`,
    'هذا التذكير تنظيمي فقط، وليس استشارة أو توصية علاجية.',
    slotText ? `أوقات متاحة قريبة: ${slotText}.` : '',
    offerLine,
    `للحجز: ${bookUrl}${offer ? '' : ''}`,
  ].filter(Boolean).join('\n');
  return body;
}

export function suggestSegments(journeys) {
  const lapsed = journeys.filter((j) => j.lapsed && !j.doNotContact);
  const ideas = [];
  const long = lapsed.filter((j) => j.daysSince >= 90);
  if (long.length >= 3) ideas.push({ id: '90d', title: 'منقطعات 90 يوماً فأكثر', count: long.length, phones: long.map((j) => j.phoneKey) });
  Object.entries(groupLapsed(lapsed).byService).forEach(([service, count]) => {
    if (count >= 3) ideas.push({ id: `svc-${service}`, title: `شريحة: ${service}`, count, phones: lapsed.filter((j) => j.lastService === service).map((j) => j.phoneKey) });
  });
  return ideas.slice(0, 6);
}

export function campaignMetrics(campaign, messages, appointments, journeys, offer) {
  const targets = campaign.targetIds || [];
  const holdout = campaign.holdoutIds || [];
  const sent = messages.filter((m) => ['sent', 'delivered', 'read'].includes(m.status));
  const delivered = messages.filter((m) => ['delivered', 'read'].includes(m.status));
  const failed = messages.filter((m) => m.status === 'failed');
  const read = messages.filter((m) => m.status === 'read');
  const replied = messages.filter((m) => m.replied);
  const start = campaign.launchedAt || campaign.createdAt || 0;
  const attributed = appointments.filter((a) => a.campaignId === campaign.id && a.status !== 'cancelled');
  const attended = attributed.filter((a) => ['confirmed', 'completed', 'attended'].includes(a.status));
  const revenue = attributed.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const discountCost = offer && offer.adminApproved
    ? attributed.length * (offer.discountType === 'percent'
      ? (revenue / Math.max(attributed.length, 1)) * (Number(offer.value || 0) / 100)
      : Number(offer.value || 0))
    : 0;
  const holdoutReturned = (journeys || []).filter((j) => holdout.includes(j.phoneKey) && j.visits.some((v) => (v.date?.getTime?.() || 0) >= start)).length;
  const targetReturned = attributed.length;
  const targetN = targets.length || 1;
  const holdN = holdout.length || 1;
  const lift = (targetReturned / targetN) - (holdoutReturned / holdN);
  return {
    targeted: targets.length,
    sent: sent.length,
    delivered: delivered.length,
    failed: failed.length,
    read: read.length,
    responseRate: sent.length ? Math.round((replied.length / sent.length) * 100) : 0,
    deliveryRate: messages.length ? Math.round((delivered.length / messages.length) * 100) : (sent.length ? Math.round((sent.length / Math.max(targets.length, 1)) * 100) : 0),
    bookings: attributed.length,
    attended: attended.length,
    revenue: Math.round(revenue),
    discountCost: Math.round(discountCost),
    net: Math.round(revenue - discountCost),
    holdoutReturned,
    incrementalRate: Math.round(lift * 100),
  };
}

export function channelInsights(messages) {
  const by = {};
  messages.forEach((m) => {
    const ch = m.channel || 'whatsapp';
    if (!by[ch]) by[ch] = { channel: ch, sent: 0, replied: 0, booked: 0 };
    if (['sent', 'delivered', 'read'].includes(m.status)) by[ch].sent += 1;
    if (m.replied) by[ch].replied += 1;
    if (m.booked) by[ch].booked += 1;
  });
  return Object.values(by).map((row) => ({
    ...row,
    replyRate: row.sent ? Math.round((row.replied / row.sent) * 100) : 0,
  }));
}

export function monthlyReport(campaigns, metricsList) {
  const extra = metricsList.reduce((s, m) => s + (m.net || 0), 0);
  const withHoldout = metricsList.filter((m) => m.incrementalRate != null);
  const reliability = withHoldout.length ? 'متوسطة — تعتمد على مجموعة مقارنة ونسب حضور غير مكتملة' : 'منخفضة — لا توجد مجموعة مقارنة كافية';
  return { extra, reliability, campaigns: campaigns.length };
}
