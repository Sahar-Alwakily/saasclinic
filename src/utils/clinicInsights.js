import { upcomingGaps, reminderDue, mergeAptSettings, noShowRisk } from './appointmentOps';

export function toYmd(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function inDateRange(dateStr, startYmd, endYmd) {
  if (!dateStr) return false;
  return dateStr >= startYmd && dateStr <= endYmd;
}

export function comparisonWindows(now = new Date()) {
  const thisEnd = toYmd(now);
  const thisStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = toYmd(prevMonth);
  const prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  prevEndDate.setDate(Math.min(now.getDate(), lastDayPrev));
  const prevEnd = toYmd(prevEndDate);
  return { thisStart, thisEnd, prevStart, prevEnd };
}

function money(apt) {
  if (['cancelled', 'noshow'].includes(apt.status)) return 0;
  return Number(apt.price || 0);
}

export function sliceMetrics(appointments, start, end) {
  const list = (appointments || []).filter((a) => inDateRange(a.date, start, end));
  const attended = list.filter((a) => a.status === 'attended').length;
  const noshow = list.filter((a) => a.status === 'noshow').length;
  const cancelled = list.filter((a) => a.status === 'cancelled').length;
  const pending = list.filter((a) => a.status === 'pending').length;
  const confirmed = list.filter((a) => a.status === 'confirmed').length;
  const showDenom = attended + noshow;
  const phones = new Set(list.map((a) => String(a.phoneNumber || '').replace(/\D/g, '')).filter(Boolean));
  return {
    total: list.length,
    attended,
    noshow,
    cancelled,
    pending,
    confirmed,
    revenue: list.reduce((s, a) => s + money(a), 0),
    attendRate: showDenom ? Math.round((attended / showDenom) * 100) : null,
    uniquePhones: phones.size,
  };
}

function delta(curr, prev) {
  if (prev == null || curr == null) return null;
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 100);
}

export function clinicHealth({ appointments = [], customers = [] }, now = new Date()) {
  const w = comparisonWindows(now);
  const curr = sliceMetrics(appointments, w.thisStart, w.thisEnd);
  const prev = sliceMetrics(appointments, w.prevStart, w.prevEnd);

  const ninety = new Date(now);
  ninety.setDate(ninety.getDate() - 90);
  const prevNinety = new Date(ninety);
  prevNinety.setDate(prevNinety.getDate() - 90);
  const recent = sliceMetrics(appointments, toYmd(ninety), toYmd(now));
  const older = sliceMetrics(appointments, toYmd(prevNinety), toYmd(ninety));
  const retained = older.uniquePhones
    ? Math.round((recent.uniquePhones / older.uniquePhones) * 100)
    : null;

  const pillars = [
    {
      id: 'attend',
      label: 'الحضور',
      value: curr.attendRate,
      prev: prev.attendRate,
      unit: '%',
      note: curr.attended + curr.noshow < 5 ? 'عيّنة الحضور أقل من 5 مواعيد مكتملة' : null,
    },
    {
      id: 'book',
      label: 'الحجوزات',
      value: curr.total,
      prev: prev.total,
      unit: '',
      note: null,
    },
    {
      id: 'rev',
      label: 'الإيراد',
      value: curr.revenue,
      prev: prev.revenue,
      unit: '',
      note: 'من سعر المواعيد غير الملغاة وغير الغياب فقط',
    },
    {
      id: 'keep',
      label: 'الاحتفاظ',
      value: retained,
      prev: null,
      unit: '%',
      note: older.uniquePhones < 3 ? 'هواتف فريدة قليلة في الفترة السابقة' : 'هواتف نشطة آخر 90 يوماً ÷ الـ 90 السابقة',
    },
  ];

  const scored = pillars.filter((p) => p.value != null);
  let score = null;
  if (scored.length) {
    const parts = scored.map((p) => {
      if (p.id === 'attend' || p.id === 'keep') return Math.max(0, Math.min(100, Number(p.value)));
      if (p.id === 'book') {
        const d = delta(p.value, p.prev);
        if (d == null) return p.value > 0 ? 70 : 40;
        return Math.max(20, Math.min(100, 70 + d / 2));
      }
      const d = delta(p.value, p.prev);
      if (d == null) return p.value > 0 ? 70 : 40;
      return Math.max(20, Math.min(100, 70 + d / 2));
    });
    score = Math.round(parts.reduce((s, n) => s + n, 0) / parts.length);
  }

  return {
    windows: w,
    curr,
    prev,
    pillars,
    score,
    customerCount: customers.length,
    deltas: {
      book: delta(curr.total, prev.total),
      rev: delta(curr.revenue, prev.revenue),
      attend: delta(curr.attendRate, prev.attendRate),
    },
  };
}

export function dailyTasks({
  appointments = [],
  schedules = {},
  branches = [],
  messages = [],
  settings,
  now = new Date(),
}) {
  const today = toYmd(now);
  const aptSettings = mergeAptSettings(settings);
  const pending = (appointments || []).filter((a) => a.status === 'pending' && a.date >= today);
  const gaps = upcomingGaps({ schedules, appointments, branches, dateStr: today });
  const followups = (appointments || []).filter((a) => reminderDue(a, aptSettings, now).length > 0);
  const noshowToday = (appointments || []).filter((a) => a.status === 'noshow' && a.date === today && !a.noshowFollowupSent);
  const failed = (messages || []).filter((m) => m.status === 'failed');
  return {
    pending,
    gaps,
    followups,
    noshowToday,
    failed,
    total: pending.length + (gaps.length ? 1 : 0) + followups.length + noshowToday.length + failed.length,
  };
}

export function interventionAlerts({
  appointments = [],
  customers = [],
  waitlist = [],
  tasks,
  health,
  now = new Date(),
}) {
  const today = toYmd(now);
  const list = [];
  if (tasks.pending.length) {
    list.push({
      id: 'pending',
      tone: 'gold',
      title: `${tasks.pending.length} موعد بانتظار تأكيد`,
      detail: 'حجوزات قادمة بلا تأكيد — تحتاج تدخلاً اليوم.',
      to: '/appointments',
    });
  }
  if (tasks.gaps.length) {
    list.push({
      id: 'gaps',
      tone: 'azure',
      title: `${tasks.gaps.length} شاغر في جدول اليوم`,
      detail: 'يمكن عرضها على قائمة الانتظار.',
      to: '/ops',
    });
  }
  const waiting = (waitlist || []).filter((w) => w.status === 'waiting' || w.status === 'offered');
  if (waiting.length && tasks.gaps.length) {
    list.push({
      id: 'wait',
      tone: 'mint',
      title: `${waiting.length} على الانتظار مقابل شواغر اليوم`,
      detail: 'عرض الشاغر لأول من تقبل يقلل الفاقد.',
      to: '/ops',
    });
  }
  if (tasks.failed.length) {
    list.push({
      id: 'failed',
      tone: 'coral',
      title: `${tasks.failed.length} رسالة فشل إرسالها`,
      detail: 'راجعي القناة أو أعيدي المحاولة من الاسترجاع.',
      to: '/winback',
    });
  }
  if (tasks.followups.length) {
    list.push({
      id: 'remind',
      tone: 'lilac',
      title: `${tasks.followups.length} تذكير مستحق`,
      detail: 'مواعيد مؤكدة أو معلّقة دخلت نافذة التذكير.',
      to: '/ops',
    });
  }
  const highRisk = (appointments || [])
    .filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= today)
    .map((a) => ({ ...a, risk: noShowRisk(appointments, a, now) }))
    .filter((a) => a.risk.earlyConfirm);
  if (highRisk.length) {
    list.push({
      id: 'risk',
      tone: 'coral',
      title: `${highRisk.length} موعد بدرجة غياب مرتفعة`,
      detail: 'الدرجة مبنية على سجل الهاتف عند توفر 5+ مواعيد مكتملة.',
      to: '/ops',
    });
  }
  if (health.deltas.book != null && health.deltas.book <= -20) {
    list.push({
      id: 'drop',
      tone: 'gold',
      title: `الحجوزات أقل ${Math.abs(health.deltas.book)}% عن نفس الأيام من الشهر الماضي`,
      detail: 'هذا فرق عددي فقط — افتحي المساعد لمعرفة ما تسجّله البيانات.',
      to: '/dashboard',
    });
  }
  const inactive = (customers || []).filter((c) => {
    const sessions = c.sessions || [];
    if (!sessions.length) return false;
    const last = sessions.reduce((latest, s) => {
      const d = new Date(s.recordedAt || 0);
      return d > latest ? d : latest;
    }, new Date(0));
    return (now - last) / 86400000 > 90;
  });
  if (inactive.length) {
    list.push({
      id: 'lapsed',
      tone: 'lilac',
      title: `${inactive.length} عميلة بلا زيارة مسجّلة منذ 90 يوماً`,
      detail: 'مرشحات لحملة استرجاع إن كان الرقم غير موقوف.',
      to: '/winback',
    });
  }
  return list;
}

function fmtMoney(n) {
  return `${Number(n || 0).toLocaleString('ar')} ₪`;
}

function factLine(health) {
  const { curr, prev, windows, deltas } = health;
  return [
    `الفترة الحالية ${windows.thisStart} → ${windows.thisEnd}: ${curr.total} حجز، إيراد ${fmtMoney(curr.revenue)}، حضور ${curr.attendRate == null ? 'غير محسوب' : `${curr.attendRate}%`} (حضر ${curr.attended} / غاب ${curr.noshow})، إلغاء ${curr.cancelled}.`,
    `نفس عدد الأيام من الشهر السابق ${windows.prevStart} → ${windows.prevEnd}: ${prev.total} حجز، إيراد ${fmtMoney(prev.revenue)}، حضور ${prev.attendRate == null ? 'غير محسوب' : `${prev.attendRate}%`}.`,
    deltas.book == null ? 'لا يمكن حساب نسبة تغيّر الحجوزات لأن الفترة السابقة صفر.' : `تغيّر الحجوزات: ${deltas.book > 0 ? '+' : ''}${deltas.book}%.`,
    deltas.rev == null ? 'لا يمكن حساب نسبة تغيّر الإيراد لأن الفترة السابقة صفر.' : `تغيّر الإيراد: ${deltas.rev > 0 ? '+' : ''}${deltas.rev}%.`,
  ];
}

export function answerFromData(question, { health, tasks, appointments = [], services = [], waitlist = [] }) {
  const q = String(question || '').trim();
  if (!q) {
    return { answer: 'اكتبي سؤالاً عن الحجوزات أو الحضور أو الإيراد أو الشواغر.', facts: [], missing: [] };
  }
  const facts = factLine(health);
  const missing = [];
  if (!appointments.length) missing.push('لا توجد مواعيد مخزّنة بعد.');
  const priced = appointments.filter((a) => Number(a.price || 0) > 0).length;
  if (appointments.length && priced / appointments.length < 0.3) {
    missing.push('معظم المواعيد بلا سعر — الإيراد ناقص.');
  }
  const attendSample = health.curr.attended + health.curr.noshow;
  if (attendSample < 5) missing.push('عيّنة الحضور هذا الشهر أقل من 5 مواعيد مكتملة — لا استنتاج عن سبب الغياب.');

  const aboutBook = /حجز|حجوز|موعد|مواعيد/.test(q);
  const aboutDrop = /انخفض|نزل|قلّ|قل |تراجع|ليش|لماذا|سبب/.test(q);
  const aboutAttend = /حضور|غاب|غياب|لم يحضر|noshow/.test(q);
  const aboutRev = /إيراد|دخل|فلوس|سعر|مبيع/.test(q);
  const aboutGap = /شاغر|فراغ|انتظار/.test(q);
  const aboutToday = /اليوم|تدخل|مهم/.test(q);

  let answer = '';
  if (aboutDrop && aboutBook) {
    if (health.deltas.book == null) {
      answer = 'لا أستطيع تفسير انخفاض الحجوزات: الفترة السابقة لا تحتوي حجوزات كافية للمقارنة.';
    } else if (health.deltas.book >= 0) {
      answer = `البيانات لا تُظهر انخفاضاً. الحجوزات من أول الشهر حتى اليوم ${health.curr.total} مقابل ${health.prev.total} في نفس الأيام من الشهر الماضي (${health.deltas.book > 0 ? '+' : ''}${health.deltas.book}%).`;
    } else {
      answer = `الحجوزات أقل ${Math.abs(health.deltas.book)}% (${health.prev.total} → ${health.curr.total}) عند مقارنة أول الشهر حتى اليوم مع نفس الأيام من الشهر الماضي. السجلات لا تحتوي سبب الحملة أو الإعلان أو الطقس أو العطل — فقط العدد والحالة والسعر.`;
      const hot = {};
      (appointments || []).filter((a) => a.status === 'cancelled' && inDateRange(a.date, health.windows.thisStart, health.windows.thisEnd))
        .forEach((a) => { hot[a.service || '—'] = (hot[a.service || '—'] || 0) + 1; });
      const top = Object.entries(hot).sort((a, b) => b[1] - a[1])[0];
      if (top) answer += ` الإلغاءات هذا الشهر أعلى خدمة مسجّلة: ${top[0]} (${top[1]}).`;
    }
  } else if (aboutAttend) {
    answer = health.curr.attendRate == null
      ? 'لا نسبة حضور هذا الشهر لأن لا مواعيد بحالة حضر/لم يحضر.'
      : `نسبة الحضور (حضر ÷ حضر+غاب) هذا الشهر ${health.curr.attendRate}% مقابل ${health.prev.attendRate == null ? 'غير متاحة' : `${health.prev.attendRate}%`} في الفترة المقارنة.`;
  } else if (aboutRev) {
    answer = `إيراد المواعيد المحتسبة هذا الشهر ${fmtMoney(health.curr.revenue)} مقابل ${fmtMoney(health.prev.revenue)} في الفترة المقارنة.`;
  } else if (aboutGap) {
    answer = `شواغر اليوم في الجدول: ${tasks.gaps.length}. على الانتظار: ${(waitlist || []).filter((w) => w.status === 'waiting' || w.status === 'offered').length}.`;
  } else if (aboutToday) {
    answer = `يحتاج تدخلاً اليوم: ${tasks.pending.length} غير مؤكد، ${tasks.gaps.length} شاغر، ${tasks.followups.length} تذكير، ${tasks.failed.length} رسالة فاشلة، ${tasks.noshowToday.length} غياب اليوم بلا متابعة.`;
  } else if (aboutBook) {
    answer = `حجوزات الفترة الحالية ${health.curr.total} (مؤكد ${health.curr.confirmed}، معلّق ${health.curr.pending}، ملغي ${health.curr.cancelled}).`;
  } else {
    answer = 'أقدر أجاوب من الأرقام المخزّنة فقط: الحجوزات، الحضور، الإلغاء، الإيراد من السعر، الشواغر، الرسائل الفاشلة. ما في سبب خارجي في قاعدة البيانات.';
  }

  answer += ' ما بخترع أسباب غير موجودة في السجلات.';
  return { answer, facts, missing, servicesCount: services.length };
}

export function siteStatus({ clinicInfo, clinicId, services = [], blog = [] }) {
  const info = clinicInfo || {};
  const url = clinicId && typeof window !== 'undefined' ? `${window.location.origin}/book/${clinicId}` : clinicId ? `/book/${clinicId}` : '';
  const checks = [
    { id: 'name', ok: !!info.name, label: 'اسم العيادة' },
    { id: 'theme', ok: !!info.storeTheme, label: 'ثيم الواجهة' },
    { id: 'hero', ok: !!(info.heroTitle || info.storeDescription), label: 'نص الواجهة' },
    { id: 'wa', ok: !!info.whatsapp, label: 'واتساب ظاهر' },
    { id: 'seoT', ok: !!info.seoTitle, label: 'عنوان SEO' },
    { id: 'seoD', ok: !!info.seoDescription, label: 'وصف SEO' },
    { id: 'logo', ok: !!info.logoUrl, label: 'شعار' },
  ];
  const thinServices = (services || []).filter((s) => !s.description || !s.price);
  return {
    url,
    theme: info.storeTheme || 'غير محدد',
    published: !!info.name,
    domainNote: 'الرابط الحالي مسار نورا `/book/{معرّف}` — لا دومين مخصص مخزّن بعد.',
    checks,
    ready: checks.filter((c) => c.ok).length,
    total: checks.length,
    services: (services || []).map((s) => ({
      id: s.id,
      name: s.title || s.name,
      price: s.price,
      hasDesc: !!s.description,
      duration: s.duration,
    })),
    thinServices,
    blogCount: (blog || []).length,
    showBlog: info.showBlog !== false,
    showServices: info.showServices !== false,
  };
}
