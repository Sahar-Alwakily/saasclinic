import { normalizePhone } from './winback';

export const NEGATIVE_STREAK_LIMIT = 3; // عدد المرات اللي بتخلي الرقم "غير موثوق"

// تحليل الوقت انتقل إلى ./timeParse — إعادة تصدير للمستوردين القدامى
export { parseTime } from './timeParse';

// دالة لتحويل الوقت من نص (مثال: 10:30 صباحًا / 10:30 م) إلى [ساعة، دقيقة]
export const parseTime = (timeStr) => {
  if (!timeStr) return [0, 0];
  const normalized = String(timeStr)
    .replace(/صباحًا|صباحا/g, 'AM')
    .replace(/مساءً|مساء/g, 'PM');
  const match = normalized.match(/(\d+):(\d+)\s*(AM|PM)?/);
  if (!match) return [0, 0];
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  let period = match[3];
  // التطبيق يولّد الأوقات بصيغة "10:00 ص" / "10:00 م" (formatHourLabel)
  const tail = normalized.trim().slice(-1);
  if (!period && tail === 'م') period = 'PM';
  if (!period && tail === 'ص') period = 'AM';
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return [h, m];
};

// دالة للبحث إذا الرقم موجود بقائمة الأرقام المحجوبة
// نطبّع الرقمين (970/972/صفر) حتى تتطابق الصيغ المختلفة للرقم نفسه
export const findBlockedRecord = (phone, blockedPhonesObj) => {
  if (!phone || !blockedPhonesObj) return null;
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return null;
  return Object.values(blockedPhonesObj).find(
    (b) => normalizePhone(b.phone) === cleanPhone
  );
};

// الخوارزمية الرئيسية: بتجيب كل المواعيد وبتطلع قائمة بالأرقام غير الموثوقة
export const detectUnreliablePhones = (appointments, now = new Date()) => {
  const phoneStats = {};

  appointments.forEach((apt) => {
    if (!apt.phoneNumber) return;
    
    const phone = apt.phoneNumber.trim();
    
    // تجاهل المواعيد القديمة جداً (أكثر من 6 أشهر) — تحليل محلي آمن للتاريخ فقط
    const aptDate = apt.date ? new Date(`${apt.date}T00:00:00`) : null;
    if (aptDate && (now - aptDate) > 180 * 24 * 60 * 60 * 1000) return;

    if (!phoneStats[phone]) {
      phoneStats[phone] = { phone, name: apt.customerName, negativeStreak: 0, lastStatus: null };
    }

    // إذا كانت الحالة سلبية (ملغي أو إعادة جدولة)، زيد العداد
    if (['cancelled', 'rescheduled'].includes(apt.status)) {
      phoneStats[phone].negativeStreak += 1;
      phoneStats[phone].lastStatus = apt.status;
    } 
    // إذا حضرت (مؤكد)، صفر العداد (لأنها أثبتت جديتها)
    else if (apt.status === 'confirmed') {
      phoneStats[phone].negativeStreak = 0;
    }
  });

  // فلترة الأرقام اللي تعدت الحد المسموح
  return Object.values(phoneStats).filter(
    (stat) => stat.negativeStreak >= NEGATIVE_STREAK_LIMIT
  );
};