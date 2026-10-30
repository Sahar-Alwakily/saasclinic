import React from 'react';
import {
  DAYS, formatHourLabel, parseTimeOffset, addDays, toYmd, formatClock, staffHoursOnDate,
} from '../../utils/scheduleSlots';

export const STATUS_COLORS = {
  pending: { bg: '#fdecef', border: '#f9c5ce', text: '#9f1239', chip: 'bg-rose-100 text-rose-600', label: 'معلّق' },
  confirmed: { bg: '#e8f1fb', border: '#c5daf5', text: '#1e3a5f', chip: 'bg-sky-100 text-sky-700', label: 'مؤكد' },
  rescheduled: { bg: '#fbf3d5', border: '#f0d98a', text: '#854d0e', chip: 'bg-amber-100 text-amber-700', label: 'إعادة جدولة' },
  cancelled: { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280', chip: 'bg-gray-100 text-gray-500', label: 'ملغي' },
  attended: { bg: '#e7f6ee', border: '#b8e3c9', text: '#166534', chip: 'bg-emerald-100 text-emerald-700', label: 'حضرت' },
  noshow: { bg: '#fff1e8', border: '#fdba8c', text: '#9a3412', chip: 'bg-orange-100 text-orange-700', label: 'غياب' },
};

const ROW_H = 64;

function colorOf(apt) {
  return STATUS_COLORS[apt.status] || STATUS_COLORS.pending;
}

export function durationHours(apt) {
  const raw = apt.duration;
  const mins = Number(String(raw || '').replace(/[^\d.]/g, ''));
  if (mins > 0 && mins <= 12) return Math.max(1, mins);
  if (mins > 12) return Math.max(0.5, mins / 60);
  return 1;
}

function clockFromOffset(n) {
  const h = Math.floor(n);
  const min = Math.round((n - h) * 60);
  const period = h < 12 ? 'ص' : 'م';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(min).padStart(2, '0')} ${period}`;
}

export function timeRange(apt) {
  const start = parseTimeOffset(apt.time);
  if (start == null) return apt.time || '—';
  return `${apt.time || clockFromOffset(start)} → ${clockFromOffset(start + durationHours(apt))}`;
}

function AptCard({ apt, selected, onSelect, compact }) {
  const c = colorOf(apt);
  return (
    <button
      type="button"
      onClick={() => onSelect(apt)}
      className="w-full text-right rounded-2xl px-3 py-2 overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      style={{
        background: c.bg,
        border: `1px solid ${selected ? '#111827' : c.border}`,
        color: c.text,
      }}
    >
      <div className={`flex gap-1 ${compact ? 'flex-col items-start' : 'items-start justify-between'}`}>
        <p className="text-[13px] font-bold truncate w-full">{apt.customerName || 'عميلة'}</p>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.chip}`}>{c.label}</span>
      </div>
      {!compact && (
        <>
          <p className="text-[11px] mt-1 opacity-80">{timeRange(apt)}</p>
          <p className="text-[11px] mt-0.5 truncate opacity-70">{apt.service || apt.serviceName || '—'}</p>
        </>
      )}
    </button>
  );
}

export function ResourceDayBoard({
  dateStr,
  hourStart,
  hourEnd,
  appointments,
  staff,
  schedules,
  selectedId,
  onSelect,
}) {
  const hours = [];
  for (let h = hourStart; h < hourEnd; h += 1) hours.push(h);
  const height = hours.length * ROW_H;
  const today = toYmd(new Date());
  const isToday = dateStr === today;
  const now = new Date();
  const nowFrac = now.getHours() + now.getMinutes() / 60;
  const cols = (staff || []).length ? staff : [{ id: '', name: 'العيادة' }];

  const byStaff = {};
  cols.forEach((s) => { byStaff[s.id || 'none'] = []; });
  (appointments || []).forEach((apt) => {
    const key = apt.specialistId || 'none';
    if (!byStaff[key]) byStaff[key] = [];
    const offset = parseTimeOffset(apt.time);
    if (offset == null) return;
    byStaff[key].push({ ...apt, _offset: offset, _span: durationHours(apt) });
  });

  return (
    <div className="overflow-auto max-h-[calc(100vh-15rem)] no-scrollbar rounded-[20px] border border-[#ebeef2] bg-white" dir="rtl">
      <div className="min-w-[720px]">
        <div className="grid sticky top-0 z-20 bg-white" style={{ gridTemplateColumns: `4.25rem repeat(${cols.length}, minmax(13.5rem, 1fr))` }}>
          <div className="p-3 text-[11px] text-[#9ca3af] border-b border-[#ebeef2]">الوقت</div>
          {cols.map((s) => {
            const count = (byStaff[s.id || 'none'] || []).filter((a) => !['cancelled'].includes(a.status)).length;
            return (
              <div key={s.id || 'none'} className="p-3 border-b border-s border-[#ebeef2] flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#ecfdf3] text-[#15803d] font-bold flex items-center justify-center text-sm shrink-0">
                  {(s.name || 'ع').trim().charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-[#111827]">{s.name}</p>
                  <p className="text-[11px] text-[#8a9199]">مواعيد اليوم: <span className="text-[#16a34a] font-bold">{count}</span></p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid relative" style={{ gridTemplateColumns: `4.25rem repeat(${cols.length}, minmax(13.5rem, 1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[11px] text-[#9ca3af] px-1 border-b border-[#f3f5f7] flex items-start pt-1.5" style={{ height: ROW_H }}>
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
          {cols.map((s) => {
            const hoursOn = s.id ? staffHoursOnDate(schedules, s.id, dateStr, s.branch || s.branchId) : null;
            return (
              <div key={s.id || 'none'} className="relative border-s border-[#f3f5f7]" style={{ height }}>
                {hours.map((h) => {
                  const off = hoursOn?.closed || (hoursOn && (h < hoursOn.start || h >= hoursOn.end));
                  return (
                    <div
                      key={h}
                      className={`border-b border-[#f3f5f7] ${off ? 'cal-hatch' : ''}`}
                      style={{ height: ROW_H }}
                    />
                  );
                })}
                {hoursOn?.closed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-[#9ca3af] tracking-wide">غير متاح</span>
                  </div>
                )}
                {(byStaff[s.id || 'none'] || []).map((apt) => {
                  if (apt._offset < hourStart || apt._offset >= hourEnd) return null;
                  const top = (apt._offset - hourStart) * ROW_H + 4;
                  const h = Math.min(apt._span, hourEnd - apt._offset) * ROW_H - 8;
                  return (
                    <div key={apt.id} className="absolute z-[2]" style={{ top, height: Math.max(h, 56), left: 8, right: 8 }}>
                      <AptCard apt={apt} selected={selectedId === apt.id} onSelect={onSelect} />
                    </div>
                  );
                })}
              </div>
            );
          })}
          {isToday && nowFrac >= hourStart && nowFrac <= hourEnd && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{ top: (nowFrac - hourStart) * ROW_H, right: '4.25rem', left: 0 }}
            >
              <div className="h-px bg-rose-500" />
              <span className="absolute right-1/2 translate-x-1/2 -top-3 bg-[#111827] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {formatClock(now)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyBoard({
  weekStart,
  hourStart,
  hourEnd,
  appointments,
  selectedId,
  onSelect,
}) {
  const hours = [];
  for (let h = hourStart; h < hourEnd; h += 1) hours.push(h);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { idx: i, date: d, ymd: toYmd(d), name: DAYS[i] };
  });
  const today = toYmd(new Date());
  const height = hours.length * 56;

  const byDay = {};
  days.forEach((day) => { byDay[day.ymd] = []; });
  (appointments || []).forEach((apt) => {
    if (!byDay[apt.date]) return;
    const offset = parseTimeOffset(apt.time);
    if (offset == null) return;
    byDay[apt.date].push({ ...apt, _offset: offset, _span: durationHours(apt) });
  });

  return (
    <div className="overflow-auto max-h-[calc(100vh-15rem)] no-scrollbar rounded-[20px] border border-[#ebeef2] bg-white" dir="rtl">
      <div className="min-w-[720px]">
        <div className="grid sticky top-0 z-20 bg-white" style={{ gridTemplateColumns: `4.5rem repeat(7, minmax(0, 1fr))` }}>
          <div className="p-2 text-[11px] text-[#9ca3af] border-b border-[#ebeef2]">ساعة</div>
          {days.map((day) => (
            <div
              key={day.ymd}
              className={`p-2 text-center border-b border-s border-[#ebeef2] ${day.ymd === today ? 'bg-[#111827]/5' : ''}`}
            >
              <p className="text-xs font-bold text-[#111827]">{day.name}</p>
              <p className="text-[11px] text-[#8a9199]">{day.date.toLocaleDateString('ar', { day: 'numeric', month: 'short' })}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `4.5rem repeat(7, minmax(0, 1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[11px] text-[#9ca3af] px-1 border-b border-[#f3f5f7] flex items-start pt-1" style={{ height: 56 }}>
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.ymd} className={`relative border-s border-[#f3f5f7] ${day.ymd === today ? 'bg-[#111827]/[0.02]' : ''}`} style={{ height }}>
              {hours.map((h) => (
                <div key={h} className="border-b border-[#f3f5f7]" style={{ height: 56 }} />
              ))}
              {(byDay[day.ymd] || []).map((apt) => {
                if (apt._offset < hourStart || apt._offset >= hourEnd) return null;
                const top = (apt._offset - hourStart) * 56 + 2;
                const h = Math.min(apt._span, hourEnd - apt._offset) * 56 - 6;
                return (
                  <div key={apt.id} className="absolute z-[2]" style={{ top, height: Math.max(h, 44), left: 4, right: 4 }}>
                    <AptCard apt={apt} selected={selectedId === apt.id} onSelect={onSelect} compact />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      {Object.entries(STATUS_COLORS).map(([id, c]) => (
        <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#ebeef2] bg-white" style={{ color: c.text }}>
          <span className="w-2 h-2 rounded-full" style={{ background: c.border }} />
          {c.label}
        </span>
      ))}
    </div>
  );
}
