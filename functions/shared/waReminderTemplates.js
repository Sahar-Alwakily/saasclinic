/** Canonical WhatsApp reminder catalog and send-policy helpers. No Twilio calls here. */

export const WA_TEMPLATE_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'unavailable'];

export const WA_REMINDER_EVENTS = [
  {
    id: 'confirm',
    label: 'تأكيد الموعد',
    event: 'appointment.confirmed',
    approvalNameSuffix: 'confirm',
    defaultBody: 'مرحباً {{1}}، تم تأكيد موعدك في {{2}} بتاريخ {{3}} الساعة {{4}}. نتطلع إلى رؤيتك.',
  },
  {
    id: 'reminder_24h',
    label: 'تذكير قبل 24 ساعة',
    event: 'appointment.reminder_24h',
    approvalNameSuffix: 'reminder_24h',
    defaultBody: 'مرحباً {{1}}، نذكّرك بموعدك في {{2}} بتاريخ {{3}} الساعة {{4}}. نتطلع إلى رؤيتك.',
  },
  {
    id: 'reminder_day',
    label: 'تذكير يوم الموعد',
    event: 'appointment.reminder_day',
    approvalNameSuffix: 'reminder_day',
    defaultBody: 'مرحباً {{1}}، نذكّرك أن موعدك في {{2}} اليوم {{3}} الساعة {{4}}. نتطلع إلى رؤيتك.',
  },
  {
    id: 'cancel',
    label: 'إلغاء الموعد',
    event: 'appointment.cancelled',
    approvalNameSuffix: 'cancel',
    defaultBody: 'مرحباً {{1}}، تم إلغاء موعدك في {{2}} بتاريخ {{3}} الساعة {{4}}. يمكنك إعادة الحجز عند الحاجة.',
  },
  {
    id: 'reschedule',
    label: 'إعادة جدولة الموعد',
    event: 'appointment.rescheduled',
    approvalNameSuffix: 'reschedule',
    defaultBody: 'مرحباً {{1}}، تم تغيير موعدك في {{2}} ليصبح بتاريخ {{3}} الساعة {{4}}. نتطلع إلى رؤيتك.',
  },
];

export const SAMPLE_TEMPLATE_VARS = {
  1: 'سارة',
  2: 'عيادة نورا',
  3: '28/10/2026',
  4: '10:00 ص',
};

export const STATUS_LABELS_AR = {
  draft: 'مسودة',
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  unavailable: 'غير متاح',
};

export function clinicAccessAllowed(userClinicId, requestedClinicId) {
  return Boolean(userClinicId && requestedClinicId && userClinicId === requestedClinicId);
}

export function sanitizeApprovalName(clinicId, eventId) {
  const clinic = String(clinicId || 'clinic').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24);
  const event = String(eventId || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `nura_${clinic}_${event}`.slice(0, 512);
}

export function fillTemplateVars({ patientName, clinicName, date, time }) {
  return {
    1: String(patientName || '').trim() || 'عميلتنا',
    2: String(clinicName || '').trim() || 'العيادة',
    3: String(date || '').trim() || '—',
    4: String(time || '').trim() || '—',
  };
}

export function previewTemplateBody(body, vars = SAMPLE_TEMPLATE_VARS) {
  return String(body || '').replace(/\{\{(\d+)\}\}/g, (_, n) => (vars[n] != null ? String(vars[n]) : `{{${n}}}`));
}

export function bodyHasRequiredVars(body) {
  const text = String(body || '');
  return ['{{1}}', '{{2}}', '{{3}}', '{{4}}'].every((token) => text.includes(token));
}

export function mapTwilioApprovalStatus(twilioStatus, { contentSid, functionsConfigured, senderReady } = {}) {
  if (!functionsConfigured) return 'unavailable';
  if (!senderReady) return 'unavailable';
  if (!contentSid) return 'draft';
  const s = String(twilioStatus || '').toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (['received', 'pending', 'submitted', 'in_review', 'pending_approval'].includes(s)) return 'pending';
  if (['paused', 'disabled', 'unsubmitted', 'flagged'].includes(s)) return 'unavailable';
  return 'pending';
}

export function canSendApprovedTemplate(record) {
  return Boolean(
    record
    && record.enabled !== false
    && record.contentSid
    && record.approvalStatus === 'approved'
    && record.accountSid
    && record.sender,
  );
}

export function parseReminderHours(settings) {
  if (settings?.reminderHoursText != null && String(settings.reminderHoursText).trim() !== '') {
    return String(settings.reminderHoursText).split(/[,\s]+/).map(Number).filter((n) => n > 0);
  }
  if (Array.isArray(settings?.reminderHours) && settings.reminderHours.length) {
    return settings.reminderHours.map(Number).filter((n) => n > 0);
  }
  return [24, 3];
}

export function policyBindingForEvent(eventId, settings) {
  const hours = parseReminderHours(settings);
  const early = hours.filter((h) => h >= 18);
  const sameDay = hours.filter((h) => h < 18);
  if (eventId === 'confirm') {
    return {
      bound: true,
      rule: settings?.autoConfirm
        ? 'مربوط بقاعدة التأكيد التلقائي: يُرسل عند تأكيد الموعد.'
        : 'مربوط بقاعدة التأكيد: يُرسل عند تأكيد الموعد من التقويم.',
    };
  }
  if (eventId === 'reminder_24h') {
    return {
      bound: early.length > 0,
      rule: early.length
        ? `مربوط بقاعدة التذكيرات: قبل ${early.join(' و ')} ساعة.`
        : 'غير مربوط — أضيفي 24 (أو أي قيمة ≥ 18) في قواعد التذكير.',
    };
  }
  if (eventId === 'reminder_day') {
    return {
      bound: sameDay.length > 0,
      rule: sameDay.length
        ? `مربوط بقاعدة التذكيرات: قبل ${sameDay.join(' و ')} ساعة يوم الموعد.`
        : 'غير مربوط — أضيفي 3 (أو أي قيمة أقل من 18) في قواعد التذكير.',
    };
  }
  if (eventId === 'cancel') {
    return { bound: true, rule: 'مربوط بقاعدة الإلغاء: يُرسل عند إلغاء الموعد.' };
  }
  if (eventId === 'reschedule') {
    return { bound: true, rule: 'مربوط بقاعدة إعادة الجدولة: يُرسل عند تغيير التاريخ أو الساعة.' };
  }
  return { bound: false, rule: '' };
}

export function hoursKeyToEventId(hoursKey) {
  if (hoursKey === 'confirm' || hoursKey === 'confirmed') return 'confirm';
  if (hoursKey === 'cancel' || hoursKey === 'cancelled') return 'cancel';
  if (hoursKey === 'reschedule' || hoursKey === 'rescheduled') return 'reschedule';
  const n = Number(hoursKey);
  if (Number.isFinite(n) && n >= 18) return 'reminder_24h';
  if (Number.isFinite(n)) return 'reminder_day';
  return null;
}

export function patientAllowsWhatsApp(customer, appointment) {
  if (customer?.doNotContact || customer?.winbackOptOut) return false;
  if (appointment?.doNotContact) return false;
  return true;
}

export function shouldSendReminder({ apt, eventId, log, inFlight }) {
  if (!apt || !eventId) return { ok: false, reason: 'missing' };
  if (inFlight) return { ok: false, reason: 'in_flight' };
  if (eventId === 'cancel' && apt.status !== 'cancelled') return { ok: false, reason: 'not_cancelled' };
  if (eventId === 'reschedule' && apt.status !== 'rescheduled') return { ok: false, reason: 'not_rescheduled' };
  if (['confirm', 'reminder_24h', 'reminder_day'].includes(eventId) && ['cancelled', 'noshow', 'attended'].includes(apt.status)) {
    return { ok: false, reason: 'apt_closed' };
  }
  const stamp = apt.waTemplateSent?.[eventId] || log;
  if (stamp?.providerSid || stamp?.status === 'sent' || (typeof stamp === 'number' && stamp > 0)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (stamp?.status === 'sending') return { ok: false, reason: 'in_flight' };
  if (stamp?.status === 'failed' && stamp.retryable === false) return { ok: false, reason: 'failed_terminal' };
  return { ok: true };
}

export function canRetrySend(log) {
  if (!log) return true;
  if (log.providerSid || log.status === 'sent') return false;
  return log.status === 'failed' && log.retryable === true;
}

function ymdLocal(date) {
  const x = date instanceof Date ? date : new Date(date);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function dueScheduledEvents(apt, settings, now = new Date()) {
  if (!apt || !['pending', 'confirmed'].includes(apt.status)) return [];
  const hours = parseReminderHours(settings);
  const early = hours.filter((h) => h >= 18);
  const sameDay = hours.filter((h) => h < 18);
  const start = new Date(`${apt.date}T12:00:00`);
  const hoursLeft = (start - now) / 3600000;
  const today = ymdLocal(now);
  const events = [];
  if (apt.status === 'pending' && apt.date >= today && !apt.waTemplateSent?.confirm) events.push('confirm');
  const earlyMax = early.length ? Math.max(...early) : 0;
  const dayMax = sameDay.length ? Math.max(...sameDay) : 0;
  if (early.length && hoursLeft <= earlyMax && hoursLeft > (dayMax || 12) && !apt.waTemplateSent?.reminder_24h) {
    events.push('reminder_24h');
  }
  if (sameDay.length && hoursLeft <= dayMax && hoursLeft > 0 && !apt.waTemplateSent?.reminder_day) {
    events.push('reminder_day');
  }
  return [...new Set(events)];
}

export function defaultTemplateRecord(eventId) {
  const def = WA_REMINDER_EVENTS.find((e) => e.id === eventId);
  return {
    eventId,
    enabled: true,
    body: def?.defaultBody || '',
    language: 'ar',
    category: 'UTILITY',
    contentSid: '',
    approvalStatus: 'draft',
    approvalName: '',
    accountSid: '',
    sender: '',
    rejectionReason: '',
    lastSyncedAt: null,
    submittedAt: null,
  };
}

export function mergeTemplateRecord(eventId, raw) {
  return { ...defaultTemplateRecord(eventId), ...(raw || {}), eventId };
}
