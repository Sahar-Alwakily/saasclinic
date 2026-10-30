/**
 * Official Twilio Content API + Messages API.
 * Endpoints from https://www.twilio.com/docs/content/content-api-resources
 * and https://www.twilio.com/docs/content/create-and-send-your-first-content-api-template
 */

function basicAuth(accountSid, authToken) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function fetchTwilioAccount(accountSid, authToken) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    headers: { Authorization: basicAuth(accountSid, authToken) },
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Twilio account ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function createContentTemplate(accountSid, authToken, payload) {
  const res = await fetch('https://content.twilio.com/v1/Content', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Content create ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function submitWhatsAppApproval(accountSid, authToken, contentSid, { name, category }) {
  const res = await fetch(`https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, category }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Approval submit ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchApprovalRequests(accountSid, authToken, contentSid) {
  const res = await fetch(`https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`, {
    headers: { Authorization: basicAuth(accountSid, authToken) },
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Approval fetch ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function sendContentMessage(accountSid, authToken, { from, to, contentSid, contentVariables }) {
  const body = new URLSearchParams();
  body.set('From', from);
  body.set('To', to);
  body.set('ContentSid', contentSid);
  body.set('ContentVariables', JSON.stringify(contentVariables));
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Message send ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export function wrapWhatsAppAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('whatsapp:')) return raw;
  const digits = raw.replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? digits : `+${digits.replace(/^0+/, '')}`;
  return `whatsapp:${e164}`;
}
