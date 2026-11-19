import React from 'react';
import {
  DAYS, formatHourLabel, parseTimeOffset, addDays, toYmd, formatClock, staffHoursOnDate,
} from '../../utils/scheduleSlots';

export const STATUS_COLORS = {
  pending: {
    accent: '#B45309', soft: '#FFFBEB', softBorder: '#F3E2C2', ink: '#B45309',
    bg: '#FFFBEB', border: '#F3E2C2', text: '#92400E', chip: 'bg-[#FFFBEB] text-[#B45309] border border-[#F3E2C2]', label: 'معلّق',
  },
  confirmed: {
    accent: '#0FA3A3', soft: '#ECFEFF', softBorder: '#C6EEEE', ink: '#0E7490',
    bg: '#ECFEFF', border: '#C6EEEE', text: '#0E7490', chip: 'bg-[#ECFEFF] text-[#0E7490] border border-[#C6EEEE]', label: 'مؤكد',
  },
  rescheduled: {
    accent: '#0284C7', soft: '#F0F9FF', softBorder: '#CDE7F7', ink: '#0369A1',
    bg: '#F0F9FF', border: '#CDE7F7', text: '#0369A1', chip: 'bg-[#F0F9FF] text-[#0369A1] border border-[#CDE7F7]', label: 'إعادة جدولة',
  },
  cancelled: {
    accent: '#94A3B8', soft: '#F8FAFC', softBorder: '#E2E8F0', ink: '#64748B',
    bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', chip: 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]', label: 'ملغي',
  },
  attended: {
    accent: '#059669', soft: '#ECFDF5', softBorder: '#C9EEE0', ink: '#047857',
    bg: '#ECFDF5', border: '#C9EEE0', text: '#047857', chip: 'bg-[#ECFDF5] text-[#047857] border border-[#C9EEE0]', label: 'حضرت',
  },
  noshow: {
    accent: '#DC2626', soft: '#FEF2F2', softBorder: '#F7D3D3', ink: '#DC2626',
    bg: '#FEF2F2', border: '#F7D3D3', text: '#B91C1C', chip: 'bg-[#FEF2F2] text-[#DC2626] border border-[#F7D3D3]', label: 'غياب',
  },
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
      className="relative w-full overflow-hidden rounded-lg border bg-white px-2.5 py-1.5 text-start transition-colors hover:border-[#CBD5E1]"
      style={{
        borderColor: selected ? c.accent : '#E4EAEE',
        boxShadow: selected ? `0 0 0 1px ${c.accent}` : 'none',
      }}
    >
      <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: c.accent }} />
      <div className={`flex gap-1 ps-1.5 ${compact ? 'flex-col items-start' : 'items-start justify-between'}`}>
        <p className="text-[12px] font-bold truncate w-full text-[#0F172A]">{apt.customerName || 'عميلة'}</p>
        <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold" style={{ background: c.soft, color: c.ink, borderColor: c.softBorder }}>{c.label}</span>
      </div>
      {!compact && (
        <>
          <p className="ps-1.5 mt-0.5 text-[10px] tabular-nums text-[#64748B]">{timeRange(apt)}</p>
          <p className="ps-1.5 text-[10px] truncate text-[#94A3B8]">{apt.service || apt.serviceName || '—'}</p>
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
    <div className="overflow-auto max-h-[calc(100vh-15rem)] no-scrollbar rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
      <div className="min-w-[720px]">
        <div className="grid sticky top-0 z-20 bg-white" style={{ gridTemplateColumns: `4.25rem repeat(${cols.length}, minmax(13.5rem, 1fr))` }}>
          <div className="p-3 text-[11px] text-[#94A3B8] border-b border-[#E4EAEE]">الوقت</div>
          {cols.map((s) => {
            const count = (byStaff[s.id || 'none'] || []).filter((a) => !['cancelled'].includes(a.status)).length;
            return (
              <div key={s.id || 'none'} className="p-3 border-b border-s border-[#E4EAEE] flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#ECFEFF] text-[#0E7490] font-bold flex items-center justify-center text-sm shrink-0">
                  {(s.name || 'ع').trim().charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-[#0F172A]">{s.name}</p>
                  <p className="text-[11px] text-[#94A3B8]">مواعيد اليوم: <span className="text-[#0E7490] font-bold">{count}</span></p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid relative" style={{ gridTemplateColumns: `4.25rem repeat(${cols.length}, minmax(13.5rem, 1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[11px] text-[#94A3B8] px-1 border-b border-[#EDF1F4] flex items-start pt-1.5" style={{ height: ROW_H }}>
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
          {cols.map((s) => {
            const hoursOn = s.id ? staffHoursOnDate(schedules, s.id, dateStr, s.branch || s.branchId) : null;
            return (
              <div key={s.id || 'none'} className="relative border-s border-[#EDF1F4]" style={{ height }}>
                {hours.map((h) => {
                  const off = hoursOn?.closed || (hoursOn && (h < hoursOn.start || h >= hoursOn.end));
                  return (
                    <div
                      key={h}
                      className={`border-b border-[#EDF1F4] ${off ? 'cal-hatch' : ''}`}
                      style={{ height: ROW_H }}
                    />
                  );
                })}
                {hoursOn?.closed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-[#94A3B8] tracking-wide">غير متاح</span>
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
              <div className="h-px bg-[#DC2626]" />
              <span className="absolute right-1/2 translate-x-1/2 -top-3 bg-[#0F172A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
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
    <div className="overflow-auto max-h-[calc(100vh-15rem)] no-scrollbar rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
      <div className="min-w-[720px]">
        <div className="grid sticky top-0 z-20 bg-white" style={{ gridTemplateColumns: `4.5rem repeat(7, minmax(0, 1fr))` }}>
          <div className="p-2 text-[11px] text-[#94A3B8] border-b border-[#E4EAEE]">ساعة</div>
          {days.map((day) => (
            <div
              key={day.ymd}
              className={`p-2 text-center border-b border-s border-[#E4EAEE] ${day.ymd === today ? 'bg-[#F4F7F8]' : ''}`}
            >
              <p className="text-xs font-bold text-[#0F172A]">{day.name}</p>
              <p className="text-[11px] text-[#94A3B8]">{day.date.toLocaleDateString('ar', { day: 'numeric', month: 'short' })}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `4.5rem repeat(7, minmax(0, 1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[11px] text-[#94A3B8] px-1 border-b border-[#EDF1F4] flex items-start pt-1" style={{ height: 56 }}>
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.ymd} className={`relative border-s border-[#E4EAEE] ${day.ymd === today ? 'bg-[#F8FAFC]' : ''}`} style={{ height }}>
              {hours.map((h) => (
                <div key={h} className="border-b border-[#EDF1F4]" style={{ height: 56 }} />
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#94A3B8]">الحالات</span>
      {Object.entries(STATUS_COLORS).map(([id, c]) => (
        <span key={id} className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.accent }} />
          <span className="font-bold text-[#64748B]">{c.label}</span>
        </span>
      ))}
    </div>
  );
}
