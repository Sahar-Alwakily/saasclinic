import { upcomingGaps, reminderDue, mergeAptSettings, noShowRisk } from './appointmentOps';

export const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

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
      title: `${tasks.pending.length} حجز تحتاج تأكيد العميلة`,
      detail: 'العميلة لم تؤكد الحضور بعد — أرسلي تذكيراً اليوم.',
      to: '/appointments',
    });
  }
  if (tasks.gaps.length) {
    list.push({
      id: 'gaps',
      tone: 'azure',
      title: `${tasks.gaps.length} موعد متاح اليوم`,
      detail: 'فترات لم تُحجز — يمكن عرضها على قائمة الانتظار.',
      to: '/appointments/gaps',
    });
  }
  const waiting = (waitlist || []).filter((w) => w.status === 'waiting' || w.status === 'offered');
  if (waiting.length && tasks.gaps.length) {
    list.push({
      id: 'wait',
      tone: 'mint',
      title: `${waiting.length} بالطابور مقابل مواعيد متاحة اليوم`,
      detail: 'أول عميلة تقبل العرض تسكر الساعة.',
      to: '/appointments/waitlist',
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
      to: '/appointments/reminders',
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
      title: `${highRisk.length} موعد باحتمال غياب بدون إشعار`,
      detail: 'الدرجة مبنية على سجل الهاتف عند توفر 5+ مواعيد مكتملة.',
      to: '/appointments/reminders',
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

export function hourFromTime(t) {
  const s = String(t || '');
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const pm = /م|pm/i.test(s);
  const am = /ص|am/i.test(s);
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h < 0 || h > 23) return null;
  return h;
}

function occupiesSlot(apt) {
  return apt && !['cancelled'].includes(apt.status);
}

export function occupancyInsights({ appointments = [], schedules = {}, branches = [] }, now = new Date()) {
  const since = new Date(now);
  since.setDate(since.getDate() - 60);
  const sinceYmd = toYmd(since);
  const untilYmd = toYmd(now);
  const sample = (appointments || []).filter((a) => occupiesSlot(a) && inDateRange(a.date, sinceYmd, untilYmd));

  const byDay = DAY_NAMES.map((name, i) => ({ i, name, count: 0 }));
  const byHourMap = {};
  sample.forEach((a) => {
    const d = new Date(`${a.date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) byDay[d.getDay()].count += 1;
    const h = hourFromTime(a.time);
    if (h != null) byHourMap[h] = (byHourMap[h] || 0) + 1;
  });
  const hours = Object.keys(byHourMap).map(Number).sort((a, b) => a - b);
  const hourMin = hours.length ? hours[0] : 9;
  const hourMax = hours.length ? hours[hours.length - 1] : 17;
  const byHour = [];
  for (let h = Math.min(hourMin, 9); h <= Math.max(hourMax, 17); h += 1) {
    byHour.push({ hour: h, label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'ص' : 'م'}`, count: byHourMap[h] || 0 });
  }

  const peakDay = [...byDay].sort((a, b) => b.count - a.count)[0];
  const quietDay = [...byDay].filter((d) => d.count > 0).sort((a, b) => a.count - b.count)[0] || [...byDay].sort((a, b) => a.count - b.count)[0];
  const peakHour = [...byHour].sort((a, b) => b.count - a.count)[0];
  const quietHour = [...byHour].filter((h) => h.count > 0).sort((a, b) => a.count - b.count)[0];

  const today = toYmd(now);
  const todayBooked = (appointments || []).filter((a) => a.date === today && occupiesSlot(a) && a.status !== 'noshow').length;
  const gapsToday = upcomingGaps({ schedules, appointments, branches, dateStr: today });
  const todaySlots = todayBooked + gapsToday.length;
  const todayFill = todaySlots ? Math.round((todayBooked / todaySlots) * 100) : null;

  const lookahead = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = toYmd(d);
    const booked = (appointments || []).filter((a) => a.date === dateStr && ['pending', 'confirmed'].includes(a.status)).length;
    const gaps = upcomingGaps({ schedules, appointments, branches, dateStr });
    const cap = booked + gaps.length;
    lookahead.push({
      date: dateStr,
      name: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : DAY_NAMES[d.getDay()],
      booked,
      gaps: gaps.length,
      cap,
      fill: cap ? Math.round((booked / cap) * 100) : null,
    });
  }

  const mix = {};
  sample.forEach((a) => {
    const k = a.service || 'غير مسمّاة';
    mix[k] = (mix[k] || 0) + 1;
  });
  const services = Object.entries(mix).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

  const agenda = (appointments || [])
    .filter((a) => a.date === today && ['pending', 'confirmed'].includes(a.status))
    .map((a) => ({ ...a, hour: hourFromTime(a.time) }))
    .sort((a, b) => (a.hour ?? 99) - (b.hour ?? 99) || String(a.time).localeCompare(String(b.time)));

  const tips = [];
  if (sample.length >= 5 && peakDay?.count) {
    tips.push(`${peakDay.name} أعلى يوم حجزاً في آخر 60 يوماً (${peakDay.count}) — لا تخفّضي الدوام فيه دون مراجعة.`);
  }
  if (sample.length >= 5 && quietDay && quietDay.count < (peakDay?.count || 0)) {
    tips.push(`${quietDay.name} الأهدأ (${quietDay.count}) — أنسب لعرض المواعيد المتاحة على قائمة الانتظار أو لحملة عودة.`);
  }
  if (peakHour?.count) {
    tips.push(`ساعة ${peakHour.label} الأكثر ازدحاماً (${peakHour.count} حجز) — ثبّتي تأكيداً مبكراً قبلها.`);
  }
  if (todayFill != null) {
    tips.push(`امتلاء جدول اليوم ${todayFill}% (${todayBooked} محجوز / ${gapsToday.length} شاغر).`);
  }
  if (sample.length < 8) {
    tips.push('الازدحام تقريبي: العيّنة أقل من 8 حجوزات في 60 يوماً.');
  }

  return {
    sample: sample.length,
    byDay,
    byHour,
    peakDay,
    quietDay,
    peakHour,
    quietHour,
    todayFill,
    todayBooked,
    gapsToday: gapsToday.length,
    lookahead,
    services,
    agenda,
    tips,
  };
}

function foldAr(s) {
  return String(s || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[؟?!.,،]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(question, forced) {
  if (forced) return forced;
  const n = foldAr(question);
  const book = n.includes('حجز') || n.includes('موعد');
  if ((n.includes('انخفض') || n.includes('ليش') || n.includes('لماذا') || n.includes('سبب')) && book) return 'drop';
  if (n.includes('ازدحام') || n.includes('ساعه') || n.includes('ساعات') || n.includes('ايام') || n.includes('امتلاء')) return 'crowd';
  if (n.includes('ايراد') || n.includes('دخل') || n.includes('فلوس') || (n.includes('مقارن') && n.includes('شهر'))) return 'rev';
  if (n.includes('حضور') || n.includes('غياب') || n.includes('غاب')) return 'attend';
  if (n.includes('شاغر') || n.includes('فراغ') || n.includes('انتظار')) return 'gap';
  if (n.includes('تدخل') || n.includes('اليوم')) return 'today';
  if (book) return 'book';
  return 'generic';
}

function factLine(health) {
  const curr = health?.curr || {};
  const prev = health?.prev || {};
  const windows = health?.windows || {};
  const deltas = health?.deltas || {};
  return [
    `الفترة الحالية ${windows.thisStart || '—'} → ${windows.thisEnd || '—'}: ${curr.total || 0} حجز، حضور ${curr.attendRate == null ? 'غير محسوب' : `${curr.attendRate}%`} (حضر ${curr.attended || 0} / غاب ${curr.noshow || 0})، إلغاء ${curr.cancelled || 0}.`,
    `نفس عدد الأيام من الشهر السابق ${windows.prevStart || '—'} → ${windows.prevEnd || '—'}: ${prev.total || 0} حجز، حضور ${prev.attendRate == null ? 'غير محسوب' : `${prev.attendRate}%`}.`,
    deltas.book == null ? 'لا يمكن حساب نسبة تغيّر الحجوزات لأن الفترة السابقة صفر.' : `تغيّر الحجوزات: ${deltas.book > 0 ? '+' : ''}${deltas.book}%.`,
  ];
}

export function answerFromData(question, { health, tasks, appointments = [], services = [], waitlist = [], occupancy, intent } = {}) {
  const q = String(question || '').trim();
  if (!q && !intent) {
    return { answer: 'اكتبي سؤالاً عن الحجوزات أو الحضور أو المواعيد المتاحة.', facts: [], missing: [] };
  }
  const curr = health?.curr || {};
  const prev = health?.prev || {};
  const deltas = health?.deltas || {};
  const windows = health?.windows || {};
  const t = {
    pending: tasks?.pending || [],
    gaps: tasks?.gaps || [],
    followups: tasks?.followups || [],
    failed: tasks?.failed || [],
    noshowToday: tasks?.noshowToday || [],
  };
  const facts = factLine(health || {});
  const missing = [];
  if (!appointments.length) missing.push('لا توجد مواعيد مخزّنة بعد.');
  const attendSample = (curr.attended || 0) + (curr.noshow || 0);
  if (attendSample < 5) missing.push('عيّنة الحضور هذا الشهر أقل من 5 مواعيد مكتملة — لا استنتاج عن سبب الغياب.');

  const kind = detectIntent(q, intent);
  let answer = '';

  if (kind === 'drop') {
    if (deltas.book == null) {
      answer = 'لا أستطيع تفسير انخفاض الحجوزات: الفترة السابقة لا تحتوي حجوزات كافية للمقارنة.';
    } else if (deltas.book >= 0) {
      answer = `لا انخفاض: ${curr.total || 0} مقابل ${prev.total || 0} (${deltas.book > 0 ? '+' : ''}${deltas.book}%).`;
    } else {
      answer = `الحجوزات أقل ${Math.abs(deltas.book)}% (${prev.total || 0} → ${curr.total || 0}).`;
      const hot = {};
      (appointments || []).filter((a) => a.status === 'cancelled' && inDateRange(a.date, windows.thisStart, windows.thisEnd))
        .forEach((a) => { hot[a.service || '—'] = (hot[a.service || '—'] || 0) + 1; });
      const top = Object.entries(hot).sort((a, b) => b[1] - a[1])[0];
      if (top) answer += ` الإلغاءات هذا الشهر أعلى خدمة مسجّلة: ${top[0]} (${top[1]}).`;
    }
  } else if (kind === 'attend') {
    answer = curr.attendRate == null
      ? 'لا نسبة حضور هذا الشهر لأن لا مواعيد بحالة حضر/لم يحضر.'
      : `نسبة الحضور (حضر ÷ حضر+غاب) هذا الشهر ${curr.attendRate}% مقابل ${prev.attendRate == null ? 'غير متاحة' : `${prev.attendRate}%`} في الفترة المقارنة.`;
  } else if (kind === 'rev') {
    answer = 'أسعار الجلسات لا تُحتسب إيراداً. المبلغ يظهر فقط على المنتجات وطلبات المتجر.';
  } else if (kind === 'crowd') {
    const pd = occupancy?.peakDay;
    const ph = occupancy?.peakHour;
    const qd = occupancy?.quietDay;
    answer = occupancy?.sample
      ? `الذروة: ${pd?.name || '—'} / ${ph?.label || '—'} (${occupancy.sample} حجز). الأهدأ ${qd?.name || '—'}. امتلاء اليوم ${occupancy.todayFill == null ? '—' : `${occupancy.todayFill}%`}.`
      : 'لا حجوزات كافية في آخر 60 يوماً لحساب الازدحام.';
  } else if (kind === 'gap') {
    answer = `مواعيد متاحة اليوم: ${t.gaps.length}. بالطابور: ${(waitlist || []).filter((w) => w.status === 'waiting' || w.status === 'offered').length}.`;
  } else if (kind === 'today') {
    answer = `يحتاج تدخلاً اليوم: ${t.pending.length} بحاجة لتأكيد العميلة، ${t.gaps.length} موعد متاح، ${t.followups.length} تذكير، ${t.failed.length} رسالة فاشلة، ${t.noshowToday.length} غياب اليوم بلا متابعة.`;
  } else if (kind === 'book') {
    answer = `حجوزات الفترة الحالية ${curr.total || 0} (مؤكد ${curr.confirmed || 0}، معلّق ${curr.pending || 0}، ملغي ${curr.cancelled || 0}).`;
  } else {
    answer = `حجوزات ${curr.total || 0} · حضور ${curr.attendRate == null ? '—' : `${curr.attendRate}%`}.`;
  }

  return { answer, facts, missing, servicesCount: (services || []).length, intent: kind };
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
  const thinServices = (services || []).filter((s) => !s.description);
  return {
    url,
    theme: info.storeTheme || 'غير محدد',
    published: info.websitePublished !== false && !!info.name,
    domainNote: 'الرابط الحالي مسار وَرَفَ | WARAFA `/book/{معرّف}` — لا دومين مخصص مخزّن بعد.',
    checks,
    ready: checks.filter((c) => c.ok).length,
    total: checks.length,
    services: (services || []).map((s) => ({
      id: s.id,
      name: s.title || s.name,
      hasDesc: !!s.description,
      duration: s.duration,
    })),
    thinServices,
    blogCount: (blog || []).length,
    showBlog: info.showBlog !== false,
    showProducts: info.showProducts !== false,
    showServices: info.showServices !== false,
  };
}
