import crypto from 'node:crypto';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { decryptSecret, encryptSecret, wrapConfigured } from './secrets.js';
import {
  attachChannelSender,
  configureIncomingSmsWebhook,
  createMessagingService,
  createSubaccount,
  createWhatsAppSender,
  deleteWhatsAppSender,
  fetchWhatsAppSender,
  sendContentMessage,
  whatsAppSenderPayload,
  wrapWhatsAppAddress,
} from './twilioContent.js';
import { validTwilioSignature } from './twilioSignature.js';
import { extractOtp, toE164 } from './waPhone.js';
import { consumeWalletIfEnabled, gateOutbound, recordWaUsage } from './waUsage.js';
import { WA_REMINDER_EVENTS, canSendApprovedTemplate, mergeTemplateRecord } from './shared/waReminderTemplates.js';

const db = () => getDatabase();
const STATE_MS = 20 * 60 * 1000;

function parentCreds() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
  };
}

function metaPublicConfig() {
  return {
    appId: process.env.META_APP_ID || '',
    configId: process.env.META_CONFIG_ID || '',
    solutionId: process.env.META_SOLUTION_ID || '',
    graphVersion: process.env.META_GRAPH_VERSION || 'v21.0',
  };
}

function missingPlatformConfig() {
  const missing = [];
  if (!wrapConfigured()) missing.push('TWILIO_TOKEN_WRAP_KEY');
  if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!process.env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
  if (!process.env.META_APP_ID) missing.push('META_APP_ID');
  if (!process.env.META_CONFIG_ID) missing.push('META_CONFIG_ID');
  if (!process.env.META_SOLUTION_ID) missing.push('META_SOLUTION_ID');
  if (!process.env.WHATSAPP_WEBHOOK_URL) missing.push('WHATSAPP_WEBHOOK_URL');
  return missing;
}

function webhookFor(clinicId) {
  const base = process.env.WHATSAPP_WEBHOOK_URL || '';
  if (!base) return '';
  const url = new URL(base);
  url.searchParams.set('clinicId', clinicId);
  return url.toString();
}

function otpWebhookUrl() {
  return process.env.WHATSAPP_OTP_WEBHOOK_URL || '';
}

function logStep(clinicId, subaccountSid, step, extra = {}) {
  const row = { clinicId, subaccountSid: subaccountSid || '', step, at: new Date().toISOString(), ...extra };
  console.info(JSON.stringify(row));
  return row;
}

async function rememberRoute(accountSid, clinicId) {
  if (!accountSid || !clinicId) return;
  await db().ref(`platform/twilioRoutes/${accountSid}`).set({ clinicId, updatedAt: Date.now() });
}

async function clinicForAccount(accountSid) {
  if (!accountSid) return '';
  const snap = await db().ref(`platform/twilioRoutes/${accountSid}`).get();
  return snap.val()?.clinicId || '';
}

async function clinicIdForUid(uid) {
  if (!uid) return null;
  const snap = await db().ref(`meta/users/${uid}`).get();
  return snap.val()?.clinicId || null;
}

async function requireClinicAdmin(request, clinicId) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'يلزم تسجيل الدخول');
  const snap = await db().ref(`meta/users/${request.auth.uid}`).get();
  const meta = snap.val() || {};
  if (!meta.clinicId || meta.clinicId !== clinicId) {
    throw new HttpsError('permission-denied', 'لا صلاحية على هذه العيادة');
  }
  if (meta.role !== 'admin' && meta.role !== 'support') {
    throw new HttpsError('permission-denied', 'ربط واتساب لصاحب العيادة فقط');
  }
  return meta;
}

async function requireSuperAdmin(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'يلزم تسجيل الدخول');
  const snap = await db().ref(`meta/superAdmins/${request.auth.uid}`).get();
  if (!snap.exists()) throw new HttpsError('permission-denied', 'هذه العملية للسوبر أدمن');
  return request.auth.uid;
}

async function loadSecret(clinicId) {
  const snap = await db().ref(`clinics/${clinicId}/secrets/twilio`).get();
  return snap.val() || {};
}

async function clinicName(clinicId) {
  const info = (await db().ref(`clinics/${clinicId}/info`).get()).val() || {};
  return info.name || clinicId;
}

function senderIsOnline(status) {
  return String(status || '').toUpperCase() === 'ONLINE';
}

async function writePublicConnection(clinicId, patch) {
  const name = await clinicName(clinicId);
  const current = (await db().ref(`clinics/${clinicId}/messaging`).get()).val() || {};
  const onboarding = { ...(current.onboarding || {}), ...patch, updatedAt: Date.now() };
  const online = senderIsOnline(onboarding.senderStatus) && onboarding.status !== 'suspended' && onboarding.status !== 'disconnected';
  await db().ref(`clinics/${clinicId}/messaging`).update({
    provider: 'twilio',
    numberActive: online,
    displayNumber: onboarding.displayNumber || current.displayNumber || '',
    twilio: {
      ...(current.twilio || {}),
      accountSid: onboarding.subaccountSid || current.twilio?.accountSid || '',
      whatsappFrom: online ? (onboarding.senderId || '') : '',
      hasAuthToken: Boolean(onboarding.subaccountSid),
    },
    onboarding,
    suspended: onboarding.status === 'suspended',
    updatedAt: Date.now(),
  });
  const usage = (await db().ref(`platform/whatsappIndex/${clinicId}`).get()).val() || {};
  await db().ref(`clinics/${clinicId}/secrets/twilio`).update({
    clinicId,
    ...(onboarding.subaccountSid ? { subaccountSid: onboarding.subaccountSid, accountSid: onboarding.subaccountSid } : {}),
    senderStatus: onboarding.senderStatus || '',
    senderOnline: online,
    suspended: onboarding.status === 'suspended',
    updatedAt: Date.now(),
  });
  await db().ref(`platform/whatsappIndex/${clinicId}`).update({
    clinicId,
    clinicName: name,
    phone: onboarding.displayNumber || '',
    businessName: onboarding.businessName || '',
    subaccountSid: onboarding.subaccountSid || '',
    wabaId: onboarding.wabaId || '',
    phoneNumberId: onboarding.phoneNumberId || '',
    senderSid: onboarding.senderSid || '',
    senderStatus: onboarding.senderStatus || '',
    status: onboarding.status || 'disconnected',
    connectedAt: onboarding.connectedAt || null,
    messagingServiceSid: onboarding.messagingServiceSid || '',
    messagingServiceError: onboarding.messagingServiceError || '',
    lastError: onboarding.lastError || '',
    sentCount: usage.sentCount || 0,
    failedCount: usage.failedCount || 0,
    webhookErrors: usage.webhookErrors || 0,
    updatedAt: Date.now(),
  });
  return onboarding;
}

async function audit(clinicId, entry) {
  const row = { ...entry, clinicId, at: Date.now() };
  await db().ref('platform/auditLog').push(row);
  await db().ref(`clinics/${clinicId}/adminAudit`).push(row);
}

export const prepareWhatsAppConnect = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  await requireClinicAdmin(request, clinicId);
  const missing = missingPlatformConfig();
  if (missing.length) {
    return {
      ok: false,
      connected: false,
      error: `إعداد المنصة ناقص قبل الربط: ${missing.join(', ')}. لا يُنشأ اتصال وهمي.`,
      missing,
    };
  }
  const phoneE164 = toE164(request.data?.phoneE164);
  if (!phoneE164) {
    throw new HttpsError('invalid-argument', 'أدخل رقم واتساب بصيغة دولية مثل +9725… قبل بدء التسجيل');
  }
  const numberSource = request.data?.numberSource === 'twilio' ? 'twilio' : 'clinic';
  const twilioPhoneSid = String(request.data?.twilioPhoneSid || '').trim();
  if (numberSource === 'twilio' && (!twilioPhoneSid || !otpWebhookUrl())) {
    return {
      ok: false,
      connected: false,
      error: 'رقم Twilio يحتاج Phone SID وWHATSAPP_OTP_WEBHOOK_URL قبل تسجيل المرسل.',
    };
  }
  const secret = await loadSecret(clinicId);
  if (secret.accountSid && !secret.managedSubaccount) {
    return {
      ok: false,
      connected: false,
      error: 'هذه العيادة مربوطة بحساب Twilio يدوي. افصل ذلك الربط قبل الربط المُدار من المنصة.',
    };
  }
  const parent = parentCreds();
  let accountSid = secret.managedSubaccount ? secret.accountSid : '';
  if (!accountSid) {
    const created = await createSubaccount(parent.accountSid, parent.authToken, await clinicName(clinicId));
    accountSid = created.sid;
    const authToken = created.auth_token;
    if (!accountSid || !authToken) {
      return { ok: false, connected: false, error: 'Twilio لم يُرجع بيانات الحساب الفرعي' };
    }
    await db().ref(`clinics/${clinicId}/secrets/twilio`).update({
      clinicId,
      accountSid,
      subaccountSid: accountSid,
      authTokenEnc: encryptSecret(authToken),
      managedSubaccount: true,
      parentAccountSid: parent.accountSid,
      numberSource,
      twilioPhoneSid: numberSource === 'twilio' ? twilioPhoneSid : '',
      senderStatus: '',
      senderOnline: false,
      updatedAt: Date.now(),
    });
    logStep(clinicId, accountSid, 'subaccount_created');
  }
  await rememberRoute(accountSid, clinicId);
  if (numberSource === 'twilio') {
    const token = decryptSecret((await loadSecret(clinicId)).authTokenEnc);
    await configureIncomingSmsWebhook(accountSid, token, twilioPhoneSid, otpWebhookUrl());
    logStep(clinicId, accountSid, 'otp_webhook_configured', { phoneSid: twilioPhoneSid });
  }
  const wallet = await db().ref(`clinics/${clinicId}/messagingWallet`).get();
  if (!wallet.exists()) {
    await db().ref(`clinics/${clinicId}/messagingWallet`).set({
      enabled: false,
      charging: false,
      currency: 'USD',
      balanceUnits: 0,
      pricePerMessage: null,
      updatedAt: Date.now(),
    });
  }
  const nonce = crypto.randomBytes(24).toString('hex');
  await db().ref(`clinics/${clinicId}/secrets/twilio/onboardingState`).set({
    nonce,
    phoneE164,
    uid: request.auth.uid,
    numberSource,
    expiresAt: Date.now() + STATE_MS,
  });
  await writePublicConnection(clinicId, {
    status: 'pending_signup',
    subaccountSid: accountSid,
    displayNumber: phoneE164,
    lastError: '',
  });
  await audit(clinicId, { action: 'whatsapp_prepare', title: 'بدء ربط واتساب', by: request.auth.token?.email || request.auth.uid, subaccountSid: accountSid });
  return {
    ok: true,
    connected: false,
    state: nonce,
    phoneE164,
    embedded: metaPublicConfig(),
  };
});

export const completeWhatsAppOnboarding = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  await requireClinicAdmin(request, clinicId);
  const missing = missingPlatformConfig();
  if (missing.length) {
    return { ok: false, connected: false, error: `إعداد المنصة ناقص: ${missing.join(', ')}`, missing };
  }
  const secret = await loadSecret(clinicId);
  const state = secret.onboardingState || {};
  const nonce = String(request.data?.state || '');
  if (!state.nonce || state.nonce !== nonce || state.uid !== request.auth.uid || Number(state.expiresAt) < Date.now()) {
    throw new HttpsError('permission-denied', 'انتهت جلسة الربط. ابدأ من زر الربط مرة أخرى');
  }
  const phoneE164 = toE164(request.data?.phoneE164);
  if (!phoneE164 || phoneE164 !== state.phoneE164) {
    throw new HttpsError('invalid-argument', 'رقم الواتساب لا يطابق الرقم الذي بدأ به الربط');
  }
  const wabaId = String(request.data?.wabaId || '').trim();
  const phoneNumberId = String(request.data?.phoneNumberId || '').trim();
  if (!wabaId || (state.numberSource !== 'twilio' && !phoneNumberId)) {
    throw new HttpsError('invalid-argument', 'ميتا لم تُرجع حساب واتساب الأعمال أو معرّف الرقم بعد التحقق');
  }
  if (!secret.managedSubaccount || !secret.authTokenEnc) {
    return { ok: false, connected: false, error: 'الحساب الفرعي غير جاهز. ابدأ الربط من جديد' };
  }
  let verificationCode = '';
  if (state.numberSource === 'twilio') {
    const otp = secret.otp || {};
    const fresh = otp.codeEnc && Number(otp.expiresAt || 0) > Date.now();
    if (!fresh) {
      logStep(clinicId, secret.accountSid, 'sender_blocked_otp');
      return {
        ok: false,
        connected: false,
        senderStatus: 'OTP_REQUIRED',
        error: 'رمز التحقق لم يصل بعد إلى رقم Twilio، أو انتهت صلاحيته. لا يُستدعى تسجيل المرسل قبل اكتمال الملكية.',
      };
    }
    verificationCode = decryptSecret(otp.codeEnc);
  }
  await db().ref(`clinics/${clinicId}/secrets/twilio/onboardingState`).remove();
  const authToken = decryptSecret(secret.authTokenEnc);
  const callback = webhookFor(clinicId);
  let sender;
  try {
    logStep(clinicId, secret.accountSid, 'sender_register_start', { phoneNumberId, numberSource: state.numberSource || 'clinic' });
    const payload = whatsAppSenderPayload({
      phoneE164,
      wabaId,
      phoneNumberId,
      callbackUrl: callback,
      verificationCode,
    });
    try {
      sender = await createWhatsAppSender(secret.accountSid, authToken, payload);
    } catch (err) {
      const unknownField = err.status === 400 && /phone_number_id/i.test(String(err.message || ''));
      if (!unknownField) throw err;
      const { phone_number_id: _ignored, ...configuration } = payload.configuration;
      logStep(clinicId, secret.accountSid, 'sender_register_retry_without_phone_number_id');
      sender = await createWhatsAppSender(secret.accountSid, authToken, { ...payload, configuration });
    }
  } catch (err) {
    await writePublicConnection(clinicId, {
      status: 'error',
      subaccountSid: secret.accountSid,
      wabaId,
      phoneNumberId,
      displayNumber: phoneE164,
      lastError: err.message,
    });
    return { ok: false, connected: false, error: err.message, senderStatus: '' };
  }
  const senderStatus = String(sender.status || '');
  const senderSid = sender.sid || '';
  const businessName = sender.profile?.name || '';
  let messagingServiceSid = secret.messagingServiceSid || '';
  let messagingServiceError = '';
  if (!messagingServiceSid && senderSid) {
    try {
      const service = await createMessagingService(secret.accountSid, authToken, {
        friendlyName: await clinicName(clinicId),
        inboundUrl: callback,
        statusCallbackUrl: callback,
      });
      messagingServiceSid = service.sid || '';
      if (messagingServiceSid) {
        try {
          await attachChannelSender(secret.accountSid, authToken, messagingServiceSid, senderSid);
        } catch (err) {
          messagingServiceError = err.message;
        }
      }
    } catch (err) {
      messagingServiceError = err.message;
    }
  }
  const online = senderIsOnline(senderStatus);
  logStep(clinicId, secret.accountSid, online ? 'sender_online' : 'messaging_blocked', { senderStatus, senderSid });
  await db().ref(`clinics/${clinicId}/secrets/twilio`).update({
    clinicId,
    subaccountSid: secret.accountSid,
    whatsappFrom: `whatsapp:${phoneE164}`,
    wabaId,
    phoneNumberId,
    senderSid,
    senderStatus,
    messagingServiceSid,
    updatedAt: Date.now(),
  });
  await writePublicConnection(clinicId, {
    status: online ? 'online' : 'registering',
    senderStatus,
    senderSid,
    senderId: sender.sender_id || `whatsapp:${phoneE164}`,
    subaccountSid: secret.accountSid,
    wabaId,
    phoneNumberId,
    businessName,
    displayNumber: phoneE164,
    messagingServiceSid,
    messagingServiceError,
    webhookUrl: callback,
    connectedAt: online ? Date.now() : null,
    lastError: messagingServiceError,
  });
  await audit(clinicId, {
    action: 'whatsapp_sender',
    title: `تسجيل مرسل واتساب: ${senderStatus || 'بلا حالة'}`,
    by: request.auth.token?.email || request.auth.uid,
  });
  return {
    ok: Boolean(senderSid),
    connected: online,
    senderStatus,
    businessName,
    displayNumber: phoneE164,
    messagingServiceSid,
    messagingServiceError,
  };
});

async function refreshSender(clinicId) {
  const secret = await loadSecret(clinicId);
  if (!secret.senderSid || !secret.authTokenEnc) {
    return { ok: false, connected: false, error: 'لا يوجد مرسل مسجّل لدى Twilio' };
  }
  const sender = await fetchWhatsAppSender(secret.accountSid, decryptSecret(secret.authTokenEnc), secret.senderSid);
  const senderStatus = String(sender.status || '');
  const online = senderIsOnline(senderStatus);
  const current = (await db().ref(`clinics/${clinicId}/messaging/onboarding`).get()).val() || {};
  const suspended = current.status === 'suspended';
  await writePublicConnection(clinicId, {
    status: suspended ? 'suspended' : (online ? 'online' : 'registering'),
    senderStatus,
    businessName: sender.profile?.name || current.businessName || '',
    senderId: sender.sender_id || current.senderId || '',
    displayNumber: String(sender.sender_id || '').replace(/^whatsapp:/, '') || current.displayNumber || '',
    connectedAt: online ? (current.connectedAt || Date.now()) : (current.connectedAt || null),
    lastError: '',
  });
  return { ok: true, connected: online && !suspended, senderStatus, businessName: sender.profile?.name || '' };
}

export const syncWhatsAppSender = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  await requireClinicAdmin(request, clinicId);
  try {
    return await refreshSender(clinicId);
  } catch (err) {
    return { ok: false, connected: false, error: err.message };
  }
});

export const disconnectWhatsApp = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  await requireClinicAdmin(request, clinicId);
  const secret = await loadSecret(clinicId);
  let deleteError = '';
  if (secret.managedSubaccount && secret.senderSid && secret.authTokenEnc) {
    try {
      await deleteWhatsAppSender(secret.accountSid, decryptSecret(secret.authTokenEnc), secret.senderSid);
    } catch (err) {
      deleteError = err.message;
    }
  }
  if (!secret.managedSubaccount && secret.accountSid) {
    await db().ref(`clinics/${clinicId}/secrets/twilio`).remove();
  } else if (secret.managedSubaccount) {
    await db().ref(`clinics/${clinicId}/secrets/twilio`).update({
      senderSid: null,
      whatsappFrom: '',
      phoneNumberId: '',
      updatedAt: Date.now(),
    });
  }
  await writePublicConnection(clinicId, {
    status: 'disconnected',
    senderStatus: '',
    senderSid: '',
    senderId: '',
    phoneNumberId: '',
    connectedAt: null,
    lastError: deleteError,
  });
  await audit(clinicId, { action: 'whatsapp_disconnect', title: 'فصل واتساب', by: request.auth.token?.email || request.auth.uid });
  return { ok: !deleteError, disconnected: true, error: deleteError };
});

export const adminManageWhatsApp = onCall(async (request) => {
  const uid = await requireSuperAdmin(request);
  const clinicId = String(request.data?.clinicId || '');
  const action = String(request.data?.action || '');
  if (!clinicId) throw new HttpsError('invalid-argument', 'العيادة مطلوبة');
  if (action === 'refresh') {
    try {
      const result = await refreshSender(clinicId);
      await audit(clinicId, { action: 'whatsapp_admin_refresh', title: 'تحديث حالة واتساب', by: uid });
      return result;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  if (action === 'suspend' || action === 'resume') {
    const current = (await db().ref(`clinics/${clinicId}/messaging/onboarding`).get()).val() || {};
    const status = action === 'suspend'
      ? 'suspended'
      : (senderIsOnline(current.senderStatus) ? 'online' : (current.senderSid ? 'registering' : 'disconnected'));
    await writePublicConnection(clinicId, { status });
    await audit(clinicId, {
      action: `whatsapp_${action}`,
      title: action === 'suspend' ? 'إيقاف واتساب' : 'استئناف واتساب',
      by: uid,
    });
    return { ok: true, status };
  }
  throw new HttpsError('invalid-argument', 'إجراء غير معروف');
});

export const sendClinicUtilityNotice = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  const userClinic = await clinicIdForUid(request.auth?.uid);
  if (!request.auth?.uid || userClinic !== clinicId) {
    throw new HttpsError('permission-denied', 'لا صلاحية على هذه العيادة');
  }
  const eventId = String(request.data?.eventId || '');
  const def = WA_REMINDER_EVENTS.find((e) => e.id === eventId);
  if (!def || !['waitlist', 'followup'].includes(eventId)) {
    throw new HttpsError('invalid-argument', 'قالب الإشعار غير معروف');
  }
  const to = wrapWhatsAppAddress(toE164(request.data?.toPhone));
  if (!to) throw new HttpsError('invalid-argument', 'رقم المستلم يجب أن يكون بصيغة دولية');
  const idempotencyKey = String(request.data?.idempotencyKey || '').replace(/[.#$/[\]]/g, '').slice(0, 80);
  if (!idempotencyKey) throw new HttpsError('invalid-argument', 'مفتاح منع التكرار مطلوب');
  const gate = await gateOutbound(clinicId);
  if (!gate.ok) return gate;
  const seenRef = db().ref(`clinics/${clinicId}/waNoticeSent/${idempotencyKey}`);
  const seen = (await seenRef.get()).val();
  if (seen?.providerSid || seen?.status === 'sent' || seen?.status === 'sending') {
    return { ok: false, skipped: 'duplicate' };
  }
  const credsSecret = await loadSecret(clinicId);
  if (credsSecret.suspended) return { ok: false, skipped: 'suspended' };
  if (!credsSecret.senderOnline) {
    return { ok: false, skipped: 'sender_not_online', status: credsSecret.senderStatus || 'unavailable' };
  }
  let authToken = '';
  if (credsSecret.authTokenEnc) authToken = decryptSecret(credsSecret.authTokenEnc);
  const messaging = gate.messaging || {};
  const from = wrapWhatsAppAddress(credsSecret.whatsappFrom || messaging.onboarding?.senderId || '');
  const rec = mergeTemplateRecord(eventId, (await db().ref(`clinics/${clinicId}/waReminderTemplates/${eventId}`).get()).val());
  rec.accountSid = rec.accountSid || credsSecret.accountSid;
  rec.sender = rec.sender || from;
  if (!canSendApprovedTemplate(rec) || rec.accountSid !== credsSecret.accountSid || rec.sender !== from) {
    return { ok: false, skipped: 'template_not_approved', status: rec.approvalStatus || 'unavailable' };
  }
  const varsIn = request.data?.vars || {};
  const vars = {
    1: String(varsIn[1] ?? varsIn['1'] ?? '').slice(0, 120) || 'عميلتنا',
    2: String(varsIn[2] ?? varsIn['2'] ?? '').slice(0, 120) || 'العيادة',
    3: String(varsIn[3] ?? varsIn['3'] ?? '').slice(0, 180) || '—',
    4: String(varsIn[4] ?? varsIn['4'] ?? '').slice(0, 300) || '—',
  };
  await seenRef.set({ status: 'sending', at: Date.now() });
  try {
    const msg = await sendContentMessage(credsSecret.accountSid, authToken, {
      from,
      to,
      contentSid: rec.contentSid,
      contentVariables: vars,
      statusCallback: messaging.onboarding?.webhookUrl || '',
    });
    await seenRef.set({ status: 'sent', at: Date.now(), providerSid: msg.sid || '' });
    if (msg.sid) {
      await db().ref(`clinics/${clinicId}/waDelivery/${msg.sid}`).set({
        eventId, to, status: msg.status || 'accepted', at: Date.now(),
      });
    }
    await recordWaUsage(clinicId, 'sent');
    await consumeWalletIfEnabled(clinicId, gate.wallet);
    return { ok: true, providerSid: msg.sid, fallback: false };
  } catch (err) {
    await seenRef.set({ status: 'failed', at: Date.now(), error: err.message, retryable: err.status >= 500 || err.status === 429 });
    await recordWaUsage(clinicId, 'failed');
    return { ok: false, error: err.message, fallback: 'wa.me' };
  }
});

function formParams(body) {
  if (!body) return {};
  if (typeof body === 'string') return Object.fromEntries(new URLSearchParams(body));
  return { ...body };
}

function addressesSender(value, registered) {
  const registeredAddress = wrapWhatsAppAddress(registered);
  if (!registeredAddress) return false;
  return wrapWhatsAppAddress(value) === registeredAddress;
}

async function claimWebhookOnce(clinicId, messageSid, messageStatus) {
  if (!messageSid) return true;
  const key = `${messageSid}:${messageStatus || 'inbound'}`.replace(/[.#$/[\]]/g, '_');
  const seenRef = db().ref(`clinics/${clinicId}/waWebhookSeen/${key}`);
  const result = await seenRef.transaction((current) => {
    if (current) return;
    return { at: Date.now(), messageSid, messageStatus: messageStatus || 'inbound' };
  });
  return result.committed === true;
}

async function subaccountToken(secret) {
  if (!secret?.authTokenEnc) return '';
  try {
    return decryptSecret(secret.authTokenEnc);
  } catch {
    return '';
  }
}

export const twilioWhatsAppWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }
  const params = formParams(req.body);
  const accountSid = String(params.AccountSid || '');
  const routedClinic = await clinicForAccount(accountSid);
  const queryClinic = String(req.query.clinicId || '').replace(/[.#$/[\]]/g, '');
  if (!routedClinic || (queryClinic && queryClinic !== routedClinic)) {
    logStep(queryClinic || routedClinic, accountSid, 'webhook_route_rejected');
    res.status(404).send('route');
    return;
  }
  const clinicId = routedClinic;
  const secret = await loadSecret(clinicId);
  const authToken = await subaccountToken(secret);
  const storedUrl = (await db().ref(`clinics/${clinicId}/messaging/onboarding/webhookUrl`).get()).val() || webhookFor(clinicId);
  const signature = req.get('x-twilio-signature') || '';
  if (!validTwilioSignature(authToken, signature, storedUrl, params)) {
    await db().ref(`clinics/${clinicId}/waWebhookErrors`).push({ at: Date.now(), code: 'bad_signature', subaccountSid: accountSid });
    await db().ref(`platform/whatsappIndex/${clinicId}/webhookErrors`).transaction((n) => (Number(n) || 0) + 1);
    logStep(clinicId, accountSid, 'webhook_bad_signature');
    res.status(403).send('signature');
    return;
  }
  const registered = secret.whatsappFrom || '';
  const fromClinic = addressesSender(params.From, registered);
  const toClinic = addressesSender(params.To, registered);
  if (registered && !fromClinic && !toClinic) {
    logStep(clinicId, accountSid, 'webhook_sender_mismatch', { from: params.From || '', to: params.To || '' });
    res.status(404).send('sender');
    return;
  }
  const messageSid = String(params.MessageSid || params.SmsSid || '');
  const messageStatus = String(params.MessageStatus || params.SmsStatus || '');
  if (!(await claimWebhookOnce(clinicId, messageSid, messageStatus))) {
    logStep(clinicId, accountSid, 'webhook_duplicate', { messageSid, messageStatus });
    res.status(200).send('');
    return;
  }
  if (messageSid && messageStatus) {
    await db().ref(`clinics/${clinicId}/waDelivery/${messageSid}`).update({
      status: messageStatus,
      errorCode: params.ErrorCode || '',
      subaccountSid: accountSid,
      updatedAt: Date.now(),
    });
    logStep(clinicId, accountSid, 'webhook_status', { messageSid, messageStatus });
  } else if (messageSid) {
    await db().ref(`clinics/${clinicId}/waInbound/${messageSid}`).set({
      from: params.From || '',
      to: params.To || '',
      at: Date.now(),
      numMedia: Number(params.NumMedia || 0),
      subaccountSid: accountSid,
    });
    logStep(clinicId, accountSid, 'webhook_inbound', { messageSid });
  }
  res.status(200).send('');
});

export const twilioSmsOtpWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }
  const params = formParams(req.body);
  const accountSid = String(params.AccountSid || '');
  const clinicId = await clinicForAccount(accountSid);
  if (!clinicId) {
    res.status(404).send('route');
    return;
  }
  const secret = await loadSecret(clinicId);
  const authToken = await subaccountToken(secret);
  const signature = req.get('x-twilio-signature') || '';
  if (!validTwilioSignature(authToken, signature, otpWebhookUrl(), params)) {
    logStep(clinicId, accountSid, 'otp_bad_signature');
    res.status(403).send('signature');
    return;
  }
  const messageSid = String(params.MessageSid || params.SmsSid || '');
  if (!(await claimWebhookOnce(clinicId, messageSid, 'otp'))) {
    logStep(clinicId, accountSid, 'otp_duplicate', { messageSid });
    res.type('text/xml').send('<Response></Response>');
    return;
  }
  const code = extractOtp(params.Body);
  if (!code) {
    logStep(clinicId, accountSid, 'otp_missing');
    res.type('text/xml').send('<Response></Response>');
    return;
  }
  const capturedAt = Date.now();
  await db().ref(`clinics/${clinicId}/secrets/twilio/otp`).set({
    codeEnc: encryptSecret(code),
    to: String(params.To || ''),
    messageSid,
    capturedAt,
    expiresAt: capturedAt + 10 * 60 * 1000,
  });
  logStep(clinicId, accountSid, 'otp_captured', { to: params.To || '' });
  res.type('text/xml').send('<Response></Response>');
});

export const readWhatsAppOtp = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  await requireClinicAdmin(request, clinicId);
  const secret = await loadSecret(clinicId);
  const state = secret.onboardingState || {};
  if (!state.nonce || state.uid !== request.auth.uid || Number(state.expiresAt) < Date.now()) {
    throw new HttpsError('permission-denied', 'لا توجد جلسة ربط مفتوحة');
  }
  if (state.numberSource !== 'twilio' || !secret.otp?.codeEnc) {
    return { ok: true, received: false, code: '' };
  }
  return { ok: true, received: true, code: decryptSecret(secret.otp.codeEnc) };
});

export const submitWhatsAppOtp = onCall(async (request) => {
  const clinicId = String(request.data?.clinicId || '');
  await requireClinicAdmin(request, clinicId);
  const code = String(request.data?.code || '').replace(/\D/g, '');
  if (!/^\d{4,8}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Enter the 4 to 8 digit code from the SMS.');
  }
  const secret = await loadSecret(clinicId);
  const state = secret.onboardingState || {};
  if (!state.nonce || state.uid !== request.auth.uid || Number(state.expiresAt) < Date.now()) {
    throw new HttpsError('permission-denied', 'No open WhatsApp signup session.');
  }
  if (state.numberSource !== 'twilio') {
    return { ok: false, error: 'This code is only for a Twilio SMS number. A clinic-owned number is verified inside Meta.' };
  }
  const capturedAt = Date.now();
  await db().ref(`clinics/${clinicId}/secrets/twilio/otp`).set({
    codeEnc: encryptSecret(code),
    to: state.phoneE164 || '',
    messageSid: 'clinic-entered',
    capturedAt,
    expiresAt: capturedAt + 10 * 60 * 1000,
  });
  logStep(clinicId, secret.subaccountSid || secret.accountSid, 'otp_submitted');
  return { ok: true, received: true };
});
