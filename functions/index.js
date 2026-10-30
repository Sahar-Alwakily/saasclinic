import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  WA_REMINDER_EVENTS,
  SAMPLE_TEMPLATE_VARS,
  bodyHasRequiredVars,
  canSendApprovedTemplate,
  clinicAccessAllowed,
  dueScheduledEvents,
  fillTemplateVars,
  hoursKeyToEventId,
  mapTwilioApprovalStatus,
  mergeTemplateRecord,
  patientAllowsWhatsApp,
  sanitizeApprovalName,
  shouldSendReminder,
} from './shared/waReminderTemplates.js';
import {
  createContentTemplate,
  fetchApprovalRequests,
  fetchTwilioAccount,
  sendContentMessage,
  submitWhatsAppApproval,
  wrapWhatsAppAddress,
} from './twilioContent.js';
import { decryptSecret, encryptSecret, wrapConfigured } from './secrets.js';

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const db = () => getDatabase();

function functionsReady() {
  return wrapConfigured();
}

async function clinicIdForUid(uid) {
  const snap = await db().ref(`meta/users/${uid}`).get();
  return snap.val()?.clinicId || null;
}

async function requireClinic(request, clinicId) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'يلزم تسجيل الدخول');
  const userClinic = await clinicIdForUid(request.auth.uid);
  if (!clinicAccessAllowed(userClinic, clinicId)) {
    throw new HttpsError('permission-denied', 'لا صلاحية على هذه العيادة');
  }
  return userClinic;
}

async function loadTwilioCreds(clinicId) {
  const secretSnap = await db().ref(`clinics/${clinicId}/secrets/twilio`).get();
  const secret = secretSnap.val() || {};
  const publicSnap = await db().ref(`clinics/${clinicId}/messaging`).get();
  const messaging = publicSnap.val() || {};
  const accountSid = secret.accountSid || messaging.twilio?.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
  const from = secret.whatsappFrom || messaging.twilio?.whatsappFrom || process.env.TWILIO_WHATSAPP_FROM || '';
  let authToken = '';
  if (secret.authTokenEnc) {
    try {
      authToken = decryptSecret(secret.authTokenEnc);
    } catch {
      authToken = '';
    }
  }
  if (!authToken && process.env.TWILIO_AUTH_TOKEN && accountSid === process.env.TWILIO_ACCOUNT_SID) {
    authToken = process.env.TWILIO_AUTH_TOKEN;
  }
  return {
    accountSid,
    authToken,
    whatsappFrom: wrapWhatsAppAddress(from),
    displayNumber: messaging.displayNumber || from,
    messaging,
    usingPlatformFallback: Boolean(!secret.authTokenEnc && authToken && accountSid === process.env.TWILIO_ACCOUNT_SID),
  };
}

function publicConnection(creds) {
  return {
    connected: Boolean(creds.accountSid && creds.authToken && creds.whatsappFrom),
    accountSid: creds.accountSid ? `${creds.accountSid.slice(0, 4)}…${creds.accountSid.slice(-4)}` : '',
    sender: creds.whatsappFrom,
    displayNumber: creds.displayNumber || '',
    functionsConfigured: functionsReady(),
    usingPlatformFallback: creds.usingPlatformFallback,
  };
}

export const saveTwilioConnection = onCall(async (request) => {
  const clinicId = request.data?.clinicId;
  await requireClinic(request, clinicId);
  if (!functionsReady()) {
    return {
      ok: false,
      connected: false,
      error: 'الخادم غير مُعدّ: عيّني TWILIO_TOKEN_WRAP_KEY ثم انشري Cloud Functions.',
    };
  }
  const accountSid = String(request.data?.accountSid || '').trim();
  const authToken = String(request.data?.authToken || '').trim();
  const whatsappFrom = wrapWhatsAppAddress(request.data?.whatsappFrom || request.data?.displayNumber || '');
  const displayNumber = String(request.data?.displayNumber || request.data?.whatsappFrom || '').trim();
  if (!accountSid || !authToken || !whatsappFrom) {
    throw new HttpsError('invalid-argument', 'Account SID وAuth Token ورقم واتساب مطلوبة');
  }
  let account;
  try {
    account = await fetchTwilioAccount(accountSid, authToken);
  } catch (err) {
    return {
      ok: false,
      connected: false,
      error: err.message || 'رفض Twilio بيانات الحساب',
    };
  }
  if (account.status && String(account.status).toLowerCase() !== 'active') {
    return { ok: false, connected: false, error: `حساب Twilio بحالة ${account.status}` };
  }
  await db().ref(`clinics/${clinicId}/secrets/twilio`).set({
    accountSid,
    whatsappFrom,
    authTokenEnc: encryptSecret(authToken),
    updatedAt: Date.now(),
  });
  await db().ref(`clinics/${clinicId}/messaging`).update({
    provider: 'twilio',
    numberActive: true,
    displayNumber,
    twilio: {
      accountSid,
      whatsappFrom,
      hasAuthToken: true,
    },
    twilioVerifiedAt: Date.now(),
    updatedAt: Date.now(),
  });
  return { ok: true, connected: true, sender: whatsappFrom, displayNumber };
});

export const submitWaReminderTemplate = onCall(async (request) => {
  const clinicId = request.data?.clinicId;
  const eventId = request.data?.eventId;
  await requireClinic(request, clinicId);
  const def = WA_REMINDER_EVENTS.find((e) => e.id === eventId);
  if (!def) throw new HttpsError('invalid-argument', 'قالب غير معروف');
  if (!functionsReady()) {
    return { ok: false, status: 'unavailable', error: 'Cloud Functions غير مُعدّة' };
  }
  const creds = await loadTwilioCreds(clinicId);
  if (!creds.authToken || !creds.accountSid) {
    return { ok: false, status: 'unavailable', error: 'واتساب غير مربوط. اربطي Twilio أولاً.' };
  }
  const recSnap = await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).get();
  const rec = mergeTemplateRecord(eventId, recSnap.val());
  const body = String(request.data?.body || rec.body || def.defaultBody);
  if (!bodyHasRequiredVars(body)) {
    throw new HttpsError('invalid-argument', 'النص يجب أن يحتوي {{1}} {{2}} {{3}} {{4}}');
  }
  const friendlyName = sanitizeApprovalName(clinicId, eventId);
  let contentSid = rec.contentSid;
  try {
    if (!contentSid) {
      const created = await createContentTemplate(creds.accountSid, creds.authToken, {
        friendly_name: friendlyName,
        language: 'ar',
        variables: SAMPLE_TEMPLATE_VARS,
        types: { 'twilio/text': { body } },
      });
      contentSid = created.sid;
      if (!contentSid) {
        return { ok: false, status: 'draft', error: 'Twilio لم يُرجع ContentSid' };
      }
    }
    const approval = await submitWhatsAppApproval(creds.accountSid, creds.authToken, contentSid, {
      name: friendlyName,
      category: 'UTILITY',
    });
    const twilioStatus = approval.status || approval.whatsapp?.status || 'received';
    const approvalStatus = mapTwilioApprovalStatus(twilioStatus, {
      contentSid,
      functionsConfigured: true,
      senderReady: true,
    });
    const saved = {
      ...rec,
      enabled: rec.enabled !== false,
      body,
      language: 'ar',
      category: 'UTILITY',
      contentSid,
      approvalName: friendlyName,
      approvalStatus,
      accountSid: creds.accountSid,
      sender: creds.whatsappFrom,
      rejectionReason: approval.rejection_reason || '',
      submittedAt: Date.now(),
      lastSyncedAt: Date.now(),
    };
    await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).set(saved);
    return { ok: true, template: saved };
  } catch (err) {
    const saved = {
      ...rec,
      body,
      approvalStatus: rec.contentSid ? rec.approvalStatus : 'draft',
      lastError: err.message,
      lastSyncedAt: Date.now(),
    };
    await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).update({
      lastError: err.message,
      lastSyncedAt: Date.now(),
    });
    return { ok: false, status: saved.approvalStatus, error: err.message };
  }
});

export const syncWaReminderTemplate = onCall(async (request) => {
  const clinicId = request.data?.clinicId;
  const eventId = request.data?.eventId;
  await requireClinic(request, clinicId);
  const recSnap = await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).get();
  const rec = mergeTemplateRecord(eventId, recSnap.val());
  if (!rec.contentSid) return { ok: true, template: rec };
  const creds = await loadTwilioCreds(clinicId);
  if (!creds.authToken) return { ok: false, error: 'واتساب غير مربوط', template: rec };
  try {
    const data = await fetchApprovalRequests(creds.accountSid, creds.authToken, rec.contentSid);
    const twilioStatus = data.whatsapp?.status || data.status;
    const approvalStatus = mapTwilioApprovalStatus(twilioStatus, {
      contentSid: rec.contentSid,
      functionsConfigured: true,
      senderReady: Boolean(creds.whatsappFrom),
    });
    const next = {
      ...rec,
      approvalStatus,
      rejectionReason: data.whatsapp?.rejection_reason || data.rejection_reason || '',
      lastSyncedAt: Date.now(),
      lastError: null,
    };
    await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).update({
      approvalStatus: next.approvalStatus,
      rejectionReason: next.rejectionReason,
      lastSyncedAt: next.lastSyncedAt,
      lastError: null,
    });
    return { ok: true, template: next };
  } catch (err) {
    return { ok: false, error: err.message, template: rec };
  }
});

async function sendEventForAppointment({ clinicId, apt, eventId, clinicName, customer, hoursKey }) {
  const gate = shouldSendReminder({ apt, eventId });
  if (!gate.ok) return { ok: false, skipped: gate.reason };
  if (!patientAllowsWhatsApp(customer, apt)) {
    return { ok: false, skipped: 'opt_out' };
  }
  const creds = await loadTwilioCreds(clinicId);
  const recSnap = await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).get();
  const rec = mergeTemplateRecord(eventId, recSnap.val());
  rec.accountSid = rec.accountSid || creds.accountSid;
  rec.sender = rec.sender || creds.whatsappFrom;
  if (rec.approvalStatus === 'pending') {
    return { ok: false, skipped: 'pending_approval', status: 'pending' };
  }
  if (!canSendApprovedTemplate(rec)) {
    return { ok: false, skipped: 'template_not_approved', status: rec.approvalStatus };
  }
  if (rec.accountSid !== creds.accountSid || rec.sender !== creds.whatsappFrom) {
    return { ok: false, skipped: 'sender_mismatch' };
  }
  const sendingRef = db().ref(`clinics/${clinicId}/appointments/${apt.id}/waTemplateSent/${eventId}`);
  const existing = (await sendingRef.get()).val();
  if (existing?.providerSid || existing?.status === 'sent' || existing?.status === 'sending') {
    return { ok: false, skipped: 'duplicate' };
  }
  await sendingRef.set({ status: 'sending', at: Date.now(), hoursKey: hoursKey || null });
  const vars = fillTemplateVars({
    patientName: apt.customerName,
    clinicName,
    date: apt.date,
    time: apt.time,
  });
  try {
    const msg = await sendContentMessage(creds.accountSid, creds.authToken, {
      from: creds.whatsappFrom,
      to: wrapWhatsAppAddress(apt.phoneNumber),
      contentSid: rec.contentSid,
      contentVariables: vars,
    });
    const stamp = {
      status: 'sent',
      at: Date.now(),
      providerSid: msg.sid || '',
      providerStatus: msg.status || '',
      hoursKey: hoursKey || null,
    };
    await sendingRef.set(stamp);
    if (hoursKey != null && hoursKey !== '') {
      await db().ref(`clinics/${clinicId}/appointments/${apt.id}/remindersSent/${hoursKey}`).set(Date.now());
    }
    const logRef = db().ref(`clinics/${clinicId}/waMessageLogs`).push();
    await logRef.set({
      appointmentId: apt.id,
      eventId,
      clinicId,
      to: wrapWhatsAppAddress(apt.phoneNumber),
      contentSid: rec.contentSid,
      providerSid: msg.sid || '',
      providerStatus: msg.status || '',
      at: Date.now(),
      status: 'sent',
    });
    return { ok: true, providerSid: msg.sid, fallback: false };
  } catch (err) {
    const retryable = err.status >= 500 || err.status === 429;
    await sendingRef.set({
      status: 'failed',
      at: Date.now(),
      error: err.message,
      retryable,
      hoursKey: hoursKey || null,
    });
    await db().ref(`clinics/${clinicId}/waMessageLogs`).push({
      appointmentId: apt.id,
      eventId,
      clinicId,
      error: err.message,
      at: Date.now(),
      status: 'failed',
      retryable,
    });
    return { ok: false, error: err.message, retryable, fallback: 'wa.me' };
  }
}

export const sendClinicWaReminder = onCall(async (request) => {
  const clinicId = request.data?.clinicId;
  await requireClinic(request, clinicId);
  const appointmentId = request.data?.appointmentId;
  const hoursKey = request.data?.hoursKey;
  const eventId = request.data?.eventId || hoursKeyToEventId(hoursKey);
  if (!appointmentId || !eventId) throw new HttpsError('invalid-argument', 'موعد وقالب مطلوبان');
  const aptSnap = await db().ref(`clinics/${clinicId}/appointments/${appointmentId}`).get();
  if (!aptSnap.exists()) throw new HttpsError('not-found', 'الموعد غير موجود');
  const apt = { id: appointmentId, ...aptSnap.val() };
  const info = (await db().ref(`clinics/${clinicId}/info`).get()).val() || {};
  let customer = {};
  if (apt.customerId) {
    customer = (await db().ref(`clinics/${clinicId}/customers/${apt.customerId}`).get()).val() || {};
  }
  const result = await sendEventForAppointment({
    clinicId,
    apt,
    eventId,
    clinicName: info.name,
    customer,
    hoursKey,
  });
  return result;
});

export const dispatchWaReminders = onSchedule('every 15 minutes', async () => {
  if (!functionsReady()) return;
  const clinicsSnap = await db().ref('meta/clinics').get();
  const clinics = clinicsSnap.val() || {};
  const now = new Date();
  await Promise.all(Object.keys(clinics).map(async (clinicId) => {
    const messaging = (await db().ref(`clinics/${clinicId}/messaging`).get()).val();
    if (!messaging?.twilio?.hasAuthToken && !messaging?.numberActive) return;
    const settings = (await db().ref(`clinics/${clinicId}/appointmentSettings`).get()).val() || {};
    const info = (await db().ref(`clinics/${clinicId}/info`).get()).val() || {};
    const apts = (await db().ref(`clinics/${clinicId}/appointments`).get()).val() || {};
    const customers = (await db().ref(`clinics/${clinicId}/customers`).get()).val() || {};
    for (const [id, apt] of Object.entries(apts)) {
      const due = dueScheduledEvents({ id, ...apt }, settings, now);
      for (const eventId of due) {
        await sendEventForAppointment({
          clinicId,
          apt: { id, ...apt },
          eventId,
          clinicName: info.name,
          customer: customers[apt.customerId] || {},
        });
      }
    }
  }));
});
