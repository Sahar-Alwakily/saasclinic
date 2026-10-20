const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function formatHourLabel(hour) {
  const h = Number(hour);
  const period = h < 12 ? 'ص' : 'م';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${String(display).padStart(2, '0')}:00 ${period}`;
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
