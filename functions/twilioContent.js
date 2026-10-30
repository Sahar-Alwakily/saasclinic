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

export async function sendContentMessage(accountSid, authToken, { from, to, contentSid, contentVariables, statusCallback }) {
  const body = new URLSearchParams();
  body.set('From', from);
  body.set('To', to);
  body.set('ContentSid', contentSid);
  body.set('ContentVariables', JSON.stringify(contentVariables));
  if (statusCallback) body.set('StatusCallback', statusCallback);
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

export async function createSubaccount(parentSid, parentToken, friendlyName) {
  const body = new URLSearchParams();
  body.set('FriendlyName', String(friendlyName || 'Nura clinic').slice(0, 64));
  const res = await fetch('https://api.twilio.com/2010-04-01/Accounts.json', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(parentSid, parentToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Subaccount ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function createWhatsAppSender(accountSid, authToken, payload) {
  const res = await fetch('https://messaging.twilio.com/v2/Channels/Senders', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Sender create ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchWhatsAppSender(accountSid, authToken, senderSid) {
  const res = await fetch(`https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`, {
    headers: { Authorization: basicAuth(accountSid, authToken) },
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Sender fetch ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function deleteWhatsAppSender(accountSid, authToken, senderSid) {
  const res = await fetch(`https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`, {
    method: 'DELETE',
    headers: { Authorization: basicAuth(accountSid, authToken) },
  });
  if (res.status === 404) return { deleted: false, missing: true };
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Sender delete ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function createMessagingService(accountSid, authToken, { friendlyName, inboundUrl, statusCallbackUrl }) {
  const body = new URLSearchParams();
  body.set('FriendlyName', String(friendlyName || 'Nura WhatsApp').slice(0, 64));
  if (inboundUrl) body.set('InboundRequestUrl', inboundUrl);
  body.set('InboundMethod', 'POST');
  if (statusCallbackUrl) body.set('StatusCallback', statusCallbackUrl);
  body.set('UseInboundWebhookOnNumber', 'true');
  const res = await fetch('https://messaging.twilio.com/v1/Services', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Messaging service ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function attachChannelSender(accountSid, authToken, serviceSid, senderSid) {
  const body = new URLSearchParams();
  body.set('Sid', senderSid);
  const res = await fetch(`https://messaging.twilio.com/v1/Services/${serviceSid}/ChannelSenders`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Channel sender ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function configureIncomingSmsWebhook(accountSid, authToken, phoneSid, smsUrl) {
  const body = new URLSearchParams();
  body.set('SmsUrl', smsUrl);
  body.set('SmsMethod', 'POST');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data.message || data.detail || `Incoming SMS webhook ${res.status}`);
    err.twilio = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Senders API v2 body. Credentials must be the clinic subaccount, never the parent account. */
export function whatsAppSenderPayload({ phoneE164, wabaId, phoneNumberId, callbackUrl, verificationCode }) {
  const configuration = { waba_id: wabaId };
  if (phoneNumberId) configuration.phone_number_id = phoneNumberId;
  if (verificationCode) {
    configuration.verification_method = 'sms';
    configuration.verification_code = verificationCode;
  }
  return {
    sender_id: `whatsapp:${phoneE164}`,
    configuration,
    webhook: {
      callback_method: 'POST',
      callback_url: callbackUrl,
      status_callback_url: callbackUrl,
      status_callback_method: 'POST',
    },
  };
}

export function wrapWhatsAppAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('whatsapp:')) return raw;
  const digits = raw.replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? digits : `+${digits.replace(/^0+/, '')}`;
  return `whatsapp:${e164}`;
}
