import { describe, expect, it } from 'vitest';
import { extractOtp, toE164 } from '../../functions/waPhone.js';
import { twilioRequestSignature, validTwilioSignature } from '../../functions/twilioSignature.js';

describe('whatsapp onboarding guards', () => {
  it('accepts only E.164 numbers', () => {
    expect(toE164('+972501234567')).toBe('+972501234567');
    expect(toE164('0501234567')).toBe('');
    expect(toE164('+972 50-123-4567')).toBe('+972501234567');
  });

  it('reads a verification code without treating the message as a successful sender', () => {
    expect(extractOtp('Your WhatsApp code is 849221')).toBe('849221');
    expect(extractOtp('no code here')).toBe('');
  });
  it('rejects a webhook whose Twilio signature does not match', () => {
    const url = 'https://example.com/webhook?clinicId=c1';
    const params = { MessageSid: 'SM1', MessageStatus: 'delivered' };
    const good = twilioRequestSignature('token', url, params);
    expect(validTwilioSignature('token', good, url, params)).toBe(true);
    expect(validTwilioSignature('token', good, url, { ...params, MessageStatus: 'failed' })).toBe(false);
    expect(validTwilioSignature('other', good, url, params)).toBe(false);
  });
});
