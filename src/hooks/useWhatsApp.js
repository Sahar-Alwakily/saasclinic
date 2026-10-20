import { useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * إرسال واتساب غير مربوط ببوابة بعد.
 * TODO: اربطي VITE_WHATSAPP_TOKEN / VITE_WHATSAPP_PHONE_ID بـ Cloud API.
 */
export function useWhatsApp() {
  const token = import.meta.env.VITE_WHATSAPP_TOKEN || '';
  const phoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID || '';

  const sendTemplate = useCallback(async (phone, templateId, vars) => {
    console.info('[WhatsApp mock] sendTemplate', { phone, templateId, vars, token: !!token, phoneId });
    toast.info(`معاينة إرسال فوري إلى ${phone} (الواتساب غير مربوط بعد)`);
    return { ok: true, mock: true };
  }, [token, phoneId]);

  const scheduleMessage = useCallback(async ({ phone, templateId, vars, days }) => {
    console.info('[WhatsApp mock] scheduleMessage', { phone, templateId, vars, days });
    toast.info(`جُدول الإرسال بعد ${days} يوم (معاينة)`);
    return { ok: true, mock: true, scheduledId: `sched_${Date.now()}` };
  }, []);

  const cancelScheduled = useCallback(async (scheduledId) => {
    console.info('[WhatsApp mock] cancelScheduled', scheduledId);
    return { ok: true };
  }, []);

  const getScheduled = useCallback(async () => [], []);

  return { sendTemplate, scheduleMessage, cancelScheduled, getScheduled, configured: !!(token && phoneId) };
}
