export const NEGATIVE_STREAK_LIMIT = 3; // عدد المرات اللي بتخلي الرقم "غير موثوق"

// دالة لتحويل الوقت من نص (مثال: 10:30 صباحًا) إلى [ساعة، دقيقة]
export const parseTime = (timeStr) => {
  if (!timeStr) return [0, 0];
  const normalized = timeStr.replace('صباحًا', 'AM').replace('مساءً', 'PM');
  const match = normalized.match(/(\d+):(\d+)\s*(AM|PM)?/);
  if (!match) return [0, 0];
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3];
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return [h, m];
};

// دالة للبحث إذا الرقم موجود بقائمة الأرقام المحجوبة
export const findBlockedRecord = (phone, blockedPhonesObj) => {
  if (!phone || !blockedPhonesObj) return null;
  const cleanPhone = phone.replace(/\D/g, ''); // إزالة الرموز
  return Object.values(blockedPhonesObj).find(
    (b) => b.phone?.replace(/\D/g, '') === cleanPhone
  );
};

// الخوارزمية الرئيسية: بتجيب كل المواعيد وبتطلع قائمة بالأرقام غير الموثوقة
export const detectUnreliablePhones = (appointments, now = new Date()) => {
  const phoneStats = {};

  appointments.forEach((apt) => {
    if (!apt.phoneNumber) return;
    
    const phone = apt.phoneNumber.trim();
    
    // تجاهل المواعيد القديمة جداً (أكثر من 6 أشهر)
    const aptDate = apt.date ? new Date(apt.date) : null;
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