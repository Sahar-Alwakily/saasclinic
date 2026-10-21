import React from 'react';
import { DAYS, formatHourLabel, parseHourFromLabel, addDays, toYmd } from '../../utils/scheduleSlots';
import { APT_STATUSES } from '../../utils/appointmentOps';

export const STATUS_COLORS = {
  pending: { bg: '#fef3c7', border: '#f0b429', text: '#92400e', label: 'بانتظار التأكيد' },
  confirmed: { bg: '#d1fae5', border: '#22c9a0', text: '#065f46', label: 'مؤكد' },
  rescheduled: { bg: '#fef9c3', border: '#eab308', text: '#854d0e', label: 'إعادة جدولة' },
  cancelled: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', label: 'ملغي' },
  attended: { bg: '#dbeafe', border: '#4d7cff', text: '#1e3a8a', label: 'حضر' },
  noshow: { bg: '#ffedd5', border: '#ff6b4a', text: '#9a3412', label: 'لم يحضر' },
};

const ROW_H = 56;

function colorOf(apt) {
  return STATUS_COLORS[apt.status] || STATUS_COLORS.pending;
}

function durationHours(apt) {
  const raw = apt.duration;
  const mins = Number(String(raw || '').replace(/[^\d.]/g, ''));
  if (mins > 0 && mins <= 12) return Math.max(1, Math.round(mins));
  if (mins > 12) return Math.max(1, Math.round(mins / 60));
  return 1;
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
  const height = hours.length * ROW_H;

  const byDay = {};
  days.forEach((day) => { byDay[day.ymd] = []; });
  (appointments || []).forEach((apt) => {
    if (!byDay[apt.date]) return;
    const hour = parseHourFromLabel(apt.time);
    if (hour == null) return;
    byDay[apt.date].push({ ...apt, _hour: hour, _span: durationHours(apt) });
  });

  return (
    <div className="overflow-x-auto rounded-3xl border border-[#e4ddd0] bg-[#fffcf7] dark:bg-slate-800 dark:border-slate-700" dir="rtl">
      <div className="min-w-[720px]">
        <div className="grid" style={{ gridTemplateColumns: `4.5rem repeat(7, minmax(0, 1fr))` }}>
          <div className="p-2 text-[11px] text-stone-400 border-b border-[#e4ddd0] dark:border-slate-700">ساعة</div>
          {days.map((day) => (
            <div
              key={day.ymd}
              className={`p-2 text-center border-b border-r border-[#e4ddd0] dark:border-slate-700 ${day.ymd === today ? 'bg-[#4d7cff]/10' : ''}`}
            >
              <p className="text-xs font-bold">{day.name}</p>
              <p className="text-[11px] text-stone-500">{day.date.toLocaleDateString('ar', { day: 'numeric', month: 'short' })}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `4.5rem repeat(7, minmax(0, 1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[11px] text-stone-400 px-1 border-b border-[#eee] dark:border-slate-700 flex items-start pt-1" style={{ height: ROW_H }}>
                {formatHourLabel(h)}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.ymd} className={`relative border-r border-[#eee] dark:border-slate-700 ${day.ymd === today ? 'bg-[#4d7cff]/5' : ''}`} style={{ height }}>
              {hours.map((h) => (
                <div key={h} className="border-b border-[#f3efe6] dark:border-slate-700/80" style={{ height: ROW_H }} />
              ))}
              {(byDay[day.ymd] || []).map((apt) => {
                const top = (apt._hour - hourStart) * ROW_H + 2;
                if (apt._hour < hourStart || apt._hour >= hourEnd) return null;
                const h = Math.min(apt._span, hourEnd - apt._hour) * ROW_H - 6;
                const c = colorOf(apt);
                const selected = selectedId === apt.id;
                return (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => onSelect(apt)}
                    className="absolute left-1 right-1 rounded-xl text-right px-2 py-1 overflow-hidden shadow-sm"
                    style={{
                      top,
                      height: Math.max(h, 44),
                      background: c.bg,
                      border: `2px solid ${selected ? '#14121c' : c.border}`,
                      color: c.text,
                      zIndex: selected ? 4 : 2,
                    }}
                  >
                    <p className="text-[11px] font-extrabold truncate">{apt.time}</p>
                    <p className="text-xs font-bold truncate">{apt.customerName}</p>
                    <p className="text-[10px] truncate opacity-80">{apt.service}</p>
                  </button>
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
        <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
          <span className="w-2 h-2 rounded-full" style={{ background: c.border }} />
          {APT_STATUSES.find((s) => s.id === id)?.label || c.label}
        </span>
      ))}
    </div>
  );
}
