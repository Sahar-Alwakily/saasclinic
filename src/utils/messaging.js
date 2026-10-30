export const DEFAULT_MESSAGING = {
  provider: 'meta',
  numberActive: false,
  displayNumber: '',
  twilio: { accountSid: '', authToken: '', whatsappFrom: '', hasAuthToken: false },
  meta: {
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    appSecret: '',
    verifyToken: '',
    graphVersion: 'v21.0',
  },
  autoReply: {
    enabled: false,
    greeting: '',
    fallback: 'للحجز راجعي الرابط أو انتظري رد العيادة خلال ساعات العمل.',
    quietStart: 21,
    quietEnd: 9,
  },
  updatedAt: null,
};

export function mergeMessaging(raw) {
  return {
    ...DEFAULT_MESSAGING,
    ...(raw || {}),
    twilio: { ...DEFAULT_MESSAGING.twilio, ...(raw?.twilio || {}) },
    meta: { ...DEFAULT_MESSAGING.meta, ...(raw?.meta || {}) },
    autoReply: { ...DEFAULT_MESSAGING.autoReply, ...(raw?.autoReply || {}) },
  };
}

export function providerReady(cfg) {
  if (!cfg) return false;
  if (cfg.provider === 'twilio') {
    return !!(cfg.twilio?.accountSid && cfg.twilio?.whatsappFrom && (cfg.twilio?.hasAuthToken || cfg.twilio?.authToken));
  }
  return !!(cfg.meta?.phoneNumberId && cfg.meta?.wabaId && cfg.meta?.accessToken);
}

export function makeVerifyToken(clinicId) {
  const tail = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `nura-${String(clinicId || 'clinic').slice(0, 8)}-${tail}`;
}
