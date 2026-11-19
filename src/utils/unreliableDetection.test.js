import { describe, expect, it } from 'vitest';
import { parseTime, detectUnreliablePhones, findBlockedRecord, NEGATIVE_STREAK_LIMIT } from './unreliableDetection';

describe('parseTime', () => {
  it('يفهم صيغة ص/م التي يولّدها التطبيق (formatHourLabel)', () => {
    expect(parseTime('10:00 م')).toEqual([22, 0]);
    expect(parseTime('09:00 ص')).toEqual([9, 0]);
    expect(parseTime('12:00 م')).toEqual([12, 0]);
    expect(parseTime('12:00 ص')).toEqual([0, 0]);
  });

  it('يفهم صيغة صباحًا/مساءً الكاملة (بالبطنكة وبدونها)', () => {
    expect(parseTime('10:30 مساءً')).toEqual([22, 30]);
    expect(parseTime('10:30 مساء')).toEqual([22, 30]);
    expect(parseTime('10:30 صباحًا')).toEqual([10, 30]);
    expect(parseTime('10:30 صباحا')).toEqual([10, 30]);
  });

  it('يعامل الوقت بلا علامة كصباحي', () => {
    expect(parseTime('7:15')).toEqual([7, 15]);
  });

  it('يرجع [0,0] للمدخلات الفارغة أو غير الصالحة', () => {
    expect(parseTime('')).toEqual([0, 0]);
    expect(parseTime(null)).toEqual([0, 0]);
    expect(parseTime('نص بدون وقت')).toEqual([0, 0]);
  });
});

const NOW = new Date(2026, 5, 15, 10, 0); // الاثنين 15 يونيو 2026

describe('detectUnreliablePhones', () => {
  it('يطلع الرقم بعد سلسلة سلبية تساوي الحد', () => {
    const apts = [
      { phoneNumber: '0501234567', customerName: 'سارة', status: 'rescheduled', date: '2026-06-01' },
      { phoneNumber: '0501234567', customerName: 'سارة', status: 'cancelled', date: '2026-06-03' },
      { phoneNumber: '0501234567', customerName: 'سارة', status: 'rescheduled', date: '2026-06-05' },
    ];
    const out = detectUnreliablePhones(apts, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].negativeStreak).toBe(NEGATIVE_STREAK_LIMIT);
    expect(out[0].name).toBe('سارة');
  });

  it('الحضور/التأكيد يصفّر العداد', () => {
    const apts = [
      { phoneNumber: '0501234567', status: 'rescheduled', date: '2026-05-01' },
      { phoneNumber: '0501234567', status: 'rescheduled', date: '2026-05-02' },
      { phoneNumber: '0501234567', status: 'confirmed', date: '2026-05-10' },
      { phoneNumber: '0501234567', status: 'rescheduled', date: '2026-06-01' },
    ];
    expect(detectUnreliablePhones(apts, NOW)).toHaveLength(0);
  });

  it('يتجاهل المواعيد الأقدم من 6 أشهر', () => {
    const apts = [
      { phoneNumber: '0501234567', status: 'rescheduled', date: '2025-11-01' }, // أقدم من 6 أشهر
      { phoneNumber: '0501234567', status: 'rescheduled', date: '2026-06-01' },
      { phoneNumber: '0501234567', status: 'rescheduled', date: '2026-06-10' },
    ];
    expect(detectUnreliablePhones(apts, NOW)).toHaveLength(0);
  });

  it('يعامل كل رقم على حدة', () => {
    const apts = [
      { phoneNumber: '0501111111', status: 'cancelled', date: '2026-06-01' },
      { phoneNumber: '0501111111', status: 'cancelled', date: '2026-06-02' },
      { phoneNumber: '0501111111', status: 'cancelled', date: '2026-06-03' },
      { phoneNumber: '0502222222', status: 'attended', date: '2026-06-03' },
    ];
    const out = detectUnreliablePhones(apts, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].phone).toBe('0501111111');
  });
});

describe('findBlockedRecord', () => {
  it('يطابق الرقم بعد تنظيف الرموز', () => {
    const blocked = { a: { phone: '+972-50-123-4567' } };
    expect(findBlockedRecord('0501234567', blocked)?.phone).toBe('+972-50-123-4567');
    expect(findBlockedRecord('0529998888', blocked)).toBeUndefined();
  });

  it('يتعامل مع قائمة فارغة', () => {
    expect(findBlockedRecord('0501234567', null)).toBeNull();
    expect(findBlockedRecord('', {})).toBeNull();
  });
});
