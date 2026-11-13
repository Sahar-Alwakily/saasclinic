import { describe, expect, it } from 'vitest';
import { planConsoleCommand } from './consoleCommands';

const brief = {
  people: [{
    id: 'c1',
    name: 'سحر حداد',
    phone: '0535216847',
    sessions: [{ title: 'ليزر', date: '2026-10-01' }],
  }],
  health: { curr: { total: 19, attendRate: 80 } },
  todayBookings: { total: 2 },
  orders: [{ id: 'o1', name: 'ليلى', total: 100, status: 'pending' }],
  branchRows: [{ id: 'b1', name: 'رهط' }],
  serviceRows: [{ id: 's1', title: 'ليزر' }],
  upcoming: [{ weekday: 0, label: 'الأحد', date: '2026-11-08', total: 1, pending: 1, cancelled: 0 }],
  openAppointments: [{
    id: 'a1',
    date: '2026-11-08',
    time: '10:00',
    name: 'سحر حداد',
    status: 'pending',
    branchId: 'b1',
    specialistId: '',
    service: 'ليزر',
  }],
};

describe('planConsoleCommand', () => {
  it('finds a client and her sessions', () => {
    const crowded = {
      ...brief,
      people: [
        ...brief.people,
        { id: 'c2', name: 'ميساء علي', phone: '0500000001', sessions: [] },
        { id: 'c3', name: 'نورا حداد', phone: '0500000002', sessions: [] },
      ],
    };
    const reply = planConsoleCommand(crowded, 'دوري على سحر حداد');
    expect(reply.answer).toContain('سحر حداد');
    expect(reply.answer).toContain('ليزر');
    expect(reply.answer).not.toContain('ميساء');
    expect(reply.answer).not.toContain('نورا');
    expect(reply.links[0].path).toBe('/customers/c1');
  });

  it('opens the file when the next message is only the name', () => {
    const crowded = {
      ...brief,
      people: [
        ...brief.people,
        { id: 'c2', name: 'ميساء علي', phone: '0500000001', sessions: [{ title: 'بشرة', date: '2026-09-01' }] },
      ],
    };
    const reply = planConsoleCommand(crowded, 'ميساء علي', [
      { role: 'user', text: 'دوري على سحر حداد' },
      { role: 'assistant', text: 'في أكثر من عميلة' },
    ]);
    expect(reply.answer).toContain('ميساء علي');
    expect(reply.answer).toContain('بشرة');
    expect(reply.answer).not.toContain('ما فهمت');
  });

  it('reads the report numbers and the orders', () => {
    expect(planConsoleCommand(brief, 'التقرير').answer).toContain('19 حجز');
    expect(planConsoleCommand(brief, 'طلبيات المنتجات').answer).toContain('ليلى');
  });

  it('plans a real cancel when the day has an open booking', () => {
    const reply = planConsoleCommand(brief, 'الغي الحجوزات يوم الاحد');
    expect(reply.action.type).toBe('cancelAppointments');
    expect(reply.action.appointments).toHaveLength(1);
  });

  it('does not cancel an empty day', () => {
    const reply = planConsoleCommand({
      ...brief,
      openAppointments: [],
    }, 'الغي الحجوزات يوم الاحد');
    expect(reply.action).toBeUndefined();
    expect(reply.answer).toContain('ما في حجوزات مفتوحة');
  });

  it('plans a client, a product, a booking, and a site change', () => {
    expect(planConsoleCommand(brief, 'اضيفي عميلة ليلى نور رقم 0521234567').action).toMatchObject({
      type: 'addCustomer',
      firstName: 'ليلى',
      phone: '0521234567',
    });
    expect(planConsoleCommand(brief, 'اضيفي منتج واقي شمس سعر 90').action).toMatchObject({
      type: 'addProduct',
      title: 'واقي شمس',
      price: 90,
    });
    expect(planConsoleCommand(brief, 'اضيفي حجز لسحر حداد يوم الاحد الساعة 10 خدمة ليزر').action).toMatchObject({
      type: 'addAppointment',
      date: '2026-11-08',
      time: '10:00',
      phone: '0535216847',
    });
    expect(planConsoleCommand(brief, 'اخفي الموقع').action).toEqual({ type: 'setPublished', value: false });
    expect(planConsoleCommand(brief, 'سياسة الخصوصية: الرقم للتذكير فقط').action).toMatchObject({
      type: 'setPolicy',
      key: 'privacyPolicy',
    });
  });

  it('plans delete and edit for a client, product, visit, post, and order', () => {
    const full = {
      ...brief,
      catalog: [{ id: 'p1', title: 'واقي شمس', price: 90 }],
      posts: [{ id: 'post1', title: 'عروض أكتوبر' }],
    };
    expect(planConsoleCommand(full, 'احذفي عميلة سحر حداد').action).toMatchObject({ type: 'deleteCustomer', id: 'c1' });
    expect(planConsoleCommand(full, 'عدلي رقم سحر حداد الى 0521111111').action).toMatchObject({ type: 'updateCustomer', phone: '0521111111' });
    expect(planConsoleCommand(full, 'عدلي سعر واقي شمس الى 120').action).toMatchObject({ type: 'updateProduct', id: 'p1', price: 120 });
    expect(planConsoleCommand(full, 'احذفي منتج واقي شمس').action).toMatchObject({ type: 'deleteProduct', id: 'p1' });
    expect(planConsoleCommand(full, 'اجلي حجز سحر حداد يوم الاحد الساعة 4').action).toMatchObject({
      type: 'updateAppointment',
      date: '2026-11-08',
      time: '04:00',
    });
    expect(planConsoleCommand(full, 'عدلي خدمة حجز سحر حداد الى ليزر').action).toMatchObject({
      type: 'updateAppointment',
      service: 'ليزر',
      serviceId: 's1',
    });
    expect(planConsoleCommand(full, 'احذفي مقال عروض أكتوبر').action).toMatchObject({ type: 'deletePost', id: 'post1' });
    expect(planConsoleCommand(full, 'الغي طلب ليلى').action).toMatchObject({ type: 'cancelOrder', id: 'o1' });
  });

  it('opens a file from a normal sentence and cancels one named visit', () => {
    const file = planConsoleCommand(brief, 'بدي اشوف ملف سحر حداد');
    expect(file.answer).toContain('0535216847');
    expect(file.links[0].path).toBe('/customers/c1');
    const cancel = planConsoleCommand(brief, 'الغي حجز سحر حداد');
    expect(cancel.action.type).toBe('cancelAppointments');
    expect(cancel.action.appointments).toHaveLength(1);
    expect(cancel.action.appointments[0].id).toBe('a1');
  });

  it('leaves a plain booking question to the older reply', () => {
    expect(planConsoleCommand(brief, 'يوم الاحد فيه؟')).toBeNull();
  });
});