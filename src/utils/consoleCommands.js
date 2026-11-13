import { foldAr, spokenDay } from './consoleBrief';

const ORDER_STATUS = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  new: 'جديد',
};

const POLICIES = [
  ['الخصوصيه', 'privacyPolicy', 'الخصوصية'],
  ['الاسترجاع', 'refundPolicy', 'الاسترجاع'],
  ['الحجوزات', 'bookingPolicy', 'الحجوزات'],
  ['العربون', 'depositPolicy', 'العربون'],
];

const NAME_STOP = new Set([
  'دوري', 'دور', 'ابحث', 'عن', 'وين', 'ملف', 'ملفها', 'جلسات', 'جلساتها', 'العميل', 'العميله', 'العميلة',
  'بدي', 'ابي', 'ابغى', 'عايزه', 'اشوف', 'شوف', 'شوفي', 'وريني', 'جيب', 'جيبلي', 'احكيلي', 'احكي',
  'رقم', 'رقمها', 'تلفون', 'تلفونها', 'هاتف', 'جوال', 'وينها', 'كم', 'عند', 'عندها', 'عندي',
  'في', 'فيه', 'هل', 'شو', 'طيب', 'ممكن', 'مين', 'جلسة', 'جلسه',
]);

function nameQuery(raw) {
  const words = foldAr(raw).split(' ').filter(Boolean);
  const kept = [];
  words.forEach((word, index) => {
    if (NAME_STOP.has(word)) return;
    const previous = words[index - 1];
    const rest = words.slice(index + 1).filter((item) => !NAME_STOP.has(item) && item !== 'علي');
    if (word === 'علي' && rest.length && (index === 0 || NAME_STOP.has(previous))) return;
    kept.push(word);
  });
  return kept;
}

function peopleHits(people, raw) {
  const tokens = nameQuery(raw);
  if (!tokens.length) return [];
  return (people || []).filter((person) => {
    const parts = foldAr(person.name).split(' ').filter((part) => part.length >= 2);
    return parts.length > 0 && tokens.every((token) => parts.some((part) => part === token || (token.length >= 3 && part.includes(token))));
  });
}

function lastPerson(brief, history) {
  const users = (history || []).filter((item) => item?.role === 'user' && item.text);
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const hits = peopleHits(brief.people, users[i].text);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

function describePerson(person) {
  const sessions = person.sessions || [];
  const lines = [`${person.name}${person.phone ? ` · ${person.phone}` : ''}`];
  if (!sessions.length) lines.push('ما في جلسات مختومة بملفها.');
  else lines.push(sessions.map((s) => `${s.title}${s.date ? ` (${s.date})` : ''}`).join('، '));
  return {
    answer: lines.join('\n'),
    links: [{ path: `/customers/${person.id}`, label: 'الملف' }],
  };
}

function searchReply(brief, question, history) {
  const n = foldAr(question);
  const bare = /جلساتها|ملفها|رقمها|تلفونها|وينها/.test(n) && !peopleHits(brief.people, question).length;
  const hits = bare ? [lastPerson(brief, history)].filter(Boolean) : peopleHits(brief.people, question);
  if (!hits.length) {
    return { answer: 'ما لقيت عميلة بهالاسم. اكتبي الاسم كما هو بالملف.', links: [{ path: '/customers', label: 'العميلات' }] };
  }
  if (hits.length > 1) {
    return {
      answer: `في أكثر من عميلة: ${hits.map((p) => p.name).join('، ')}. حددي الاسم الكامل.`,
      links: [{ path: '/customers', label: 'العميلات' }],
    };
  }
  return describePerson(hits[0]);
}

function reportReply(brief) {
  const curr = brief.health?.curr || {};
  const today = brief.todayBookings || {};
  const sales = (brief.orders || []).filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const rate = curr.attendRate == null ? '—' : `${curr.attendRate}%`;
  return {
    answer: `التقرير: هذا الشهر ${curr.total || 0} حجز، حضور ${rate}، اليوم ${today.total || 0} موعد، عميلات ${(brief.people || []).length}، طلبيات ${(brief.orders || []).length} بقيمة ${sales} ₪.`,
    links: [{ path: '/reports', label: 'التقارير' }, { path: '/products?tab=orders', label: 'الطلبيات' }],
  };
}

function ordersReply(brief) {
  const rows = brief.orders || [];
  if (!rows.length) {
    return { answer: 'ما في طلبيات منتجات.', links: [{ path: '/products?tab=orders', label: 'الطلبيات' }] };
  }
  const lines = rows.slice(0, 8).map((o) => `${o.name} · ${o.total} ₪ · ${ORDER_STATUS[o.status] || o.status}`);
  return {
    answer: lines.join('\n'),
    links: [{ path: '/products?tab=orders', label: 'الطلبيات' }],
  };
}

function addCustomer(question) {
  const m = question.match(/(?:أضيفي|اضيفي|ضيفي|أضف|اضف|سجلي)\s+عميل[ةه]?\s+(.+?)\s+(?:رقم|تلفون|هاتف|جوال)\s*([0-9][0-9\s+-]{6,})/);
  if (!m) return { answer: 'اكتبي: اضيفي عميلة الاسم رقم 05...', links: [{ path: '/customers', label: 'العميلات' }] };
  const parts = m[1].trim().split(/\s+/);
  const phone = m[2].replace(/\s+/g, '');
  return {
    answer: `رح أضيف ${m[1].trim()} برقم ${phone}.`,
    links: [{ path: '/customers', label: 'العميلات' }],
    action: { type: 'addCustomer', firstName: parts[0], lastName: parts.slice(1).join(' '), phone },
  };
}

function addProduct(question) {
  const m = question.match(/(?:أضيفي|اضيفي|ضيفي|أضف|اضف)\s+منتج\s+(.+?)\s+(?:سعره|سعر|ب)\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return { answer: 'اكتبي: اضيفي منتج الاسم سعر 100', links: [{ path: '/products', label: 'المنتجات' }] };
  return {
    answer: `رح أضيف منتج ${m[1].trim()} بسعر ${m[2]}.`,
    links: [{ path: '/products', label: 'المنتجات' }],
    action: { type: 'addProduct', title: m[1].trim(), price: Number(String(m[2]).replace(',', '.')) },
  };
}

function clockOf(question, raw) {
  const m = String(raw || '').match(/(\d{1,2})(?::(\d{2}))?/);
  if (!m) return '';
  let h = Number(m[1]);
  if (/مساء|عصر|مسا/.test(question) && h < 12) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
}

function addBooking(brief, question) {
  const m = question.match(/(?:أضيفي|اضيفي|ضيفي|سجلي)\s+(?:حجز|موعد)\s+(?:ل|لل)?\s*(.+?)\s+((?:يوم\s+)?(?:الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|الجمعه|السبت|بكرا|بكرة|بكره|بعد\s+بكرا|بعد\s+بكرة|اليوم)|\d{4}-\d{2}-\d{2})\s+(?:الساعة|الساعه|ساعة)\s*(\d{1,2}(?::\d{2})?)/);
  if (!m) {
    return { answer: 'اكتبي: اضيفي حجز لاسم العميلة يوم الأحد الساعة 10 خدمة الليزر', links: [{ path: '/appointments', label: 'التقويم' }] };
  }
  const day = spokenDay(m[2], brief);
  if (!day.known || !day.day?.date) {
    return { answer: 'ما حددت اليوم. قولي بكرا، أو اسم اليوم، أو التاريخ.', links: [{ path: '/appointments', label: 'التقويم' }] };
  }
  const branch = (brief.branchRows || [])[0];
  if (!branch) {
    return { answer: 'ما في فرع محفوظ. أضيفي فرعاً قبل الحجز.', links: [{ path: '/branches', label: 'الفروع' }] };
  }
  const name = m[1].trim();
  const known = peopleHits(brief.people, name)[0];
  const serviceMatch = question.match(/خدمة\s+(.+)$/);
  const serviceTitle = serviceMatch ? serviceMatch[1].trim() : '';
  const service = (brief.serviceRows || []).find((s) => serviceTitle && foldAr(s.title) === foldAr(serviceTitle));
  return {
    answer: `رح أسجّل حجز ${name} ${day.label} الساعة ${clockOf(question, m[3])} في ${branch.name}.`,
    links: [{ path: '/appointments', label: 'التقويم' }],
    action: {
      type: 'addAppointment',
      name,
      phone: known?.phone || '',
      date: day.day.date,
      time: clockOf(question, m[3]),
      service: service?.title || serviceTitle,
      serviceId: service?.id || '',
      branchId: branch.id,
      branchName: branch.name,
    },
  };
}

function oneHit(rows, label) {
  if (!rows.length) return { error: `ما لقيت ${label}. اكتبي الاسم كما هو بالسجل.` };
  if (rows.length > 1) return { error: `في أكثر من ${label}: ${rows.map((row) => row.name || row.title).join('، ')}.` };
  return { row: rows[0] };
}

function titledHits(rows, raw) {
  const q = foldAr(raw);
  return (rows || []).filter((row) => {
    const title = foldAr(row.title || row.name || '');
    return title.length >= 2 && (q.includes(title) || title.includes(q.trim()));
  });
}

function editOrDelete(brief, question) {
  const customerLink = [{ path: '/customers', label: 'العميلات' }];
  const productLink = [{ path: '/products', label: 'المنتجات' }];
  const calendarLink = [{ path: '/appointments', label: 'التقويم' }];
  const blogLink = [{ path: '/website?tab=blog', label: 'المدونة' }];
  const orderLink = [{ path: '/products?tab=orders', label: 'الطلبيات' }];

  const dropCustomer = question.match(/(?:احذفي|أحذفي|امسحي|أمسحي|احذف|امسح)\s+(?:عميل[ةه]?|ملف)\s+(.+)$/);
  if (dropCustomer) {
    const found = oneHit(peopleHits(brief.people, dropCustomer[1]), 'عميلة');
    if (found.error) return { answer: found.error, links: customerLink };
    return {
      answer: `رح أحذف ملف ${found.row.name}.`,
      links: customerLink,
      action: { type: 'deleteCustomer', id: found.row.id, name: found.row.name },
    };
  }

  const phoneEdit = question.match(/(?:عدلي|غيري)\s+رقم\s+(.+?)\s+(?:الى|إلى|ل)\s*([0-9][0-9\s+-]{6,})/);
  if (phoneEdit) {
    const found = oneHit(peopleHits(brief.people, phoneEdit[1]), 'عميلة');
    if (found.error) return { answer: found.error, links: customerLink };
    const phone = phoneEdit[2].replace(/\s+/g, '');
    return {
      answer: `رح أغيّر رقم ${found.row.name} إلى ${phone}.`,
      links: customerLink,
      action: { type: 'updateCustomer', id: found.row.id, phone },
    };
  }

  const nameEdit = question.match(/(?:عدلي|غيري)\s+اسم\s+(?!منتج)(.+?)\s+(?:الى|إلى|ل)\s+(.+)$/);
  if (nameEdit) {
    const found = oneHit(peopleHits(brief.people, nameEdit[1]), 'عميلة');
    if (found.error) return { answer: found.error, links: customerLink };
    const parts = nameEdit[2].trim().split(/\s+/);
    return {
      answer: `رح أغيّر اسم ${found.row.name} إلى ${nameEdit[2].trim()}.`,
      links: customerLink,
      action: { type: 'updateCustomer', id: found.row.id, firstName: parts[0], lastName: parts.slice(1).join(' ') },
    };
  }

  const dropProduct = question.match(/(?:احذفي|أحذفي|امسحي|أمسحي|احذف|امسح)\s+منتج\s+(.+)$/);
  if (dropProduct) {
    const found = oneHit(titledHits(brief.catalog, dropProduct[1]), 'منتج');
    if (found.error) return { answer: found.error, links: productLink };
    return {
      answer: `رح أحذف منتج ${found.row.title}.`,
      links: productLink,
      action: { type: 'deleteProduct', id: found.row.id, title: found.row.title },
    };
  }

  const priceEdit = question.match(/(?:عدلي|غيري)\s+سعر\s+(.+?)\s+(?:الى|إلى|ل)\s*(\d+(?:[.,]\d+)?)/);
  if (priceEdit) {
    const found = oneHit(titledHits(brief.catalog, priceEdit[1]), 'منتج');
    if (found.error) return { answer: found.error, links: productLink };
    const price = Number(String(priceEdit[2]).replace(',', '.'));
    return {
      answer: `رح أغيّر سعر ${found.row.title} إلى ${price}.`,
      links: productLink,
      action: { type: 'updateProduct', id: found.row.id, price },
    };
  }

  const productName = question.match(/(?:عدلي|غيري)\s+اسم\s+منتج\s+(.+?)\s+(?:الى|إلى|ل)\s+(.+)$/);
  if (productName) {
    const found = oneHit(titledHits(brief.catalog, productName[1]), 'منتج');
    if (found.error) return { answer: found.error, links: productLink };
    return {
      answer: `رح أغيّر اسم المنتج إلى ${productName[2].trim()}.`,
      links: productLink,
      action: { type: 'updateProduct', id: found.row.id, title: productName[2].trim() },
    };
  }

  const serviceEdit = question.match(/(?:عدلي|غيري)\s+خدمة\s+(?:حجز|موعد)\s+(.+?)\s+(?:الى|إلى|ل)\s+(.+)$/);
  if (serviceEdit) {
    const rows = openForPerson(brief, serviceEdit[1]);
    if (rows.length !== 1) {
      return { answer: rows.length ? 'في أكثر من حجز مفتوح. زيدي اليوم.' : 'ما في حجز مفتوح بهالاسم.', links: calendarLink };
    }
    const title = serviceEdit[2].trim();
    const service = (brief.serviceRows || []).find((item) => foldAr(item.title) === foldAr(title));
    return {
      answer: `رح أغيّر خدمة حجز ${rows[0].name} إلى ${service?.title || title}.`,
      links: calendarLink,
      action: { type: 'updateAppointment', appointment: rows[0], service: service?.title || title, serviceId: service?.id || '' },
    };
  }

  const move = question.match(/(?:عدلي|غيري|أجلي|اجلي)\s+(?:حجز|موعد)\s+(.+?)\s+((?:يوم\s+)?(?:الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|الجمعه|السبت|بكرا|بكرة|بكره|بعد\s+بكرا|بعد\s+بكرة|اليوم)|\d{4}-\d{2}-\d{2})\s+(?:الساعة|الساعه|ساعة)\s*(\d{1,2}(?::\d{2})?)/);
  if (move) {
    const rows = openForPerson(brief, move[1]);
    if (rows.length !== 1) {
      return { answer: rows.length ? 'في أكثر من حجز مفتوح بهالاسم. ما بقدر أحدد أي واحد.' : 'ما في حجز مفتوح بهالاسم.', links: calendarLink };
    }
    const day = spokenDay(move[2], brief);
    if (!day.known || !day.day?.date) return { answer: 'ما حددت اليوم الجديد.', links: calendarLink };
    const time = clockOf(question, move[3]);
    return {
      answer: `رح أنقل حجز ${rows[0].name} إلى ${day.label} الساعة ${time}.`,
      links: calendarLink,
      action: { type: 'updateAppointment', appointment: rows[0], date: day.day.date, time },
    };
  }

  const dropPost = question.match(/(?:احذفي|أحذفي|امسحي|أمسحي|احذف|امسح)\s+مقال\s+(.+)$/);
  if (dropPost) {
    const found = oneHit(titledHits(brief.posts, dropPost[1]), 'مقال');
    if (found.error) return { answer: found.error, links: blogLink };
    return {
      answer: `رح أحذف مقال ${found.row.title}.`,
      links: blogLink,
      action: { type: 'deletePost', id: found.row.id, title: found.row.title },
    };
  }

  const editPost = question.match(/(?:عدلي|غيري)\s+مقال\s+(.+?)\s+نص\s+(.{4,})$/);
  if (editPost) {
    const found = oneHit(titledHits(brief.posts, editPost[1]), 'مقال');
    if (found.error) return { answer: found.error, links: blogLink };
    return {
      answer: `رح أعدّل نص مقال ${found.row.title}.`,
      links: blogLink,
      action: { type: 'updatePost', id: found.row.id, content: editPost[2].trim() },
    };
  }

  const dropOrder = question.match(/(?:احذفي|أحذفي|امسحي|أمسحي|احذف|امسح|الغي|ألغي)\s+طلب\s+(.+)$/);
  if (dropOrder) {
    const found = oneHit(titledHits(brief.orders, dropOrder[1]), 'طلب');
    if (found.error) return { answer: found.error, links: orderLink };
    return {
      answer: `رح ألغي طلب ${found.row.name}.`,
      links: orderLink,
      action: { type: 'cancelOrder', id: found.row.id, name: found.row.name },
    };
  }

  return null;
}

function openForPerson(brief, raw) {
  const named = peopleHits(brief.people, raw);
  return (brief.openAppointments || []).filter((apt) => {
    if (named.length === 1) return foldAr(apt.name).includes(foldAr(named[0].name));
    const q = foldAr(raw);
    return q && foldAr(apt.name).includes(q);
  });
}

function personPhrase(question) {
  return String(question || '').replace(/الغي|ألغي|إلغاء|الغاء|كنسل|حجوزات|الحجوزات|حجز|موعد|مواعيد|ادوار|يوم|اليوم|بكرا|بكرة|بكره|بعد|الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|الجمعه|السبت/g, ' ');
}

function cancelReply(brief, question) {
  const day = spokenDay(question, brief);
  const named = peopleHits(brief.people, personPhrase(question));
  const calendar = [{ path: '/appointments', label: 'التقويم' }];
  if (!day.known) {
    if (named.length === 1) {
      const hers = (brief.openAppointments || []).filter((row) => foldAr(row.name).includes(foldAr(named[0].name)));
      if (hers.length === 1) {
        return {
          answer: `رح ألغي حجز ${hers[0].name}${hers[0].date ? ` يوم ${hers[0].date}` : ''}${hers[0].time ? ` الساعة ${hers[0].time}` : ''}.`,
          links: calendar,
          action: { type: 'cancelAppointments', label: hers[0].name, appointments: hers },
        };
      }
      if (hers.length > 1) return { answer: `عند ${named[0].name} ${hers.length} حجوزات مفتوحة. حددي اليوم.`, links: calendar };
    }
    return { answer: 'حددي اليوم اللي بدك تلغي حجوزاته.', links: calendar };
  }
  const date = day.day?.date;
  let rows = (brief.openAppointments || []).filter((a) => !date || a.date === date);
  if (named.length === 1) rows = rows.filter((a) => foldAr(a.name).includes(foldAr(named[0].name)));
  const label = day.label || 'هاليوم';
  if (!rows.length) {
    return { answer: `${label} ما في حجوزات مفتوحة حتى تلغيها.`, links: [{ path: '/appointments', label: 'التقويم' }] };
  }
  return {
    answer: `رح ألغي ${rows.length} حجز يوم ${label}.`,
    links: [{ path: '/appointments', label: 'التقويم' }],
    action: { type: 'cancelAppointments', label, appointments: rows },
  };
}

function siteReply(question) {
  const n = foldAr(question);
  if (/انشري الموقع|انشر الموقع/.test(n)) {
    return { answer: 'رح أنشر الموقع.', links: [{ path: '/website', label: 'الموقع' }], action: { type: 'setPublished', value: true } };
  }
  if (/اخفي الموقع|وقفي النشر|الغاء النشر/.test(n)) {
    return { answer: 'رح أخفي الموقع.', links: [{ path: '/website', label: 'الموقع' }], action: { type: 'setPublished', value: false } };
  }
  const policy = question.match(/(?:سياسة|غيري|عدلي)\s*(الخصوصية|الاسترجاع|الحجوزات|العربون)\s*[:：]?\s*(.{4,})/);
  if (policy) {
    const hit = POLICIES.find((item) => foldAr(policy[1]).includes(item[0]) || foldAr(policy[1]).includes(foldAr(item[2])));
    if (hit) {
      return {
        answer: `رح أحفظ سياسة ${hit[2]}.`,
        links: [{ path: '/website?tab=policies', label: 'السياسات' }],
        action: { type: 'setPolicy', key: hit[1], text: policy[2].trim() },
      };
    }
  }
  const post = question.match(/(?:أضيفي|اضيفي|ضيفي)\s+مقال\s+(.+?)\s+(?:نص|المحتوى)\s+(.{4,})/);
  if (post) {
    return {
      answer: `رح أنشر مقال «${post[1].trim()}».`,
      links: [{ path: '/website?tab=blog', label: 'المدونة' }],
      action: { type: 'addPost', title: post[1].trim(), content: post[2].trim() },
    };
  }
  return null;
}

export function planConsoleCommand(brief, question = '', history = []) {
  const n = foldAr(question);
  if (!n) return null;
  if (/(?:احذف|امسح|عدلي|غيري|اجلي|الغي)/.test(n)) {
    const changed = editOrDelete(brief, question);
    if (changed) return changed;
  }
  const askingWay = /وين|كيف اوصل|بروح|بفتح|من وين|الاقي/.test(n);
  if (/تقرير/.test(n) && !askingWay) return reportReply(brief);
  if (/طلبيات|طلبات المنتجات/.test(n) && !askingWay) return ordersReply(brief);
  if (/دوري|ابحث|وين ملف|جلسات|ملفها|ملف العميل|رقمها|تلفونها|وينها|بدي ملف|اشوف ملف/.test(n)) return searchReply(brief, question, history);
  if (/(?:اضيفي|ضيفي|اضف|سجلي)/.test(n) && /عميل/.test(n)) return addCustomer(question);
  if (/(?:اضيفي|ضيفي|اضف)/.test(n) && /منتج/.test(n)) return addProduct(question);
  if (/(?:اضيفي|ضيفي|سجلي)/.test(n) && /حجز|موعد/.test(n)) return addBooking(brief, question);
  if (/الغي|الغاء|كنسل/.test(n) && !/كيف|ليش|وين/.test(n) && /حجز|موعد|ادوار|يوم|بكرا|بكره|اليوم|الاحد|الاتنين|الثلاثا|الاربعا|الخميس|الجمعه|السبت/.test(n)) {
    return cancelReply(brief, question);
  }
  if (/انشري الموقع|انشر الموقع|اخفي الموقع|وقفي النشر|مقال|سياسه|غيري الخصوص|عدلي/.test(n)) return siteReply(question);
  if (peopleHits(brief.people, question).length) return searchReply(brief, question, history);
  return null;
}
