import { describe, expect, it } from 'vitest';
import {
  toYmd,
  comparisonWindows,
  sliceMetrics,
  clinicHealth,
  dailyTasks,
  hourFromTime,
  occupancyInsights,
  interventionAlerts,
  answerFromData,
} from './clinicInsights';

const NOW = new Date(2026, 5, 15, 8, 0); // الاثنين 15 يونيو 2026 الصباح

describe('toYmd', () => {
  it('ينسّق التاريخ المحلي بصيغة YYYY-MM-DD', () => {
    expect(toYmd(new Date(2026, 5, 3))).toBe('2026-06-03');
  });

  it('يرجع نصاً فارغاً لتاريخ غير صالح', () => {
    expect(toYmd('not-a-date')).toBe('');
  });
});

describe('comparisonWindows', () => {
  it('يعبر حدود السنة بشكل صحيح (يناير → ديسمبر)', () => {
    const w = comparisonWindows(new Date(2026, 0, 15));
    expect(w.thisStart).toBe('2026-01-01');
    expect(w.prevStart).toBe('2025-12-01');
    expect(w.prevEnd).toBe('2025-12-15');
  });

  it('يقيد نهاية الفترة السابقة بعدد أيام الشهر السابق (31 مارس → 28 فبراير)', () => {
    const w = comparisonWindows(new Date(2026, 2, 31));
    expect(w.thisStart).toBe('2026-03-01');
    expect(w.prevStart).toBe('2026-02-01');
    expect(w.prevEnd).toBe('2026-02-28'); // الخطأ القديم كان يرجع 2026-03-28
  });
});

describe('sliceMetrics', () => {
  it('يحسب الحالات ونسبة الحضور من مكتمل الحضور فقط', () => {
    const apts = [
      { status: 'attended', date: '2026-06-01', phoneNumber: '0501111111' },
      { status: 'noshow', date: '2026-06-02', phoneNumber: '0501111111' },
      { status: 'cancelled', date: '2026-06-03', phoneNumber: '0502222222' },
      { status: 'pending', date: '2026-06-04', phoneNumber: '0503333333' },
    ];
    const m = sliceMetrics(apts, '2026-06-01', '2026-06-30');
    expect(m.total).toBe(4);
    expect(m.attended).toBe(1);
    expect(m.noshow).toBe(1);
    expect(m.cancelled).toBe(1);
    expect(m.pending).toBe(1);
    expect(m.attendRate).toBe(50);
    expect(m.uniquePhones).toBe(3);
  });

  it('نسبة الحضور null بدون عيّنة', () => {
    expect(sliceMetrics([], '2026-06-01', '2026-06-30').attendRate).toBeNull();
  });
});

describe('clinicHealth', () => {
  const apts = [
    { status: 'attended', date: '2026-06-01', phoneNumber: '0501111111' },
    { status: 'attended', date: '2026-06-05', phoneNumber: '0501111111' },
    { status: 'attended', date: '2026-06-10', phoneNumber: '0502222222' },
    { status: 'noshow', date: '2026-06-12', phoneNumber: '0503333333' },
    { status: 'pending', date: '2026-06-14', phoneNumber: '0504444444' },
    { status: 'attended', date: '2026-05-03', phoneNumber: '0501111111' },
    { status: 'attended', date: '2026-05-08', phoneNumber: '0502222222' },
  ];

  it('يقارن الشهر الحالي بالفترة المقابلة من الشهر السابق', () => {
    const h = clinicHealth({ appointments: apts }, NOW);
    expect(h.curr.total).toBe(5);
    expect(h.prev.total).toBe(2);
    expect(h.deltas.book).toBe(150);
    expect(h.deltas.attend).toBe(-25); // 3 حضر + 1 غياب = 75% مقابل 100% → -25
  });

  it('يحسب درجة الصحة من الأعمدة المتاحة', () => {
    const h = clinicHealth({ appointments: apts }, NOW);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
  });

  it('score = null بدون بيانات', () => {
    const h = clinicHealth({ appointments: [] }, NOW);
    expect(h.score).toBeNull();
  });
});

describe('dailyTasks', () => {
  const NOW_TASKS = new Date(2026, 5, 15, 13, 0); // بعد الظهر
  const apts = [
    { id: 'a1', status: 'pending', date: '2026-06-16' },      // معلّق قادم → pending
    { id: 'a2', status: 'pending', date: '2026-06-14' },      // معلّق فائت → مستثنى
    { id: 'a3', status: 'confirmed', date: '2026-06-16' },    // مؤكد قادم → تذكير مستحق
    { id: 'a4', status: 'rescheduled', date: '2026-06-16' },  // معاد جدولته → تذكير مستحق أيضاً
    { id: 'a5', status: 'noshow', date: '2026-06-15' },       // غياب اليوم → متابعة
    { id: 'a6', status: 'cancelled', date: '2026-06-16' },    // ملغي → لا مكان
  ];

  it('يصنّف المهام ويشمل المواعيد المعاد جدولتها بالتذكيرات', () => {
    const t = dailyTasks({ appointments: apts, now: NOW_TASKS });
    expect(t.pending.map((a) => a.id)).toEqual(['a1']);
    expect(t.followups.map((a) => a.id)).toEqual(['a1', 'a3', 'a4']); // المعلّق القادم أيضاً يدخل نافذة التذكير
    expect(t.noshowToday.map((a) => a.id)).toEqual(['a5']);
    expect(t.gaps).toEqual([]);
  });
});

describe('hourFromTime', () => {
  it('يحلل صيغة ص/م', () => {
    expect(hourFromTime('09:00 ص')).toBe(9);
    expect(hourFromTime('09:00 م')).toBe(21);
    expect(hourFromTime('12:00 م')).toBe(12);
    expect(hourFromTime('12:00 ص')).toBe(0);
    expect(hourFromTime('7:30')).toBe(7);
    expect(hourFromTime('')).toBeNull();
  });
});

describe('occupancyInsights', () => {
  const schedules = {
    b1_s1: { day_1: { active: true, start: 9, end: 12 } }, // الاثنين: 9، 10، 11
  };
  const apts = [
    { id: 'A', status: 'confirmed', date: '2026-06-15', time: '09:00 ص', branchId: 'b1', specialistId: 's1' },
    { id: 'B', status: 'noshow', date: '2026-06-15', time: '10:00 ص', branchId: 'b1', specialistId: 's1' },
    { id: 'D', status: 'rescheduled', date: '2026-06-15', time: '11:00 ص', branchId: 'b1', specialistId: 's1' },
    { id: 'C', status: 'rescheduled', date: '2026-06-16', time: '09:00 ص', branchId: 'b1', specialistId: 's1' },
  ];

  const occ = occupancyInsights({ appointments: apts, schedules, branches: [] }, NOW);

  it('يعيد جدولة الموعد كحجز حقيقي في الأيام القادمة', () => {
    expect(occ.lookahead[0].booked).toBe(2); // A + D
    expect(occ.lookahead[0].gaps).toBe(1);   // 10:00 ص فارغة (غياب B حرّر الساعة)
    expect(occ.lookahead[1].booked).toBe(1); // C المعاد جدولته (كان يُهمل سابقاً)
    expect(occ.lookahead[1].gaps).toBe(0);
    expect(occ.lookahead[1].cap).toBe(1);
  });

  it('يحسب امتلاء اليوم من المحجوز والمتاح', () => {
    expect(occ.todayBooked).toBe(2);
    expect(occ.gapsToday).toBe(1);
    expect(occ.todayFill).toBe(67);
  });

  it('وردية اليوم تشمل الموعد المعاد جدولته ومرتبة بالساعة', () => {
    expect(occ.agenda.map((a) => a.id)).toEqual(['A', 'D']);
  });

  it('يبني أعمدة الساعات من أول ساعة فعلية', () => {
    expect(occ.sample).toBe(3); // B الغياب يعد ضمن العينة (غير ملغي)
    expect(occ.byHour[0].hour).toBe(9);
    expect(occ.byHour.map((h) => h.hour)).toContain(17);
  });
});

describe('interventionAlerts', () => {
  it('ينبّه عن المعلقات والانخفاض', () => {
    const alerts = interventionAlerts({
      appointments: [],
      customers: [],
      waitlist: [],
      tasks: { pending: [{}], gaps: [], followups: [], failed: [], noshowToday: [] },
      health: { deltas: { book: -25 } },
      now: NOW,
    });
    expect(alerts.map((a) => a.id)).toEqual(['pending', 'drop']);
    expect(alerts[1].title).toContain('25');
  });

  it('يشمل المواعيد المعاد جدولتها بتنبيه احتمال الغياب', () => {
    const phone = '0501234567';
    const history = [1, 2, 3].map((i) => ({
      phoneNumber: phone, status: 'noshow', date: `2026-05-0${i}`,
    })).concat([1, 2, 3].map((i) => ({
      phoneNumber: phone, status: 'attended', date: `2026-05-1${i}`,
    })));
    const target = { id: 't', phoneNumber: phone, status: 'rescheduled', date: '2026-06-16', time: '09:00 ص' };
    const tasks = { pending: [], gaps: [], followups: [], failed: [], noshowToday: [] };
    const health = { deltas: {} };

    const alerts = interventionAlerts({
      appointments: [...history, target],
      customers: [],
      waitlist: [],
      tasks,
      health,
      now: NOW,
    });

    expect(alerts.some((a) => a.id === 'risk')).toBe(true);
  });
});

describe('answerFromData', () => {
  const health = {
    curr: { total: 10, attended: 8, noshow: 2, attendRate: 80, confirmed: 6, pending: 2, cancelled: 2 },
    prev: { total: 20, attendRate: 90 },
    deltas: { book: -50 },
    windows: { thisStart: '2026-06-01', thisEnd: '2026-06-15', prevStart: '2026-05-01', prevEnd: '2026-05-15' },
  };

  it('يجيب سؤال انخفاض الحجوزات من الأرقام المخزّنة', () => {
    const r = answerFromData('ليش الحجوزات انخفضت؟', { health });
    expect(r.intent).toBe('drop');
    expect(r.answer).toContain('أقل 50%');
  });

  it('يجيب سؤال الحضور', () => {
    const r = answerFromData('شو نسبة الحضور؟', { health });
    expect(r.intent).toBe('attend');
    expect(r.answer).toContain('80%');
  });

  it('بدون سؤال ولا نية يطلب توضيحاً', () => {
    const r = answerFromData('', { health });
    expect(r.answer).toContain('اكتبي');
  });

  it('سؤال عن اليوم يعطي ملخص المهام', () => {
    const r = answerFromData('شو محتاج تدخل اليوم؟', {
      health,
      tasks: { pending: [{}], gaps: [], followups: [], failed: [], noshowToday: [] },
    });
    expect(r.intent).toBe('today');
    expect(r.answer).toContain('1');
  });
});
