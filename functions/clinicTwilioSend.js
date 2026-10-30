import { getDatabase } from 'firebase-admin/database';
import { decryptSecret } from './secrets.js';
import { sendContentMessage, wrapWhatsAppAddress } from './twilioContent.js';

const db = () => getDatabase();

/**
 * Resolves the clinic subaccount and sends one approved template.
 * Managed clinics never fall back to the parent Twilio account.
 */
export async function sendClinicWhatsAppTemplate({
  clinicId,
  to,
  contentSid,
  contentVariables,
  statusCallback,
}) {
  const secret = (await db().ref(`clinics/${clinicId}/secrets/twilio`).get()).val() || {};
  const subaccountSid = secret.subaccountSid || secret.accountSid || '';
  if (!secret.managedSubaccount) {
    return { ok: false, skipped: 'not_managed_subaccount' };
  }
  if (secret.suspended) return { ok: false, skipped: 'suspended' };
  if (secret.senderOnline !== true) {
    return { ok: false, skipped: 'sender_not_online', status: secret.senderStatus || '' };
  }
  if (!subaccountSid || !secret.authTokenEnc || !secret.whatsappFrom) {
    return { ok: false, error: 'missing_subaccount_credentials' };
  }
  let authToken = '';
  try {
    authToken = decryptSecret(secret.authTokenEnc);
  } catch {
    return { ok: false, error: 'auth_token_decrypt_failed' };
  }
  const msg = await sendContentMessage(subaccountSid, authToken, {
    from: wrapWhatsAppAddress(secret.whatsappFrom),
    to: wrapWhatsAppAddress(to),
    contentSid,
    contentVariables,
    statusCallback: statusCallback || '',
  });
  return { ok: true, subaccountSid, msg };
}
