import { ref, runTransaction } from 'firebase/database';
import { normalizePhone, waDigits } from './winback';
import { slotsForBooking } from './scheduleSlots';

export const APT_STATUSES = [
  { id: 'pending', label: 'تحتاج تأكيد العميلة' },
  { id: 'confirmed', label: 'مؤكد' },
  { id: 'rescheduled', label: 'أُعيدت جدولته' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'attended', label: 'حضر' },
  { id: 'noshow', label: 'لم يحضر' },
];

export const DEFAULT_APT_SETTINGS = {
  autoConfirm: true,
  timezone: 'Asia/Jerusalem',
  reminderHours: [24, 3],
  reminderCap: 3,
  extraConfirmEnabled: true,
  highValueAmount: 250,
  depositPolicyEnabled: false,
  depositNote: 'العربون يُطبَّق يدوياً وفق سياسة العيادة، دون خصم آلي.',
  cancellationPolicy: 'يمكن إلغاء أو تغيير الموعد قبل 24 ساعة عبر رابط التأكيد. التأخير أكثر من 15 دقيقة قد يتطلب إعادة جدولة حسب توفر العيادة.',
  waitlistOfferMinutes: 30,
  messageCost: 0.4,
  aiCostMonthly: 0,
  holidays: '',
  quietStart: 10,
  quietEnd: 18,
  noshowFollowupHours: 4,
};

export function mergeAptSettings(raw) {
  return { ...DEFAULT_APT_SETTINGS, ...(raw || {}), reminderHours: raw?.reminderHours || DEFAULT_APT_SETTINGS.reminderHours };
}

export function slotKey(branchId, specialistId, date, time) {
  const safe = String(time || '').replace(/[.#$[\]/]/g, '_');
  return `${branchId || 'x'}__${specialistId || 'any'}__${date || ''}__${safe}`;
}

export function makeToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function appendHistory(apt, entry) {
  const history = Array.isArray(apt?.history) ? apt.history : [];
  return [...history, { at: Date.now(), ...entry }].slice(-40);
}

export function isHoliday(dateStr, settings) {
  const list = String(settings.holidays || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return list.includes(dateStr);
}

export function occupiedKeys(appointments) {
  const set = new Set();
  (appointments || []).forEach((a) => {
    if (['cancelled', 'noshow'].includes(a.status)) return;
    set.add(slotKey(a.branchId, a.specialistId, a.date, a.time));
  });
  return set;
}

export async function claimSlot(database, clinicId, key, appointmentId) {
  const result = await runTransaction(ref(database, `clinics/${clinicId}/slotLocks/${key}`), (cur) => {
    if (cur && cur.appointmentId && cur.appointmentId !== appointmentId) return;
    return { appointmentId, at: Date.now() };
  });
  return result.committed && result.snapshot.val()?.appointmentId === appointmentId;
}

export async function releaseSlot(database, clinicId, key, appointmentId) {
  await runTransaction(ref(database, `clinics/${clinicId}/slotLocks/${key}`), (cur) => {
    if (!cur) return null;
    if (cur.appointmentId && cur.appointmentId !== appointmentId) return cur;
    return null;
  });
}

export function needsExtraConfirm(price, settings) {
  return !!(settings.extraConfirmEnabled && Number(price || 0) >= Number(settings.highValueAmount || 0));
}

export function phoneHistory(appointments, phone) {
  const key = normalizePhone(phone);
  const list = (appointments || []).filter((a) => normalizePhone(a.phoneNumber) === key);
  const done = list.filter((a) => ['attended', 'noshow', 'cancelled', 'confirmed'].includes(a.status));
  const noshow = list.filter((a) => a.status === 'noshow').length;
  const cancelled = list.filter((a) => a.status === 'cancelled').length;
  const attended = list.filter((a) => a.status === 'attended').length;
  const n = Math.max(noshow + cancelled + attended, done.length);
  return { list, n, noshow, cancelled, attended };
}

export function noShowRisk(appointments, apt, now = new Date()) {
  const hist = phoneHistory(appointments, apt.phoneNumber);
  if (hist.n < 5) {
    return { score: null, confidence: 'غير كافية', label: 'بيانات قليلة — لا استنتاج آلي', earlyConfirm: false };
  }
  const rate = hist.noshow / hist.n;
  const cancelRate = hist.cancelled / hist.n;
  let score = Math.round((rate * 70 + cancelRate * 25) * 100) / 100;
  if (apt.status === 'pending') score += 8;
  score = Math.min(95, Math.round(score));
  const confidence = hist.n >= 12 ? 'مرتفعة' : hist.n >= 8 ? 'متوسطة' : 'منخفضة';
  const earlyConfirm = score >= 35 && ['pending', 'confirmed'].includes(apt.status);
  const hoursBefore = (new Date(`${apt.date}T12:00:00`) - now) / 3600000;
  const extraAt = hoursBefore > 6 ? 6 : Math.max(2, Math.round(hoursBefore / 2));
  return { score, confidence, label: `احتمال عدم حضور تقريبي ${score}%`, earlyConfirm, extraReminderHours: extraAt, n: hist.n };
}

export function waitlistScore(entry, slot, now = Date.now()) {
  let score = 0;
  if (entry.serviceId && slot.serviceId && entry.serviceId === slot.serviceId) score += 40;
  else if (entry.service && slot.service && entry.service === slot.service) score += 30;
  if (entry.branchId && slot.branchId && entry.branchId === slot.branchId) score += 25;
  if (entry.specialistId && slot.specialistId && entry.specialistId === slot.specialistId) score += 20;
  const hour = parseInt(String(slot.time || '').replace(/\D/g, '').slice(0, 2) || '12', 10);
  if (entry.preferredTimes === 'any') score += 5;
  if (entry.preferredTimes === 'morning' && hour < 12) score += 10;
  if (entry.preferredTimes === 'afternoon' && hour >= 12) score += 10;
  const ageHours = (now - (entry.createdAt || now)) / 3600000;
  score += Math.min(15, ageHours / 24);
  return score;
}

export function rankWaitlist(entries, slot) {
  return (entries || [])
    .filter((e) => e.status === 'waiting' || e.status === 'offered')
    .filter((e) => !e.serviceId || !slot.serviceId || e.serviceId === slot.serviceId || e.service === slot.service)
    .map((e) => ({ ...e, fit: waitlistScore(e, slot) }))
    .sort((a, b) => b.fit - a.fit || (a.createdAt || 0) - (b.createdAt || 0));
}

export function upcomingGaps({ schedules, appointments, branches, dateStr }) {
  const taken = occupiedKeys(appointments);
  const gaps = [];
  Object.keys(schedules || {}).forEach((key) => {
    const idx = key.indexOf('_');
    if (idx < 0) return;
    const branchId = key.slice(0, idx);
    const specialistId = key.slice(idx + 1);
    const info = slotsForBooking(schedules, branchId, specialistId, dateStr);
    (info.slots || []).forEach((time) => {
      if (!taken.has(slotKey(branchId, specialistId, dateStr, time))) {
        gaps.push({ date: dateStr, time, branchId, specialistId, branchName: (branches || []).find((b) => b.id === branchId)?.name || '' });
      }
    });
  });
  return gaps;
}

export function reminderDue(apt, settings, now = new Date()) {
  if (!['pending', 'confirmed'].includes(apt.status)) return [];
  const hours = (settings.reminderHours || [24, 3]).map(Number);
  const sent = apt.remindersSent || {};
  const start = new Date(`${apt.date}T12:00:00`);
  const hoursLeft = (start - now) / 3600000;
  return hours.filter((h) => hoursLeft <= h && hoursLeft > 0 && !sent[String(h)]);
}

export function recoveredRevenue(appointments, settings) {
  const filled = (appointments || []).filter((a) => a.filledFromCancelledId);
  const uniqueCancel = new Set();
  const rows = [];
  filled.forEach((a) => {
    const cid = a.filledFromCancelledId;
    if (uniqueCancel.has(cid)) return;
    uniqueCancel.add(cid);
    const actual = ['attended', 'confirmed'].includes(a.status) ? Number(a.price || 0) : 0;
    const estimated = Number(a.price || 0);
    rows.push({ id: a.id, cancelledId: cid, actual, estimated, status: a.status });
  });
  const actual = rows.reduce((s, r) => s + r.actual, 0);
  const estimated = rows.reduce((s, r) => s + r.estimated, 0);
  const msgs = (appointments || []).reduce((s, a) => s + Number(a.messageCount || 0), 0);
  const cost = msgs * Number(settings.messageCost || 0) + Number(settings.aiCostMonthly || 0);
  return { rows, filledCount: rows.length, actual, estimated, cost, net: actual - cost };
}

export function fillTimes(appointments) {
  const times = [];
  (appointments || []).forEach((a) => {
    if (!a.filledFromCancelledId || !a.createdAt || !a.cancelledSourceAt) return;
    times.push((a.createdAt - a.cancelledSourceAt) / 60000);
  });
  const avg = times.length ? Math.round(times.reduce((s, n) => s + n, 0) / times.length) : 0;
  return { avgMinutes: avg, samples: times.length };
}

export function statusRates(appointments) {
  const list = appointments || [];
  const n = list.length || 1;
  const count = (st) => list.filter((a) => a.status === st).length;
  return {
    total: list.length,
    attended: count('attended'),
    cancelled: count('cancelled'),
    noshow: count('noshow'),
    pending: count('pending'),
    confirmed: count('confirmed'),
    attendRate: Math.round((count('attended') / n) * 100),
    cancelRate: Math.round((count('cancelled') / n) * 100),
    noshowRate: Math.round((count('noshow') / n) * 100),
  };
}

export function cancelHotspots(appointments) {
  const byService = {};
  const byHour = {};
  (appointments || []).filter((a) => a.status === 'cancelled').forEach((a) => {
    byService[a.service || '—'] = (byService[a.service || '—'] || 0) + 1;
    byHour[a.time || '—'] = (byHour[a.time || '—'] || 0) + 1;
  });
  return { byService, byHour };
}

export function staffBranchCompare(appointments) {
  const by = {};
  (appointments || []).forEach((a) => {
    const k = `${a.specialistName || 'غير معيّنة'} · ${a.branchName || 'فرع'}`;
    if (!by[k]) by[k] = { label: k, total: 0, attended: 0, cancelled: 0, noshow: 0 };
    by[k].total += 1;
    if (a.status === 'attended') by[k].attended += 1;
    if (a.status === 'cancelled') by[k].cancelled += 1;
    if (a.status === 'noshow') by[k].noshow += 1;
  });
  return Object.values(by);
}

export function experimentStats(appointments) {
  const by = {};
  (appointments || []).forEach((a) => {
    const v = a.reminderVariant || 'A';
    if (!by[v]) by[v] = { variant: v, n: 0, confirmed: 0, attended: 0, cancelled: 0 };
    by[v].n += 1;
    if (['confirmed', 'attended'].includes(a.status)) by[v].confirmed += 1;
    if (a.status === 'attended') by[v].attended += 1;
    if (a.status === 'cancelled') by[v].cancelled += 1;
  });
  return Object.values(by).map((r) => ({
    ...r,
    confirmRate: r.n ? Math.round((r.confirmed / r.n) * 100) : 0,
    attendRate: r.n ? Math.round((r.attended / r.n) * 100) : 0,
  }));
}

export function winbackReturnRate(appointments) {
  const tagged = (appointments || []).filter((a) => a.campaignId);
  const returned = tagged.filter((a) => !['cancelled', 'noshow'].includes(a.status));
  return { tagged: tagged.length, returned: returned.length, rate: tagged.length ? Math.round((returned.length / tagged.length) * 100) : 0 };
}

export function manageUrl(clinicId, token) {
  if (typeof window === 'undefined') return `/book/${clinicId}/manage/${token}`;
  return `${window.location.origin}/book/${clinicId}/manage/${token}`;
}

export function reminderBody(clinicName, apt, clinicId, variant = 'A') {
  const link = apt.manageToken ? manageUrl(clinicId, apt.manageToken) : '';
  const a = variant === 'B'
    ? `تأكيد موعدكِ في ${clinicName}: ${apt.date} ${apt.time}.`
    : `تذكير بموعدكِ لدى ${clinicName} يوم ${apt.date} الساعة ${apt.time}.`;
  return `${a}\nللتأكيد أو الإلغاء أو التغيير: ${link}\nهذه رسالة تنظيمية فقط.`;
}

export function noshowFollowupBody(clinicName, apt, clinicId) {
  const link = apt.manageToken ? manageUrl(clinicId, apt.manageToken) : `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${clinicId}`;
  return `مرحباً، نأمل أن تكوني بخير. فاتكِ موعد ${apt.service || 'الجلسة'} في ${clinicName}. إن رغبتِ بإعادة الحجز: ${link}`;
}

export { normalizePhone, waDigits };
