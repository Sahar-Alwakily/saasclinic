import { httpsCallable } from 'firebase/functions';
import { functions } from '../APIFirebase/firebase';
import { reminderBody, waDigits } from './appointmentOps';
import { hoursKeyToEventId } from './waReminderTemplates';

export async function deliverAppointmentReminder({
  clinicId,
  clinicName,
  apt,
  hoursKey,
  eventId,
  openWaMeOnFallback = true,
}) {
  const event = eventId || hoursKeyToEventId(hoursKey);
  if (!apt?.id || !clinicId || !event) return { channel: 'none', error: 'missing' };

  try {
    const fn = httpsCallable(functions, 'sendClinicWaReminder');
    const res = await fn({ clinicId, appointmentId: apt.id, hoursKey: hoursKey ?? null, eventId: event });
    const data = res.data || {};
    if (data.ok) return { channel: 'twilio', ...data };
    if (['duplicate', 'in_flight', 'opt_out'].includes(data.skipped)) {
      return { channel: 'blocked', ...data };
    }
    if (openWaMeOnFallback && apt.phoneNumber) {
      const body = reminderBody(clinicName, apt, clinicId);
      window.open(`https://wa.me/${waDigits(apt.phoneNumber)}?text=${encodeURIComponent(body)}`, '_blank');
      return { channel: 'wa.me', fallback: true, ...data };
    }
    return { channel: 'none', ...data };
  } catch (err) {
    if (openWaMeOnFallback && apt.phoneNumber) {
      const body = reminderBody(clinicName, apt, clinicId);
      window.open(`https://wa.me/${waDigits(apt.phoneNumber)}?text=${encodeURIComponent(body)}`, '_blank');
      return { channel: 'wa.me', fallback: true, error: err.message };
    }
    return { channel: 'none', error: err.message };
  }
}
