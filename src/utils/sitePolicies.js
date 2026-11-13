export const SITE_POLICIES = [
  { id: 'privacy', key: 'privacyPolicy', label: 'الخصوصية', placeholder: 'كيف تُستخدم بيانات العميلة ورقمها.' },
  { id: 'refund', key: 'refundPolicy', label: 'الاسترجاع', placeholder: 'متى يُسترجع المبلغ أو الجلسة، ومتى لا.' },
  { id: 'booking', key: 'bookingPolicy', label: 'الحجوزات', placeholder: 'تأكيد الموعد، الإلغاء، والتأخير.' },
  { id: 'deposit', key: 'depositPolicy', label: 'العربون', placeholder: 'قيمة العربون ومتى يُحسب أو يُرد.' },
];

export function policyText(clinic, settings, item) {
  const own = String(clinic?.[item.key] || '').trim();
  if (own) return own;
  if (item.id === 'booking') return String(settings?.cancellationPolicy || '').trim();
  if (item.id === 'deposit' && settings?.depositPolicyEnabled) return String(settings?.depositNote || '').trim();
  return '';
}

export function publicPolicyList(clinic, settings) {
  return SITE_POLICIES
    .map((item) => ({ ...item, text: policyText(clinic, settings, item) }))
    .filter((item) => item.text);
}

export function withPublicPolicies(clinic, settings) {
  const next = { ...(clinic || {}) };
  SITE_POLICIES.forEach((item) => {
    next[item.key] = policyText(clinic, settings, item);
  });
  return next;
}
