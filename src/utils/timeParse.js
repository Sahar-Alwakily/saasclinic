// وحدة تحليل وتنسيق الوقت النصي — مصدر واحد لكل محللات "10:00 ص" في المشروع
// ملاحظة: سلوك الدوال مختلف عمداً (قيم إرجاع/معالجة شطائر مختلفة) — لا توحّدها ببعضها.

// ضبط ص/م (PM/AM) على الساعة — مشترك بين كل المحللات
export function applyMeridiem(h, hasPm, hasAm) {
  if (hasPm && h < 12) return h + 12;
  if (hasAm && h === 12) return 0;
  return h;
}

// تنسيق ساعة رقمية إلى "09:00 ص" — الصيغة التي يولّدها ويستهلكها التطبيق كلها
export function formatHourLabel(hour) {
  const h = Number(hour);
  const period = h < 12 ? 'ص' : 'م';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${String(display).padStart(2, '0')}:00 ${period}`;
}

// offset عشري بالساعات أو null إذا ما في أرقام (تقبل 9 / 9:30 / 9:30 م)
export function parseTimeOffset(time) {
  const s = String(time || '').trim();
  const m = s.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  h = applyMeridiem(h, /م/.test(s) || /pm/i.test(s), /ص/.test(s) || /am/i.test(s));
  if (h > 23) h = 23;
  return h + (Number.isFinite(min) ? min / 60 : 0);
}

// أرضية offset — رقم صحيح أو null
export function parseHourFromLabel(time) {
  const offset = parseTimeOffset(time);
  return offset == null ? null : Math.floor(offset);
}

// ساعة صحيحة أو null (يرفض ساعات > 23، عكس parseTimeOffset الذي يقيدّها)
export function hourFromTime(t) {
  const s = String(t || '');
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  let h = applyMeridiem(parseInt(m[1], 10), /م|pm/i.test(s), /ص|am/i.test(s));
  if (h < 0 || h > 23) return null;
  return h;
}

// [ساعة، دقيقة] — يتطلب صيغة h:mm ويرجع [0,0] عند الفشل (سلوك قديم محفوظ)
export function parseTime(timeStr) {
  if (!timeStr) return [0, 0];
  const normalized = String(timeStr)
    .replace(/صباحًا|صباحا/g, 'AM')
    .replace(/مساءً|مساء/g, 'PM');
  const match = normalized.match(/(\d+):(\d+)\s*(AM|PM)?/);
  if (!match) return [0, 0];
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  let period = match[3];
  // التطبيق يولّد الأوقات بصيغة "10:00 ص" / "10:00 م"
  const tail = normalized.trim().slice(-1);
  if (!period && tail === 'م') period = 'PM';
  if (!period && tail === 'ص') period = 'AM';
  h = applyMeridiem(h, period === 'PM', period === 'AM');
  return [h, m];
}

// ساعة الحاضر من كائن Date بصيغة التطبيق "3:45 م"
export function formatClock(date = new Date()) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const period = h < 12 ? 'ص' : 'م';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${m} ${period}`;
}
