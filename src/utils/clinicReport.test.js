import { describe, expect, it } from 'vitest';
import { campaignBookingReport, clientReturnReport, marketingSnapshot } from './clinicReport';

describe('clinic report', () => {
  it('counts bookings created before and after a campaign launch', () => {
    const launched = Date.parse('2026-10-01T09:00:00Z');
    const report = campaignBookingReport(
      [
        { id: 'a', createdAt: launched - 5 * 86400000, status: 'attended' },
        { id: 'b', createdAt: launched + 2 * 86400000, status: 'confirmed', campaignId: 'c1' },
      ],
      [{ id: 'c1', name: 'خريف', status: 'active', launchedAt: launched, targetIds: ['1'] }],
      [{ campaignId: 'c1', status: 'read', replied: true }],
    );
    expect(report.linked).toBe(1);
    expect(report.plain).toBe(1);
    expect(report.rows[0].before30).toBe(1);
    expect(report.rows[0].after30).toBe(1);
    expect(report.rows[0].bookings).toBe(1);
    expect(report.rows[0].replied).toBe(1);
  });

  it('splits clients who came back from clients who lapsed', () => {
    const split = clientReturnReport({
      customers: [
        { id: '1', firstName: 'لينا', phone: '0591000001' },
        { id: '2', firstName: 'نورا', phone: '0591000006' },
      ],
      appointments: [
        { phoneNumber: '0591000001', customerName: 'لينا', service: 'ليزر', date: '2026-08-01', status: 'attended' },
        { phoneNumber: '0591000001', customerName: 'لينا', service: 'ليزر', date: '2026-10-20', status: 'attended' },
        { phoneNumber: '0591000006', customerName: 'نورا', service: 'ليزر', date: '2026-05-01', status: 'attended' },
      ],
      services: [{ id: 'laser', title: 'ليزر', category: 'laser' }],
    });
    expect(split.cameBack.map((j) => j.displayName)).toContain('لينا');
    expect(split.stayedAway.map((j) => j.displayName)).toContain('نورا');
  });

  it('counts open group offers only after the goal is met', () => {
    const snap = marketingSnapshot({
      groupOffers: [
        { goal: 2, accepts: { a: true, b: true } },
        { goal: 10, accepts: { a: true } },
      ],
      offers: [{ adminApproved: true }, { adminApproved: false }],
      blog: [{}],
      orders: [{}, {}],
    });
    expect(snap.openGroups).toBe(1);
    expect(snap.approvedOffers).toBe(1);
    expect(snap.blog).toBe(1);
    expect(snap.orders).toBe(2);
  });
});
