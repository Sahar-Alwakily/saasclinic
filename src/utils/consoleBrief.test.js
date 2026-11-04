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
});
