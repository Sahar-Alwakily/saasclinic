export const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function formatHourLabel(hour) {
  const h = Number(hour);
  const period = h < 12 ? 'ص' : 'م';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${String(display).padStart(2, '0')}:00 ${period}`;
}

export function parseHourFromLabel(time) {
  const s = String(time || '').trim();
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  let h = Number(m[1]);
  if (/م/.test(s) && h < 12) h += 12;
  if (/ص/.test(s) && h === 12) h = 0;
  if (h > 23) h = 23;
  return h;
}

export function hoursRangeFromSchedules(schedules, fallback = { start: 8, end: 20 }) {
  let start = 24;
  let end = 0;
  Object.values(schedules || {}).forEach((sch) => {
    if (!sch || typeof sch !== 'object') return;
    for (let i = 0; i < 7; i += 1) {
      const d = sch[`day_${i}`];
      if (!d?.active) continue;
      start = Math.min(start, Number(d.start ?? 9));
      end = Math.max(end, Number(d.end ?? 17));
    }
  });
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return fallback;
  return { start, end };
}

export function startOfWeek(date = new Date()) {
  const x = new Date(date);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function addDays(date, n) {
  const x = new Date(date);
  x.setDate(x.getDate() + n);
  return x;
}

export function toYmd(date) {
  const x = date instanceof Date ? date : new Date(date);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function slotsForBooking(schedules, branchId, specialistId, dateStr) {
  if (!dateStr || !branchId) return { slots: [], closed: false, missing: true };
  const map = schedules || {};
  const key = specialistId ? `${branchId}_${specialistId}` : null;
  const schedule = (key && map[key]) || null;
  if (!schedule) return { slots: [], closed: false, missing: true };

  const dayIdx = new Date(`${dateStr}T12:00:00`).getDay();
  const day = schedule[`day_${dayIdx}`];
  if (!day?.active) return { slots: [], closed: true, missing: false, dayName: DAYS[dayIdx] };

  const start = Number(day.start ?? 9);
  const end = Number(day.end ?? 17);
  const slots = [];
  for (let h = start; h < end; h += 1) slots.push(formatHourLabel(h));
  return { slots, closed: false, missing: false, dayName: DAYS[dayIdx] };
}
