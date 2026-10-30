export function extractOtp(body) {
  const match = String(body || '').match(/\b(\d{4,8})\b/);
  return match ? match[1] : '';
}

export function toE164(input) {
  const raw = String(input || '').trim().replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(raw)) return '';
  return raw;
}
