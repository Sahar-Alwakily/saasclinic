import { describe, expect, it } from 'vitest';
import {
  WA_REMINDER_EVENTS,
  bodyHasRequiredVars,
  canRetrySend,
  canSendApprovedTemplate,
  clinicAccessAllowed,
  dueScheduledEvents,
  fillTemplateVars,
  hoursKeyToEventId,
  mapTwilioApprovalStatus,
  policyBindingForEvent,
  patientAllowsWhatsApp,
  previewTemplateBody,
  sanitizeApprovalName,
  shouldSendReminder,
} from './waReminderTemplates';

describe('catalog', () => {
  it('exposes the appointment, waitlist, and follow-up templates with required variables', () => {
    expect(WA_REMINDER_EVENTS.map((e) => e.id)).toEqual([
      'confirm', 'reminder_24h', 'reminder_day', 'cancel', 'reschedule', 'waitlist', 'followup',
    ]);
    WA_REMINDER_EVENTS.forEach((e) => {
      expect(bodyHasRequiredVars(e.defaultBody)).toBe(true);
    });
  });
});

describe('variable substitution', () => {
  it('fills {{1}}–{{4}} from patient, clinic, date, time', () => {
    const vars = fillTemplateVars({
      patientName: 'لارا',
      clinicName: 'SaharClinic',
      date: '2026-10-27',
      time: '10:00 ص',
    });
    const body = previewTemplateBody(
      'مرحباً {{1}}، نذكّرك بموعدك في {{2}} بتاريخ {{3}} الساعة {{4}}. نتطلع إلى رؤيتك.',
      vars,
    );
    expect(body).toContain('لارا');
    expect(body).toContain('SaharClinic');
    expect(body).toContain('2026-10-27');
    expect(body).toContain('10:00 ص');
    expect(body).not.toMatch(/\{\{\d\}\}/);
  });
});

describe('approval checks', () => {
  it('never allows send unless approved and bound to clinic sender', () => {
    expect(canSendApprovedTemplate({
      enabled: true,
      contentSid: 'HXabc',
      approvalStatus: 'pending',
      accountSid: 'ACabc',
      sender: 'whatsapp:+9725',
    })).toBe(false);
    expect(canSendApprovedTemplate({
      enabled: true,
      contentSid: 'HXabc',
      approvalStatus: 'approved',
      accountSid: 'ACabc',
      sender: 'whatsapp:+9725',
    })).toBe(true);
  });

  it('maps Twilio/Meta statuses without inventing success', () => {
    expect(mapTwilioApprovalStatus('approved', { contentSid: 'HX1', functionsConfigured: true, senderReady: true })).toBe('approved');
    expect(mapTwilioApprovalStatus('received', { contentSid: 'HX1', functionsConfigured: true, senderReady: true })).toBe('pending');
    expect(mapTwilioApprovalStatus('rejected', { contentSid: 'HX1', functionsConfigured: true, senderReady: true })).toBe('rejected');
    expect(mapTwilioApprovalStatus('', { contentSid: '', functionsConfigured: true, senderReady: true })).toBe('draft');
    expect(mapTwilioApprovalStatus('approved', { contentSid: 'HX1', functionsConfigured: false, senderReady: true })).toBe('unavailable');
  });
});

describe('tenant isolation', () => {
  it('blocks cross-clinic access', () => {
    expect(clinicAccessAllowed('clinic_a', 'clinic_a')).toBe(true);
    expect(clinicAccessAllowed('clinic_a', 'clinic_b')).toBe(false);
    expect(clinicAccessAllowed(null, 'clinic_a')).toBe(false);
  });

  it('scopes WhatsApp approval names per clinic', () => {
    const a = sanitizeApprovalName('clinic_111', 'confirm');
    const b = sanitizeApprovalName('clinic_222', 'confirm');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^nura_[a-z0-9_]+_confirm$/);
  });
});

describe('scheduling and duplicates', () => {
  it('maps clinic reminder hours onto template events', () => {
    expect(hoursKeyToEventId(24)).toBe('reminder_24h');
    expect(hoursKeyToEventId(3)).toBe('reminder_day');
    expect(hoursKeyToEventId('confirm')).toBe('confirm');
  });

  it('binds clinic rules to WhatsApp templates', () => {
    const settings = { reminderHours: [24, 3], autoConfirm: true, reminderCap: 3 };
    expect(policyBindingForEvent('reminder_24h', settings).bound).toBe(true);
    expect(policyBindingForEvent('reminder_day', settings).bound).toBe(true);
    expect(policyBindingForEvent('reminder_24h', { reminderHoursText: '3' }).bound).toBe(false);
    expect(policyBindingForEvent('confirm', settings).rule).toMatch(/التأكيد/);
  });

  it('selects 24h vs day-of windows from existing reminderHours', () => {
    const apt = { status: 'confirmed', date: '2026-10-28', waTemplateSent: {} };
    const settings = { reminderHours: [24, 3] };
    const t24 = dueScheduledEvents(apt, settings, new Date('2026-10-27T14:00:00'));
    expect(t24).toContain('reminder_24h');
    const tDay = dueScheduledEvents(apt, settings, new Date('2026-10-28T10:00:00'));
    expect(tDay).toContain('reminder_day');
    expect(tDay).not.toContain('reminder_24h');
  });

  it('skips cancelled appointments for timed reminders', () => {
    const apt = { status: 'cancelled', date: '2026-10-28' };
    expect(dueScheduledEvents(apt, { reminderHours: [24, 3] }, new Date('2026-10-27T14:00:00'))).toEqual([]);
  });

  it('prevents duplicate sends and allows safe retry only when failed retryable', () => {
    const apt = { status: 'confirmed', waTemplateSent: { reminder_24h: { status: 'sent', providerSid: 'SM1' } } };
    expect(shouldSendReminder({ apt, eventId: 'reminder_24h' }).ok).toBe(false);
    expect(shouldSendReminder({ apt: { status: 'confirmed' }, eventId: 'reminder_24h', inFlight: true }).reason).toBe('in_flight');
    expect(canRetrySend({ status: 'sent', providerSid: 'SM1' })).toBe(false);
    expect(canRetrySend({ status: 'failed', retryable: true })).toBe(true);
  });

  it('respects patient opt-out', () => {
    expect(patientAllowsWhatsApp({ doNotContact: true }, {})).toBe(false);
    expect(patientAllowsWhatsApp({ winbackOptOut: true }, {})).toBe(false);
    expect(patientAllowsWhatsApp({}, {})).toBe(true);
  });
});
