import {
  clinicHealth, dailyTasks, interventionAlerts, occupancyInsights, siteStatus,
  inDateRange,
} from './clinicInsights';

export const CONSOLE_PAGES = [
  { path: '/dashboard', label: 'الرئيسية', about: 'ملخص الأرقام والتنبيهات ومساعد الأرقام' },
  { path: '/appointments', label: 'الحجوزات', about: 'تقويم أسبوعي، تأكيد، إلغاء، إعادة جدولة، حضور وغياب' },
  { path: '/appointments/waitlist', label: 'قائمة الانتظار', about: 'طابور العميلات وعروض أول من يقبل', cap: 'ops' },
  { path: '/appointments/gaps', label: 'المواعيد المتاحة', about: 'ساعات الجدول الفارغة والمواعيد المفتوحة بعد إلغاء', cap: 'ops' },
  { path: '/appointments/reminders', label: 'التذكيرات والقواعد', about: 'تذكيرات مستحقة، قواعد العيادة، وقوالب واتساب الخمسة', cap: 'ops' },
  { path: '/appointments/attendance', label: 'الحضور', about: 'حضور العميلات للعلاج وحضور العاملات للشغل' },
  { path: '/appointments/schedule', label: 'دوام الموظفين', about: 'أيام وساعات عمل كل موظفة حسب الفرع' },
  { path: '/customers', label: 'العميلات', about: 'الملفات الطبية، الجلسات، التوقيع' },
  { path: '/treatments', label: 'متابعة العلاجات', about: 'مراحل أثناء/بعد العلاج وتعليمات الخدمات', cap: 'treatments' },
  { path: '/services', label: 'الخدمات', about: 'جلسات العيادة: الاسم والمدة والمختصة' },
  { path: '/products', label: 'المنتجات', about: 'كتالوج المتجر وطلبيات العميلات' },
  { path: '/website', label: 'موقع العيادة', about: 'معلومات الصفحة والمدونة وإظهارها أو إخفاؤها' },
  { path: '/assistant', label: 'المساعد الذكي', about: 'شات الكونسول ووارد واتساب المسجّل', cap: 'assistant' },
  { path: '/winback', label: 'استرجاع العميلات', about: 'حملات العودة وحد التواصل', cap: 'winback' },
  { path: '/marketing', label: 'التسويق', about: 'حملات، كوبونات', cap: 'marketing' },
  { path: '/website?tab=blog', label: 'المدونة', about: 'مقالات الموقع وإظهارها أو إخفاؤها' },
  { path: '/products?tab=orders', label: 'طلبيات المنتجات', about: 'طلبات متجر المنتجات' },
      { path: '/reports', label: 'التقارير', about: 'حضور وحجوزات من السجل' },
  { path: '/staff', label: 'الموظفات', about: 'حسابات الفريق' },
  { path: '/branches', label: 'الفروع والجداول', about: 'الفروع وساعات الدوام' },
  { path: '/billing', label: 'الاشتراك', about: 'تفعيل الباقة يدوياً' },
  { path: '/settings', label: 'الإعدادات', about: 'بيانات العيادة، الخصوصية، مفتاح Gemini' },
];

function slimApts(list) {
  return (list || []).slice(0, 20).map((a) => ({
    date: a.date || '',
    time: a.time || '',
    status: a.status || '',
    service: a.service || a.serviceName || '',
  }));
}

export function buildConsoleBrief({
  pathname,
  clinicInfo,
  clinicId,
  plan,
  hasCap = () => false,
  appointments = [],
  customers = [],
  services = [],
  schedules = {},
  branches = [],
  waitlist = [],
  messages = [],
  blog = [],
  settings,
}) {
  const health = clinicHealth({ appointments, customers });
  const tasks = dailyTasks({ appointments, schedules, branches, messages, settings });
  const occupancy = occupancyInsights({ appointments, schedules, branches });
  const alerts = interventionAlerts({ appointments, customers, waitlist, tasks, health });
  const site = siteStatus({ clinicInfo, clinicId, services, blog });
  const pages = CONSOLE_PAGES.filter((p) => !p.cap || hasCap(p.cap));
  const waiting = (waitlist || []).filter((w) => w.status === 'waiting' || w.status === 'offered').length;

  const facts = {
    شاشة: pathname,
    عيادة: clinicInfo?.name || 'بدون اسم',
    باقة: plan?.id || 'trial',
    حجوزات_هذا_الشهر: health.curr,
    حجوزات_الشهر_الماضي_نفس_الأيام: health.prev,
    نسب_التغيّر: health.deltas,
    مهام_اليوم: {
      تأكيد_معلّق: tasks.pending.length,
      مواعيد_شاغرة: tasks.gaps.length,
      تذكيرات: tasks.followups.length,
      غياب_بلا_متابعة: tasks.noshowToday.length,
      رسائل_فاشلة: tasks.failed.length,
      انتظار: waiting,
    },
    ازدحام: {
      عيّنة_60_يوم: occupancy.sample,
      يوم_الذروة: occupancy.peakDay,
      ساعة_الذروة: occupancy.peakHour,
      امتلاء_اليوم: occupancy.todayFill,
    },
    تنبيهات: alerts.map((a) => ({ عنوان: a.title, تفصيل: a.detail, شاشة: a.to })),
    موقع: {
      جاهز: `${site.ready}/${site.total}`,
      رابط: site.url,
      نواقص: site.checks.filter((c) => !c.ok).map((c) => c.label),
    },
    عدد_العميلات: customers.length,
    عدد_الخدمات: services.length,
    شاشات_مفتوحة_بالباقة: pages.map((p) => `${p.path} — ${p.label}: ${p.about}`),
    آخر_مواعيد: slimApts(
      [...appointments].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20),
    ),
  };

  const cancelHot = {};
  const w = health.windows || {};
  (appointments || []).forEach((a) => {
    if (a.status === 'cancelled' && inDateRange(a.date, w.thisStart, w.thisEnd)) {
      const k = a.service || a.serviceName || '—';
      cancelHot[k] = (cancelHot[k] || 0) + 1;
    }
  });
  const topCancel = Object.entries(cancelHot).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    health,
    tasks,
    occupancy,
    alerts,
    site,
    pages,
    waiting,
    planId: plan?.id,
    topCancel,
    occupancyTips: occupancy.tips || [],
    text: JSON.stringify(facts, null, 0).slice(0, 12000),
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

function topic(question) {
  const n = foldAr(question);
  if (!n || /^(مرحبا|اهلا|اهلين|سلام|هاي|هلو|hello|hi|صباح الخير|مساء الخير)$/.test(n) || (n.length <= 12 && (n.includes('مرحبا') || n.includes('اهلين')))) return 'hi';
  if (n.includes('زباين') || n.includes('زبائن') || n.includes('اجيب') || n.includes('جيب') || n.includes('عملاء') || n.includes('عميلات جدد') || n.includes('تسويق') || n.includes('ازيد حجز') || n.includes('اكثر حجز')) return 'acquire';
  const book = n.includes('حجز') || n.includes('موعد');
  if (n.includes('املا') || n.includes('شاغر') || n.includes('فراغ') || n.includes('انتظار') || n.includes('طابور')) return 'fill';
  if ((n.includes('انخفض') || n.includes('ليش') || n.includes('لماذا') || n.includes('سبب')) && book) return 'drop';
  if (n.includes('ازدحام') || n.includes('ساعه') || n.includes('ساعات') || n.includes('ايام') || n.includes('امتلاء')) return 'crowd';
  if (n.includes('ايراد') || n.includes('دخل') || n.includes('فلوس') || (n.includes('مقارن') && n.includes('شهر'))) return 'rev';
  if (n.includes('تأكيد') || n.includes('تاكيد') || n.includes('معلق') || n.includes('معلّق')) return 'confirm';
  if (n.includes('غياب') || n.includes('غاب') || n.includes('حضور')) return 'attend';
  if (n.includes('استرجاع') || n.includes('عوده') || n.includes('عودة') || n.includes('انقطعت')) return 'winback';
  if (n.includes('موقع') || n.includes('صفحه') || n.includes('حجز عام') || n.includes('ثيم')) return 'site';
  if (n.includes('تدخل') || n.includes('اليوم') || n.includes('شغل اليوم')) return 'today';
  if (book) return 'book';
  const pageHit = CONSOLE_PAGES.find((p) => n.includes(foldAr(p.label)));
  if (pageHit) return 'page';
  return 'chat';
}

function uniqueLinks(list) {
  return (list || []).filter((x, i, arr) => x?.path && arr.findIndex((y) => y.path === x.path) === i).slice(0, 6);
}

function hasPage(brief, path) {
  return (brief.pages || []).some((p) => p.path === path);
}

export function spokenLocal(brief, question = '') {
  const t = brief.tasks || { pending: [], gaps: [], followups: [], failed: [], noshowToday: [] };
  const waiting = brief.waiting || 0;
  const site = brief.site || {};
  const kind = topic(question);

  if (kind === 'hi') {
    return {
      answer: 'أهلين. شو بدك: تأكيد حجوزات، ملء الفراغ، ولا كيف تجيبي زباين من اللي عندكِ بالكونسول؟',
      links: [],
    };
  }

  if (kind === 'acquire') {
    const missing = (site.checks || []).filter((c) => !c.ok).map((c) => c.label);
    const lines = [
      'من الكونسول الزباين بيجوا من ثلاث شغل مش من إعلان برا السجل:',
      waiting && t.gaps?.length
        ? `1) عندكِ ${t.gaps.length} شاغر و${waiting} بالطابور — اعرضي أول من يقبل من التشغيل، هاد زبونة جاهزة مش جديدة من الشارع.`
        : t.gaps?.length
          ? `1) ${t.gaps.length} شاغر بلا طابور — سجّلي أسماء بالانتظار حتى ينملوا.`
          : '1) اليوم ما في شاغر محسوب؛ الزباين الجدد بينحجزوا من رابط الصفحة العامة.',
      hasPage(brief, '/winback')
        ? '2) الاسترجاع: عميلات بلا زيارة 90 يوماً — هاد رجوع مش جمهور جديد.'
        : '2) الاسترجاع مقفل على الباقة — رجوع العميلات من الفوترة إذا فتحتيه.',
      site.url
        ? `3) رابط الحجز العام: ${site.url}${missing.length ? ` — ناقص بالصفحة: ${missing.join('، ')}.` : ' — كمّلي الواتساب والوصف إذا ناقصين حتى يسهل الحجز.'}`
        : '3) افتحي موقع العيادة وقدّمي طلب تصميم حتى يصير رابط الحجز جاهز.',
    ];
    const links = [
      { path: '/ops', label: 'التشغيل' },
      { path: '/website', label: 'صفحة الحجز' },
    ];
    if (hasPage(brief, '/winback')) links.push({ path: '/winback', label: 'الاسترجاع' });
    return { answer: lines.join('\n'), links: uniqueLinks(links) };
  }

  if (kind === 'chat') {
    return {
      answer: 'ما فهمت المطلوب بالضبط. احكي بجملة: كيف أجيب زباين، أم أأكد الحجوزات، أم أملأ الفراغ؟',
      links: [],
    };
  }

  const bits = [];
  const links = [];
  if (kind === 'today' || kind === 'fill' || kind === 'confirm') {
    if (t.pending?.length) { bits.push(`${t.pending.length} معلّق — أكّديهم من الحجوزات`); links.push({ path: '/appointments', label: 'الحجوزات' }); }
    if (t.gaps?.length && waiting) { bits.push(`${t.gaps.length} شاغر مقابل ${waiting} بالطابور — أول من يقبل من التشغيل`); links.push({ path: '/ops', label: 'التشغيل' }); }
    else if (t.gaps?.length) { bits.push(`${t.gaps.length} شاغر والطابور فاضي`); links.push({ path: '/ops', label: 'التشغيل' }); }
    if (t.failed?.length) { bits.push(`${t.failed.length} رسالة فشلت`); links.push({ path: '/winback', label: 'الاسترجاع' }); }
  }
  if (kind === 'winback') {
    bits.push(hasPage(brief, '/winback') ? 'الاسترجاع للي انقطعوا 90 يوماً من الملف.' : 'الاسترجاع مقفل على الباقة.');
    links.push({ path: hasPage(brief, '/winback') ? '/winback' : '/billing', label: hasPage(brief, '/winback') ? 'الاسترجاع' : 'الباقات' });
  }
  if (kind === 'site') {
    const missing = (site.checks || []).filter((c) => !c.ok).map((c) => c.label);
    bits.push(missing.length ? `ناقص بالصفحة: ${missing.join('، ')}` : 'صفحة الحجز مكتملة بالسجل.');
    if (site.url) bits.push(site.url);
    links.push({ path: '/website', label: 'الموقع' });
  }
  if (!bits.length) {
    const local = localConsoleAnswer(question, brief);
    return { answer: local.answer, links: local.links };
  }
  return { answer: bits.join('\n'), links: uniqueLinks(links) };
}

export function localConsoleAnswer(question, brief) {
  const t = brief.tasks || { pending: [], gaps: [], followups: [], failed: [], noshowToday: [] };
  const health = brief.health || {};
  const occ = brief.occupancy || {};
  const site = brief.site || {};
  const waiting = brief.waiting || 0;
  const curr = health.curr || {};
  const prev = health.prev || {};
  const d = health.deltas || {};
  const kind = topic(question);
  const lines = [];
  const links = [];

  if (kind === 'today') {
    if (t.pending.length) { lines.push(`معلّق ${t.pending.length} → الحجوزات → تأكيد`); links.push({ path: '/appointments', label: 'تأكيد' }); }
    if (t.gaps.length && waiting) { lines.push(`شاغر ${t.gaps.length} / انتظار ${waiting} → تشغيل → أول من يقبل`); links.push({ path: '/ops', label: 'عرض' }); }
    else if (t.gaps.length) { lines.push(`شاغر ${t.gaps.length} / انتظار ${waiting} → أضيفي للطابور`); links.push({ path: '/ops', label: 'شاغر' }); }
    else if (waiting) { lines.push(`انتظار ${waiting} بلا شاغر اليوم`); links.push({ path: '/ops', label: 'انتظار' }); }
    if (t.followups.length) { lines.push(`تذكير ${t.followups.length} → تشغيل`); links.push({ path: '/ops', label: 'تذكير' }); }
    if (t.noshowToday.length) { lines.push(`غياب ${t.noshowToday.length} → تشغيل`); links.push({ path: '/ops', label: 'غياب' }); }
    if (t.failed.length) { lines.push(`فشل إرسال ${t.failed.length} → استرجاع`); links.push({ path: '/winback', label: 'فشل' }); }
    if (!lines.length) { lines.push('لا بند اليوم'); links.push({ path: '/appointments', label: 'تقويم' }); }
  } else if (kind === 'fill') {
    if (t.gaps.length && waiting) lines.push(`شاغر ${t.gaps.length} · انتظار ${waiting} → أول من يقبل`);
    else if (t.gaps.length) lines.push(`شاغر ${t.gaps.length} · انتظار فاضي → أضيفي اسم`);
    else lines.push('لا شاغر محسوب اليوم');
    links.push({ path: '/ops', label: 'تشغيل' });
  } else if (kind === 'drop') {
    if (d.book == null) lines.push(`${curr.total || 0} حجز. لا مقارنة.`);
    else lines.push(`${curr.total || 0} مقابل ${prev.total || 0} (${d.book > 0 ? '+' : ''}${d.book}%)`);
    if (d.book < 0 && brief.topCancel) lines.push(`إلغاء أعلى: ${brief.topCancel[0]} (${brief.topCancel[1]})`);
    if (t.pending.length) lines.push(`أكّدي ${t.pending.length} معلّق`);
    if (t.gaps.length) lines.push(`املئي ${t.gaps.length} شاغر`);
    links.push({ path: '/appointments', label: 'حجوزات' });
  } else if (kind === 'crowd') {
    lines.push(occ.sample
      ? `${occ.peakDay?.name || '—'} / ${occ.peakHour?.label || '—'} · الأهدأ ${occ.quietDay?.name || '—'}`
      : 'عيّنة الازدحام ناقصة');
    links.push({ path: '/appointments', label: 'تقويم' });
  } else if (kind === 'rev') {
    lines.push('المبالغ على المنتجات وطلبات المتجر فقط، مو على الجلسات');
    links.push({ path: '/products?tab=orders', label: 'طلبات' }, { path: '/products', label: 'منتجات' });
  } else if (kind === 'confirm') {
    lines.push(t.pending.length ? `${t.pending.length} معلّق → جدول → تأكيد` : 'لا معلّق');
    links.push({ path: '/appointments', label: 'تأكيد' });
  } else if (kind === 'attend') {
    lines.push(curr.attendRate == null ? 'لا حضور مكتمل' : `حضور ${curr.attendRate}%`);
    if (t.noshowToday.length) lines.push(`غياب اليوم ${t.noshowToday.length}`);
    links.push({ path: '/appointments', label: 'حضور' });
  } else if (kind === 'winback') {
    if (!hasPage(brief, '/winback')) { lines.push('الاسترجاع مقفل على الباقة'); links.push({ path: '/billing', label: 'باقات' }); }
    else { lines.push('انقطاع 90 يوماً → استرجاع'); links.push({ path: '/winback', label: 'استرجاع' }); }
  } else if (kind === 'site') {
    const missing = (site.checks || []).filter((c) => !c.ok).map((c) => c.label);
    lines.push(missing.length ? `ناقص: ${missing.join('، ')}` : 'الصفحة مكتملة');
    links.push({ path: '/website', label: 'موقع' });
  } else if (kind === 'book') {
    lines.push(`حجز ${curr.total || 0} · مؤكد ${curr.confirmed || 0} · معلّق ${curr.pending || 0} · ملغي ${curr.cancelled || 0}`);
    links.push({ path: '/appointments', label: 'تقويم' });
  } else if (kind === 'page') {
    const n = foldAr(question);
    const hit = (brief.pages || []).find((p) => n.includes(foldAr(p.label))) || brief.pages?.[0];
    if (hit) { lines.push(hit.label); links.push({ path: hit.path, label: hit.label }); }
  } else {
    (brief.alerts || []).slice(0, 3).forEach((a) => {
      lines.push(a.title);
      links.push({ path: a.to, label: a.title });
    });
    if (!lines.length) lines.push(`حجز ${curr.total || 0}`);
  }

  return { answer: lines.join('\n'), links: uniqueLinks(links), kind };
}
