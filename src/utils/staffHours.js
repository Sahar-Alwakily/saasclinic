export function shiftsFromDay(row) {
  if (!row) return [];
  let list = [];
  if (row.shifts && typeof row.shifts === 'object' && !Array.isArray(row.shifts)) {
    list = Object.entries(row.shifts).map(([id, s]) => ({ id, ...s }));
  } else if (Array.isArray(row.shifts)) {
    list = row.shifts.map((s, i) => ({ id: s.id || String(i), ...s }));
  }
  if (row.inAt && !list.some((s) => Number(s.startAt) === Number(row.inAt))) {
    list = [{ id: 'legacy', startAt: row.inAt, endAt: row.outAt || null }, ...list];
  }
  return list.sort((a, b) => (a.startAt || 0) - (b.startAt || 0));
}

export function openShift(row) {
  return shiftsFromDay(row).find((s) => s.startAt && !s.endAt) || null;
}

export function shiftMs(shift, now = Date.now()) {
  if (!shift?.startAt) return 0;
  const end = shift.endAt || now;
  return Math.max(0, end - shift.startAt);
}

export function dayWorkedMs(row, now = Date.now(), { live = false } = {}) {
  return shiftsFromDay(row).reduce((sum, s) => {
    if (!s.startAt) return sum;
    if (!s.endAt && !live) return sum;
    return sum + shiftMs(s, now);
  }, 0);
}

export function monthPrefixFromYmd(ymd) {
  return String(ymd || '').slice(0, 7);
}

export function monthDays(map, prefix) {
  return Object.entries(map || {}).filter(([ymd]) => ymd.startsWith(prefix));
}

export function monthWorkedMs(map, userId, prefix, now = Date.now()) {
  return monthDays(map, prefix).reduce((sum, [, byUser]) => {
    const row = byUser?.[userId];
    return sum + dayWorkedMs(row, now, { live: true });
  }, 0);
}

export function monthDaysPresent(map, userId, prefix) {
  return monthDays(map, prefix).filter(([, byUser]) => {
    const shifts = shiftsFromDay(byUser?.[userId]);
    return shifts.some((s) => s.startAt);
  }).length;
}

export function formatDurationAr(ms) {
  const totalMin = Math.max(0, Math.round(Number(ms || 0) / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h && !m) return '0 د';
  if (!h) return `${m} د`;
  if (!m) return `${h} س`;
  return `${h} س ${m} د`;
}

export function formatHms(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function clockLabel(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
}

export function monthTitleAr(prefix) {
  const [y, m] = String(prefix || '').split('-').map(Number);
  if (!y || !m) return prefix;
  return new Date(y, m - 1, 1).toLocaleDateString('ar', { month: 'long', year: 'numeric' });
}
