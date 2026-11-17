import {
  formatHourLabel, parseHourFromLabel, parseTimeOffset, formatClock,
} from './timeParse';

export { formatHourLabel, parseHourFromLabel, parseTimeOffset, formatClock };

export const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function scheduleForStaff(schedules, staffId, branchId) {
  const map = schedules || {};
  if (branchId && staffId && map[`${branchId}_${staffId}`]) return map[`${branchId}_${staffId}`];
  const hit = Object.entries(map).find(([k]) => staffId && k.endsWith(`_${staffId}`) && !k.startsWith('_'));
  return hit ? hit[1] : null;
}

export function staffHoursOnDate(schedules, staffId, dateStr, branchId) {
  const sch = scheduleForStaff(schedules, staffId, branchId);
  if (!sch || !dateStr) return null;
  if (isStaffHoliday(dateStr, sch) || isClinicHoliday(dateStr, schedules)) return { closed: true };
  const dayIdx = new Date(`${dateStr}T12:00:00`).getDay();
  const day = sch[`day_${dayIdx}`];
  if (!day?.active) return { closed: true };
  return { closed: false, start: Number(day.start ?? 9), end: Number(day.end ?? 17) };
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
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function isFutureSlot(dateStr, time, now = new Date()) {
  if (!dateStr) return false;
  const today = toYmd(now);
  if (dateStr > today) return true;
  if (dateStr < today) return false;
  const offset = parseTimeOffset(time);
  if (offset == null) return false;
  return offset > now.getHours() + now.getMinutes() / 60;
}

export function parseHolidayDates(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

export function isClinicHoliday(dateStr, schedules, aptSettings) {
  const clinic = parseHolidayDates(schedules?._clinicHolidays?.holidays);
  const legacy = parseHolidayDates(aptSettings?.holidays);
  return clinic.includes(dateStr) || legacy.includes(dateStr);
}

export function isStaffHoliday(dateStr, schedule) {
  return parseHolidayDates(schedule?.holidays).includes(dateStr);
}

export function slotsForBooking(schedules, branchId, specialistId, dateStr, aptSettings) {
  if (!dateStr || !branchId) return { slots: [], closed: false, missing: true };
  if (isClinicHoliday(dateStr, schedules, aptSettings)) {
    return { slots: [], closed: true, missing: false, holiday: 'clinic', dayName: 'عطلة العيادة' };
  }
  const map = schedules || {};
  const key = specialistId ? `${branchId}_${specialistId}` : null;
  const schedule = (key && map[key]) || null;
  if (!schedule) return { slots: [], closed: false, missing: true };
  if (isStaffHoliday(dateStr, schedule)) {
    return { slots: [], closed: true, missing: false, holiday: 'staff', dayName: 'عطلة الموظفة' };
  }

  const dayIdx = new Date(`${dateStr}T12:00:00`).getDay();
  const day = schedule[`day_${dayIdx}`];
  if (!day?.active) return { slots: [], closed: true, missing: false, dayName: DAYS[dayIdx] };

  const start = Number(day.start ?? 9);
  const end = Number(day.end ?? 17);
  const slots = [];
  for (let h = start; h < end; h += 1) slots.push(formatHourLabel(h));
  return { slots, closed: false, missing: false, dayName: DAYS[dayIdx] };
}
