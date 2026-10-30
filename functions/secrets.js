import crypto from 'node:crypto';

function keyBuf() {
  const raw = process.env.TWILIO_TOKEN_WRAP_KEY || '';
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest();
}

export function wrapConfigured() {
  return Boolean(keyBuf());
}

export function encryptSecret(plain) {
  const key = keyBuf();
  if (!key) throw new Error('TWILIO_TOKEN_WRAP_KEY is not set');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(packed) {
  const key = keyBuf();
  if (!key) throw new Error('TWILIO_TOKEN_WRAP_KEY is not set');
  const [ivB64, tagB64, dataB64] = String(packed || '').split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('invalid secret payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
