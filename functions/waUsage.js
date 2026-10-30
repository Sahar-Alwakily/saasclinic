import { getDatabase } from 'firebase-admin/database';

const db = () => getDatabase();

export function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function recordWaUsage(clinicId, kind) {
  const field = kind === 'sent' ? 'sent' : 'failed';
  const indexField = kind === 'sent' ? 'sentCount' : 'failedCount';
  await db().ref(`clinics/${clinicId}/messagingUsage/${monthKey()}/${field}`).transaction((n) => (Number(n) || 0) + 1);
  await db().ref(`platform/whatsappIndex/${clinicId}/${indexField}`).transaction((n) => (Number(n) || 0) + 1);
}

export async function gateOutbound(clinicId) {
  const messaging = (await db().ref(`clinics/${clinicId}/messaging`).get()).val() || {};
  if (messaging.suspended || messaging.onboarding?.status === 'suspended') {
    return { ok: false, skipped: 'suspended', messaging };
  }
  const wallet = (await db().ref(`clinics/${clinicId}/messagingWallet`).get()).val() || null;
  if (wallet?.enabled === true && Number(wallet.balanceUnits || 0) <= 0) {
    return { ok: false, skipped: 'wallet_empty', messaging, wallet };
  }
  return { ok: true, messaging, wallet };
}

export async function consumeWalletIfEnabled(clinicId, wallet) {
  if (wallet?.enabled !== true) return;
  await db().ref(`clinics/${clinicId}/messagingWallet/balanceUnits`).transaction((n) => {
    const cur = Number(n) || 0;
    return cur > 0 ? cur - 1 : 0;
  });
}
