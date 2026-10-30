import crypto from 'node:crypto';

/** Twilio request signature: Base64(HMAC-SHA1(token, url + sorted key/value pairs)). */
export function twilioRequestSignature(authToken, url, params = {}) {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + String(params[key] ?? ''), url);
  return crypto.createHmac('sha1', authToken).update(payload, 'utf8').digest('base64');
}

export function validTwilioSignature(authToken, signature, url, params = {}) {
  if (!authToken || !signature || !url) return false;
  const expected = twilioRequestSignature(authToken, url, params);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
