// حالات المواعيد المشتركة — مصدر واحد للحقيقة (single source of truth)
// حجز حي يشغل فتحة ويستحق تذكيراً (إعادة الجدولة تحدّث الموعد نفسه بتاريخه الجديد)
export const BOOKABLE_STATUSES = ['pending', 'confirmed', 'rescheduled'];
// حالات تحرّر الفتحة ولا تعد ظهوراً للعميلة
export const GONE_STATUSES = ['cancelled', 'noshow'];
