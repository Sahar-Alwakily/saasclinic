import { foldAr, spokenDay } from './consoleBrief';

const POLICY_FIELDS = [
  ['خصوص', 'privacy', 'الخصوصية'],
  ['استرجاع', 'refund', 'الاسترجاع'],
  ['حجز', 'booking', 'الحجوزات'],
  ['عربون', 'deposit', 'العربون'],
];

export function ownerKind(question) {
  const n = foldAr(question);
  if (!n) return null;
  if (/(?:احذف|امسح)/.test(n) && /خدم|فرع|موظف|جلس|علاج/.test(n)) return 'pageDelete';
  if (/سياسه/.test(n) || /خصوص|عربون/.test(n)) return 'policyRead';
  if (/مين/.test(n) && /جاي|جايه|عندي|اليوم|بكرا|بكره|يوم|حجز|موعد|دور|جدول|اسماء/.test(n)) return 'who';
  if (/اقرب موعد|اقرب حجز/.test(n)) return 'nextVisit';
  if (/يوم فاضي|ايام فاضيه|وين فاضي|اي يوم فاضي/.test(n)) return 'quiet';
  if (/الاسبوع/.test(n) && /حجز|موعد|كيف|وضع|فاض|شغل/.test(n)) return 'weekScan';
  if (findPlace(n) && (/وين|كيف اوصل|من وين|بروح|بفتح|الاقي|مكان/.test(n) || /قوالب|قالب/.test(n)) && !/بكرا|بكره|اليوم|كم|عدد|فيه|جاي/.test(n)) return 'where';
  if (/كم عميل|عدد العميل|بلا جلس|بدون جلس|ما عندها جلس|ما الهم جلس/.test(n)) return 'roster';
  if (/شو الخدمات|الخدمات|كم خدمه|اسماء الخدمات/.test(n)) return 'setup';
  if (/الفروع|كم فرع|شو الفروع|اي الفروع/.test(n)) return 'setup';
  if (/شو بتقدر|شو بتعرف|ساعديني|كيف اضيف|كيف الغي|كيف ادور|شو اسال/.test(n)) return 'guide';
  if (/شو الوضع|كيف العياده|اخبار|شو الاخبار|لازم اعمل|اولويه|شو الشغل/.test(n)) return 'pulse';
  if (/اكثر خدمه|الخدمه الاكثر|انشط خدمه/.test(n)) return 'busyService';
  if (/منتج|اسعار/.test(n) && !/طلب/.test(n)) return 'shop';
  if (/مبيعات|قديش بعت|كم بعت/.test(n)) return 'shop';
  return null;
}

const PLACES = [
  { keys: ['قوالب الواتس', 'قوالب واتس', 'قالب واتس', 'قالب تذكير', 'قوالب تذكير', 'قوالب الرسائل'], path: '/appointments/reminders', label: 'التذكيرات', trail: 'المواعيد ← التذكيرات والقواعد', note: 'القوالب آخر الصفحة، عنوانها «قوالب تذكير واتساب»، تحت قواعد العيادة.' },
  { keys: ['ربط الواتس', 'اربط الواتس', 'رقم الواتس', 'توصيل واتس', 'اعدادات الواتس'], path: '/settings?tab=whatsapp', label: 'واتساب', trail: 'الإعدادات ← واتساب', note: 'هون الربط والرقم. نصوص القوالب مو هون.' },
  { keys: ['واتس', 'واتساب'], path: '/settings?tab=whatsapp', label: 'واتساب', trail: 'الإعدادات ← واتساب', note: 'هون الربط والرقم. إذا قصدك نصوص الرسائل: المواعيد ← التذكيرات والقواعد، آخر الصفحة.' },
  { keys: ['قائمة الانتظار', 'طابور الانتظار'], path: '/appointments/waitlist', label: 'الانتظار', trail: 'المواعيد ← قائمة الانتظار', note: '' },
  { keys: ['المواعيد المتاحه', 'الساعات الفاضي'], path: '/appointments/gaps', label: 'المتاح', trail: 'المواعيد ← المواعيد المتاحة', note: '' },
  { keys: ['دوام الموظف', 'جدول الدوام'], path: '/appointments/schedule', label: 'الدوام', trail: 'الفريق والفروع ← دوام الموظفين', note: '' },
  { keys: ['حضور الموظفات', 'حضور العاملات'], path: '/appointments/attendance', label: 'الحضور', trail: 'المواعيد ← الحضور', note: '' },
  { keys: ['سياسات الموقع', 'سياسه الموقع'], path: '/website?tab=policies', label: 'السياسات', trail: 'موقع العيادة ← السياسات', note: '' },
  { keys: ['المدونه', 'المقالات'], path: '/website?tab=blog', label: 'المدونة', trail: 'موقع العيادة ← المدونة', note: '' },
  { keys: ['طلبيات', 'طلبات المنتجات'], path: '/products?tab=orders', label: 'الطلبيات', trail: 'المنتجات ← الطلبيات', note: '' },
  { keys: ['التقارير', 'تقرير'], path: '/reports', label: 'التقارير', trail: 'التقارير', note: 'من مجموعة الإعدادات بالقائمة.' },
  { keys: ['الموظفات', 'الفريق'], path: '/staff', label: 'الموظفات', trail: 'الفريق والفروع ← الموظفات', note: '' },
  { keys: ['الفروع'], path: '/branches', label: 'الفروع', trail: 'الفريق والفروع ← الفروع والجداول', note: '' },
  { keys: ['الاشتراك', 'المدفوعات', 'الباقه'], path: '/billing', label: 'المدفوعات', trail: 'المدفوعات', note: '' },
  { keys: ['جيميناي', 'التكاملات'], path: '/settings?tab=integrations', label: 'التكاملات', trail: 'الإعدادات ← التكاملات', note: '' },
  { keys: ['استرجاع العميلات'], path: '/winback', label: 'الاسترجاع', trail: 'استرجاع العميلات', note: '' },
  { keys: ['موقع العياده', 'صفحه الحجز'], path: '/website', label: 'الموقع', trail: 'موقع العيادة ← معلومات الموقع', note: '' },
  { keys: ['الحجوزات', 'التقويم'], path: '/appointments', label: 'الحجوزات', trail: 'المواعيد ← الحجوزات', note: '' },
  { keys: ['العميلات', 'ملفات العميلات'], path: '/customers', label: 'العميلات', trail: 'العميلات ← الملفات', note: '' },
  { keys: ['الخدمات'], path: '/services', label: 'الخدمات', trail: 'الخدمات', note: '' },
  { keys: ['المنتجات', 'الكتالوج'], path: '/products', label: 'المنتجات', trail: 'المنتجات ← الكتالوج', note: '' },
];

function findPlace(n) {
  let best = null;
  PLACES.forEach((place) => {
    place.keys.forEach((key) => {
      const folded = foldAr(key);
      if (n.includes(folded) && (!best || folded.length > best.len)) best = { place, len: folded.length };
    });
  });
  return best?.place || null;
}

function money(orders) {
  const open = (orders || []).filter((row) => row.status !== 'cancelled');
  const sum = open.reduce((total, row) => total + Number(row.total || 0), 0);
  return { open, sum };
}

function visits(brief, question) {
  const target = spokenDay(question, brief);
  const day = target.known ? target.day : brief.todayBookings;
  const label = target.label || 'اليوم';
  const date = day?.date;
  let rows = brief.openAppointments || [];
  if (date) rows = rows.filter((row) => row.date === date);
  else if (label === 'اليوم' && brief.occupancy?.agenda?.length) {
    rows = brief.occupancy.agenda.map((row) => ({
      time: row.time,
      name: row.customerName || row.name || '',
      service: row.service || row.serviceName || '',
    }));
  } else if (!date) {
    const total = day?.total || 0;
    return {
      answer: total ? `${label} في ${total} حجز.` : `${label} ما في حجوزات مفتوحة.`,
      links: [{ path: '/appointments', label: 'التقويم' }],
    };
  }
  rows = [...rows].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (!rows.length) {
    return {
      answer: `${label} ما في حجوزات مفتوحة.`,
      links: [{ path: '/appointments', label: 'التقويم' }],
    };
  }
  const lines = rows.slice(0, 8).map((row) => [row.time, row.name, row.service].filter(Boolean).join(' · '));
  const extra = rows.length > 8 ? `\nو${rows.length - 8} غيرهم.` : '';
  return {
    answer: `${label}:\n${lines.join('\n')}${extra}`,
    links: [{ path: '/appointments', label: 'التقويم' }],
  };
}

export function answerOwner(brief, question) {
  const kind = ownerKind(question);
  if (!kind) return null;
  const calendar = [{ path: '/appointments', label: 'التقويم' }];

  if (kind === 'pageDelete') {
    return {
      answer: 'حذف الخدمة والفرع والموظفة والجلسة والعلاج من الصفحة نفسها. من الشات ينحذف ملف العميلة والمنتج والمقال، وينلغى الطلب أو حجز اليوم.',
      links: [
        { path: '/services', label: 'الخدمات' },
        { path: '/customers', label: 'العميلات' },
      ],
    };
  }

  if (kind === 'policyRead') {
    const n = foldAr(question);
    const hit = POLICY_FIELDS.find((item) => n.includes(item[0]));
    const text = hit ? String(brief.policies?.[hit[1]] || '').trim() : '';
    if (!hit) {
      return { answer: 'السياسات أربع: الخصوصية، الاسترجاع، الحجوزات، والعربون.', links: [{ path: '/website?tab=policies', label: 'السياسات' }] };
    }
    return {
      answer: text ? `${hit[2]}: ${text.slice(0, 280)}` : `${hit[2]} فاضية. اكتبي النص من سياسات الموقع.`,
      links: [{ path: '/website?tab=policies', label: 'السياسات' }],
    };
  }

  if (kind === 'who') return visits(brief, question);

  if (kind === 'nextVisit') {
    const today = brief.todayBookings?.date || '';
    const rows = [...(brief.openAppointments || [])]
      .filter((row) => !today || row.date >= today)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time)));
    const first = rows[0];
    return {
      answer: first
        ? `أقرب حجز ${first.date} الساعة ${first.time || '—'} · ${first.name || 'عميلة'}${first.service ? ` · ${first.service}` : ''}.`
        : 'ما في حجز مفتوح جاي.',
      links: calendar,
    };
  }

  if (kind === 'quiet') {
    const days = brief.upcoming || [];
    const empty = days.filter((day) => !day.total);
    if (!days.length) return { answer: 'الأيام الجاية مو محمّلة.', links: calendar };
    const names = (empty.length ? empty : [...days].sort((a, b) => (a.total || 0) - (b.total || 0)).slice(0, 2))
      .map((day) => day.label)
      .join('، ');
    return {
      answer: empty.length ? `فاضي من الأيام القريبة: ${names}.` : `ما في يوم فاضي. الأخف: ${names}.`,
      links: calendar,
    };
  }

  if (kind === 'weekScan') {
    const days = (brief.upcoming || []).slice(0, 7);
    if (!days.length) return { answer: 'ما في أيام محسوبة هالأسبوع.', links: calendar };
    return {
      answer: days.map((day) => `${day.label} ${day.total || 0}`).join(' · '),
      links: calendar,
    };
  }

  if (kind === 'roster') {
    const people = brief.people || [];
    const n = foldAr(question);
    const empty = people.filter((person) => !(person.sessions || []).length);
    if (/بلا جلس|بدون جلس|ما عندها جلس|ما الهم جلس/.test(n)) {
      return {
        answer: empty.length
          ? `بلا جلسات مختومة: ${empty.slice(0, 8).map((person) => person.name).join('، ')}.`
          : 'كل العميلات عندهن جلسة مختومة.',
        links: [{ path: '/customers', label: 'العميلات' }],
      };
    }
    return {
      answer: `عندك ${people.length} عميلة.`,
      links: [{ path: '/customers', label: 'العميلات' }],
    };
  }

  if (kind === 'setup') {
    const n = foldAr(question);
    if (/فرع/.test(n)) {
      const rows = brief.branchRows || [];
      return {
        answer: rows.length ? `الفروع: ${rows.map((row) => row.name).join('، ')}.` : 'ما في فروع مسجّلة.',
        links: [{ path: '/branches', label: 'الفروع' }],
      };
    }
    const rows = brief.serviceRows || [];
    return {
      answer: rows.length ? `الخدمات: ${rows.map((row) => row.title).filter(Boolean).join('، ')}.` : 'ما في خدمات مسجّلة.',
      links: [{ path: '/services', label: 'الخدمات' }],
    };
  }

  if (kind === 'guide') {
    return {
      answer: [
        'احكي عادي ومن السجل:',
        'مين جاي اليوم، أو يوم الأحد، أو أقرب موعد.',
        'دوري على اسم العميلة، أو رقمها.',
        'اضيفي عميلة الاسم رقم 05…',
        'اضيفي حجز لاسم يوم الأحد الساعة 4 خدمة ليزر.',
        'الغي حجز الاسم، أو الغي الحجوزات يوم الأحد.',
        'عدلي رقمها، سعر المنتج، أو خدمة الحجز.',
        'التقرير، الطلبات، شو الوضع.',
      ].join('\n'),
      links: [{ path: '/dashboard', label: 'الرئيسية' }],
    };
  }

  if (kind === 'pulse') {
    const today = brief.todayBookings || {};
    const tasks = brief.tasks || {};
    const { open, sum } = money(brief.orders);
    const lines = [`اليوم ${today.total || 0} حجز، معلّق ${today.pending || (tasks.pending || []).length}.`];
    if ((tasks.gaps || []).length) lines.push(`فاضي اليوم ${(tasks.gaps || []).length} ساعة.`);
    if (brief.waiting) lines.push(`بالانتظار ${brief.waiting}.`);
    if ((tasks.noshowToday || []).length) lines.push(`غياب اليوم ${tasks.noshowToday.length}.`);
    lines.push(open.length ? `طلبات المتجر المفتوحة ${open.length} بقيمة ${sum} ₪.` : 'ما في طلبات متجر مفتوحة.');
    if (brief.published === false) lines.push('الموقع مخفي.');
    else if (brief.published === true && brief.site?.url) lines.push(`الحجز ظاهر: ${brief.site.url}`);
    (brief.alerts || []).slice(0, 2).forEach((alert) => lines.push(alert.title));
    const month = brief.health?.curr?.total;
    if (month != null) lines.push(`هالشهر ${month} حجز.`);
    return { answer: lines.join('\n'), links: calendar };
  }

  if (kind === 'busyService') {
    const top = brief.occupancy?.services?.[0];
    return {
      answer: top ? `أكثر خدمة بالحجوزات الأخيرة: ${top.name} (${top.count}).` : 'ما في عيّنة كافية لأقول أي خدمة أنشط.',
      links: [{ path: '/services', label: 'الخدمات' }],
    };
  }

  if (kind === 'where') {
    const place = findPlace(foldAr(question));
    if (!place) return null;
    const listed = brief.pages || [];
    const bare = place.path.split('?')[0];
    const open = !listed.length || listed.some((page) => page.path === place.path || page.path.split('?')[0] === bare);
    const answer = [place.trail, place.note].filter(Boolean).join('\n');
    return {
      answer: open ? answer : `${answer}\nالقسم مقفل على هاي الباقة.`,
      links: [{ path: open ? place.path : '/billing', label: open ? place.label : 'الباقات' }],
    };
  }

  if (kind === 'shop') {
    const n = foldAr(question);
    if (/منتج|اسعار/.test(n) && !/طلب/.test(n)) {
      const rows = brief.catalog || [];
      return {
        answer: rows.length
          ? rows.slice(0, 8).map((row) => `${row.title} · ${row.price} ₪`).join('\n')
          : 'ما في منتجات بالكتالوج.',
        links: [{ path: '/products', label: 'المنتجات' }],
      };
    }
    const { open, sum } = money(brief.orders);
    if (!open.length) return { answer: 'ما في طلبيات مفتوحة.', links: [{ path: '/products?tab=orders', label: 'الطلبيات' }] };
    const lines = open.slice(0, 6).map((row) => `${row.name} · ${row.total} ₪ · ${row.status || 'pending'}`);
    return {
      answer: `المفتوح ${open.length} بقيمة ${sum} ₪.\n${lines.join('\n')}`,
      links: [{ path: '/products?tab=orders', label: 'الطلبيات' }],
    };
  }

  return null;
}
