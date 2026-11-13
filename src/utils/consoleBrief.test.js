import { describe, expect, it } from 'vitest';
import { spokenLocal } from './consoleBrief';

const brief = {
  tasks: { pending: [], gaps: [], followups: [], failed: [], noshowToday: [] },
  waiting: 0,
  pages: [{ path: '/appointments', label: 'الحجوزات' }],
  alerts: [],
  occupancy: {},
  site: {},
  health: {
    curr: { total: 19, confirmed: 10, pending: 4, cancelled: 2 },
    prev: {},
    deltas: {},
  },
};

describe('spokenLocal booking count', () => {
  it('answers how many bookings are on the record', () => {
    const reply = spokenLocal(brief, 'كم حجوزات عندي؟');
    expect(reply.answer).toContain('19');
    expect(reply.answer).not.toContain('ما فهمت');
    expect(reply.links.some((link) => link.path === '/appointments')).toBe(true);
  });

  it('answers today bookings instead of a failed message', () => {
    const reply = spokenLocal({
      ...brief,
      tasks: { pending: [], gaps: [], followups: [], failed: [{ status: 'failed' }], noshowToday: [] },
      todayBookings: { total: 0, pending: 0, cancelled: 0 },
    }, 'في حجوزات اليوم؟');
    expect(reply.answer).toBe('اليوم ما في حجوزات.');
    expect(reply.answer).not.toContain('فشلت');
    expect(reply.links.some((link) => link.path === '/winback')).toBe(false);
  });

  it('reads tomorrow as a follow-up to today bookings', () => {
    const reply = spokenLocal({
      ...brief,
      tomorrowBookings: { total: 2, pending: 1, cancelled: 0 },
    }, 'طيب بكرا؟', [
      { role: 'user', text: 'اليوم فيه حجوزات؟' },
      { role: 'assistant', text: 'اليوم ما في حجوزات.' },
    ]);
    expect(reply.answer).toBe('بكرا في 2 حجز: معلّق 1، ملغي 0.');
    expect(reply.answer).not.toContain('ما فهمت');
  });

  it('reads the day after tomorrow instead of repeating tomorrow', () => {
    const reply = spokenLocal({
      ...brief,
      tomorrowBookings: { total: 0, pending: 0, cancelled: 0 },
      dayAfterBookings: { total: 1, pending: 1, cancelled: 0 },
    }, 'طيب بعد بكرا؟', [
      { role: 'user', text: 'في ادوار بكرا؟' },
      { role: 'assistant', text: 'بكرا ما في حجوزات.' },
    ]);
    expect(reply.answer).toBe('بعد بكرا في 1 حجز: معلّق 1، ملغي 0.');
    expect(reply.answer).not.toContain('بكرا ما في');
  });

  it('reads a named weekday from the coming days', () => {
    const reply = spokenLocal({
      ...brief,
      upcoming: [{ weekday: 0, label: 'الأحد', date: '2026-11-08', total: 0, pending: 0, cancelled: 0 }],
    }, 'يوم الاحد فيه؟', [
      { role: 'user', text: 'طيب بعد بكرا؟' },
      { role: 'assistant', text: 'بعد بكرا ما في حجوزات.' },
    ]);
    expect(reply.answer).toBe('الأحد ما في حجوزات.');
    expect(reply.answer).not.toContain('ما فهمت');
    expect(reply.links.some((link) => link.path === '/appointments')).toBe(true);
  });

  it('treats cancel on a weekday as a cancel request', () => {
    const reply = spokenLocal({
      ...brief,
      upcoming: [{ weekday: 0, label: 'الأحد', date: '2026-11-08', total: 0, pending: 0, cancelled: 0 }],
    }, 'طيب الغي الحجوزات يوم الاحد', [
      { role: 'user', text: 'يوم الاحد فيه؟' },
      { role: 'assistant', text: 'الأحد ما في حجوزات.' },
    ]);
    expect(reply.answer).toBe('الأحد ما في حجوزات مفتوحة حتى تلغيها.');
    expect(reply.answer).not.toBe('الأحد ما في حجوزات.');
  });

  it('lists who is coming and the clinic pulse from the record', () => {
    const live = {
      ...brief,
      todayBookings: { date: '2026-11-06', total: 1, pending: 1, cancelled: 0 },
      openAppointments: [{ date: '2026-11-06', time: '11:00', name: 'سحر حداد', service: 'ليزر' }],
      people: [{ id: 'c1', name: 'سحر حداد', sessions: [] }, { id: 'c2', name: 'ليلى نور', sessions: [{ title: 'بشرة' }] }],
      serviceRows: [{ id: 's1', title: 'ليزر' }],
      upcoming: [
        { label: 'الجمعة', total: 1 },
        { label: 'السبت', total: 0 },
      ],
      orders: [{ name: 'ليلى', total: 80, status: 'pending' }],
      policies: { deposit: 'عربون 50 ₪' },
      pages: [
        { path: '/appointments', label: 'الحجوزات' },
        { path: '/appointments/reminders', label: 'التذكيرات والقواعد' },
        { path: '/settings', label: 'الإعدادات' },
      ],
    };
    expect(spokenLocal(live, 'مين جاي اليوم؟').answer).toContain('سحر حداد');
    expect(spokenLocal(live, 'شو الوضع؟').answer).toContain('19');
    expect(spokenLocal(live, 'شو الوضع؟').answer).not.toContain('ما لقطت');
    expect(spokenLocal(live, 'اي يوم فاضي؟').answer).toContain('السبت');
    expect(spokenLocal(live, 'كم عميلة عندي؟').answer).toContain('2');
    expect(spokenLocal(live, 'شو الخدمات؟').answer).toContain('ليزر');
    expect(spokenLocal(live, 'كم الدخل؟').answer).toContain('80');
    expect(spokenLocal(live, 'شو سياسة العربون؟').answer).toContain('50');
    expect(spokenLocal(live, 'شو بتقدر تعملي؟').answer).toContain('دوري على اسم العميلة');
    const templates = spokenLocal(live, 'وين بروح اشوف قوالب الواتس؟');
    expect(templates.answer).toContain('التذكيرات والقواعد');
    expect(templates.answer).toContain('قوالب تذكير واتساب');
    expect(templates.links[0].path).toBe('/appointments/reminders');
    const connect = spokenLocal(live, 'وين اربط الواتساب؟');
    expect(connect.answer).toContain('الإعدادات ← واتساب');
    expect(connect.links[0].path).toBe('/settings?tab=whatsapp');
    expect(connect.links[0].path).not.toBe('/appointments/reminders');
  });

  it('answers roles tomorrow as bookings', () => {
    const reply = spokenLocal({
      ...brief,
      tomorrowBookings: { total: 0, pending: 0, cancelled: 0 },
    }, 'في ادوار بكرا؟');
    expect(reply.answer).toBe('بكرا ما في حجوزات.');
  });
});
