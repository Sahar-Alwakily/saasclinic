import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { clinicAccessAllowed } from './shared/waReminderTemplates.js';

const OPEN = new Set(['pending', 'confirmed', 'rescheduled']);
const CATEGORIES = [
  { id: 'laser', words: ['ليزر', 'laser'] },
  { id: 'vitamins', words: ['فيتامين', 'vitamin'] },
  { id: 'cosmetica', words: ['كوزمت', 'cosmet'] },
  { id: 'beauty', words: ['تجميل', 'beauty'] },
  { id: 'general', words: ['عام', 'general'] },
];

const SYSTEM = `أنت "مساعد نورا الذكي"، مساعد إداري خبير لعيادات التجميل. مهمتك مساعدة صاحب العيادة في إدارة كل شيء بذكاء وسلاسة.
تحدث دائماً بنفس لهجة المستخدم. إذا كتب بالشامي، رد بالشامي. إذا كتب بالفصحى، رد بالفصحى. إذا كتب بلهجة بدوية، رد بنفس اللهجة.

قواعد الفهم (Intent Recognition):
- إذا سأل المستخدم عن "حجوزات اليوم" أو "اليوم فيه حجوزات؟" أو "شو عندنا اليوم؟" -> استخدم أداة \`getDailySummary\` للتاريخ الحالي.
- إذا سأل عن "بكرا" أو "غدا" -> احسب تاريخ الغد واستخدم \`getDailySummary\`.
- إذا سأل عن "الفراغات" أو "أوقات فاضية" -> استخدم \`checkAvailability\`.
- إذا قال "الغي موعد الساعة 10" أو "كنسل حجز" -> استخدم \`cancelAppointment\`.
- إذا سأل "شو إيراد اليوم؟" -> استخدم أداة مالية (إذا كانت موجودة).
- إذا لم تفهم قصده، لا تخمن. اسأله سؤالاً توضيحياً بسيطاً: "تقصد الحجوزات ولا الفراغات ولا الإيراد؟"

قواعد الرد:
- كن مختصراً وواضحاً. لا تكتب فقرات طويلة.
- استخدم الأرقام والتواريخ بشكل مباشر.
- إذا نفذت أداة (مثل الإلغاء)، أكد للمستخدم بالنتيجة فوراً.

أمثلة على اللهجات وكيف تفهمها:
- "اليوم فيه حجوزات؟" -> نية: جلب حجوزات اليوم.
- "طيب بكرا؟" -> نية: جلب حجوزات الغد.
- "بدي ألغي حجز الساعة ١٠" -> نية: إلغاء موعد.
- "شو الفراغات عندكم بكرة؟" -> نية: عرض الأوقات المتاحة.
- "قديش إيراد اليوم؟" -> نية: جلب الإيراد اليومي.`;

function db() {
  return getDatabase();
}

export function fold(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/قسم/g, ' ')
    .replace(/(^|\s)ال/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function digits(value) {
  return String(value || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function timeOffset(value) {
  const s = digits(value).trim();
  const m = s.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if ((/م/.test(s) || /pm/i.test(s)) && h < 12) h += 12;
  if ((/ص/.test(s) || /am/i.test(s)) && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

export function sameTime(query, stored) {
  const left = timeOffset(query);
  const right = timeOffset(stored);
  if (left == null || right == null) return false;
  if (Math.abs(left - right) < 0.01) return true;
  const hasPeriod = /ص|م|am|pm/i.test(digits(query));
  return !hasPeriod && left < 12 && Math.abs(left + 12 - right) < 0.01;
}

export function departmentHit(query, fields) {
  const q = fold(query);
  if (!q) return false;
  const blob = fold(fields.filter(Boolean).join(' '));
  if (!blob) return false;
  if (blob.includes(q)) return true;
  const cat = CATEGORIES.find((item) => item.words.some((word) => q.includes(fold(word)) || q === item.id));
  if (!cat) return false;
  return blob.includes(cat.id) || cat.words.some((word) => blob.includes(fold(word)));
}

export function isYes(text) {
  const s = fold(text).replace(/[!.?؟،,]/g, '').trim();
  return /^(نعم|اي|ايوه|ايوا|اجل|اكيد|تمام|موافق|موافقه|yes)$/.test(s);
}

export function userConfirmedCancel(history, message) {
  if (!isYes(message)) return false;
  const prior = [...history].reverse().find((item) => item.role !== 'user');
  return Boolean(prior && /متاكد|الغ[ي]|الغاء|تاكيد/.test(fold(prior.text)));
}

function clinicToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function resolveClinicDate(value, today = clinicToday()) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const word = fold(raw);
  if (!word || word === 'اليوم' || word === 'يوم' || word === 'هلق' || word === 'هلقيت') return today;
  if (/^(بكرا|بكره|غدا|غد|باكر)$/.test(word)) {
    const [year, month, day] = today.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  }
  return raw || today;
}

function slotKey(branchId, specialistId, date, time) {
  const safe = String(time || '').replace(/[.#$[\]/]/g, '_');
  return `${branchId || 'x'}__${specialistId || 'any'}__${date || ''}__${safe}`;
}

function publicApt(id, apt) {
  return {
    id,
    date: apt.date || '',
    time: apt.time || '',
    status: apt.status || '',
    service: apt.service || apt.serviceName || '',
    customerName: apt.customerName || '',
  };
}

async function clinicContext(clinicId) {
  const root = db().ref(`clinics/${clinicId}`);
  const [appointmentsSnap, servicesSnap, usersSnap] = await Promise.all([
    root.child('appointments').get(),
    root.child('services').get(),
    root.child('users').get(),
  ]);
  const services = servicesSnap.val() || {};
  const users = usersSnap.val() || {};
  const appointments = Object.entries(appointmentsSnap.val() || {}).map(([id, apt]) => {
    const service = services[apt.serviceId] || {};
    const staff = users[apt.specialistId] || {};
    return {
      id,
      ...apt,
      matchFields: [apt.service, apt.serviceName, service.name, service.category, staff.category, staff.name],
    };
  });
  return { appointments };
}

function matches(apt, { date, time, department, openOnly }) {
  if (date && apt.date !== date) return false;
  if (openOnly && !OPEN.has(apt.status)) return false;
  if (time && !sameTime(time, apt.time)) return false;
  if (department && !departmentHit(department, apt.matchFields || [])) return false;
  return true;
}

async function cancelAppointment(clinicId, args, history, message) {
  const time = String(args.time || '').trim();
  const department = String(args.department || '').trim();
  const date = resolveClinicDate(args.date);
  const ask = `هل أنت متأكد من إلغاء موعد الساعة ${time} في قسم ${department}؟`;
  if (!time || !department) return { cancelled: false, error: 'time_and_department_required', ask };
  if (!userConfirmedCancel(history, message)) {
    return { cancelled: false, needsConfirmation: true, ask };
  }
  const { appointments } = await clinicContext(clinicId);
  const found = appointments.filter((apt) => matches(apt, { date, time, department, openOnly: true }));
  if (!found.length) return { cancelled: false, date, count: 0, ask: 'لا يوجد موعد مفتوح يطابق هذا الوقت والقسم.' };
  if (found.length > 1) {
    return { cancelled: false, ambiguous: true, date, matches: found.map((apt) => publicApt(apt.id, apt)) };
  }
  const apt = found[0];
  const historyLog = Array.isArray(apt.history) ? apt.history : [];
  await db().ref(`clinics/${clinicId}/appointments/${apt.id}`).update({
    status: 'cancelled',
    cancelReason: 'نورا الذكية',
    cancelledAt: Date.now(),
    history: [...historyLog, { at: Date.now(), action: 'cancelled', by: 'nura', reason: 'نورا الذكية' }].slice(-40),
  });
  const key = apt.slotKey || slotKey(apt.branchId, apt.specialistId, apt.date, apt.time);
  await db().ref(`clinics/${clinicId}/slotLocks/${key}`).transaction((cur) => {
    if (!cur) return null;
    if (cur.appointmentId && cur.appointmentId !== apt.id) return cur;
    return null;
  });
  return { cancelled: true, date, appointment: publicApt(apt.id, { ...apt, status: 'cancelled' }) };
}

async function checkAvailability(clinicId, args) {
  const date = resolveClinicDate(args.date);
  const department = String(args.department || '').trim();
  const { appointments } = await clinicContext(clinicId);
  const taken = appointments
    .filter((apt) => matches(apt, { date, department, openOnly: true }))
    .map((apt) => publicApt(apt.id, apt));
  return { ok: true, date, department: department || 'الكل', taken, takenCount: taken.length };
}

async function getDailySummary(clinicId, args) {
  const date = resolveClinicDate(args.date);
  const { appointments } = await clinicContext(clinicId);
  const day = appointments.filter((apt) => apt.date === date).map((apt) => publicApt(apt.id, apt));
  const counts = day.reduce((acc, apt) => {
    acc[apt.status || 'unknown'] = (acc[apt.status || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  return { ok: true, date, total: day.length, counts, appointments: day.slice(0, 40) };
}

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'cancelAppointment',
      description: 'يلغي موعداً مفتوحاً واحداً لهذه العيادة بعد أن يرد المستخدم بنعم. لا تستدعها قبل سؤال التأكيد.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          time: { type: SchemaType.STRING, description: 'وقت الموعد، مثل 10 أو 10:00' },
          department: { type: SchemaType.STRING, description: 'القسم أو الخدمة، مثل الليزر' },
          date: { type: SchemaType.STRING, description: 'YYYY-MM-DD أو اليوم أو بكرا أو غدا. اليوم إن لم يُذكر.' },
        },
        required: ['time', 'department'],
      },
    },
    {
      name: 'checkAvailability',
      description: 'يعرض المواعيد المحجوزة في تاريخ محدد داخل هذه العيادة. استخدمها للفراغات والأوقات الفاضية. القسم اختياري.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING, description: 'YYYY-MM-DD أو اليوم أو بكرا أو بكرة أو غدا' },
          department: { type: SchemaType.STRING, description: 'القسم أو الخدمة، إن ذُكر' },
        },
        required: ['date'],
      },
    },
    {
      name: 'getDailySummary',
      description: 'ملخص مواعيد يوم واحد لهذه العيادة: العدد والحالة والوقت والقسم.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING, description: 'YYYY-MM-DD أو اليوم أو بكرا أو بكرة أو غدا' },
        },
        required: ['date'],
      },
    },
  ],
}];

function cleanHistory(history) {
  const rows = Array.isArray(history) ? history : [];
  const cleaned = rows.map((item) => {
    const role = item?.role === 'user' ? 'user' : 'model';
    const text = String(item?.text || item?.content || '').trim().slice(0, 2000);
    return text ? { role, text } : null;
  }).filter(Boolean).slice(-12);
  const turns = [];
  for (const item of cleaned) {
    const prev = turns[turns.length - 1];
    if (prev && prev.role === item.role) prev.text = `${prev.text}\n${item.text}`.slice(0, 2000);
    else turns.push({ ...item });
  }
  while (turns[0]?.role === 'model') turns.shift();
  return turns;
}

async function runTool(name, args, clinicId, history, message) {
  if (name === 'cancelAppointment') return cancelAppointment(clinicId, args || {}, history, message);
  if (name === 'checkAvailability') return checkAvailability(clinicId, args || {});
  if (name === 'getDailySummary') return getDailySummary(clinicId, args || {});
  return { ok: false, error: 'unknown_tool' };
}

async function clinicIdForUid(uid) {
  const snap = await db().ref(`meta/users/${uid}`).get();
  return snap.val()?.clinicId || null;
}

export const clinicChatAgent = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'يلزم تسجيل الدخول');
  const requestedClinicId = String(request.data?.clinicId || '');
  const userClinic = await clinicIdForUid(request.auth.uid);
  if (!clinicAccessAllowed(userClinic, requestedClinicId)) {
    throw new HttpsError('permission-denied', 'لا صلاحية على هذه العيادة');
  }
  const message = String(request.data?.message || '').trim().slice(0, 2000);
  if (!message) throw new HttpsError('invalid-argument', 'اكتب رسالة أولاً');
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY is not configured.' };

  const history = cleanHistory(request.data?.history);
  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `${SYSTEM}\n\nتاريخ اليوم: ${clinicToday()} بصيغة YYYY-MM-DD. احسب الغد من هذا التاريخ. العيادة الحالية فقط هي المسموح بها.`,
      tools: TOOLS,
    });
    const chat = model.startChat({
      history: history.map((item) => ({ role: item.role, parts: [{ text: item.text }] })),
    });

    let result = await chat.sendMessage(message);
    for (let step = 0; step < 2; step += 1) {
      const calls = result.response.functionCalls() || [];
      if (!calls.length) break;
      const responses = [];
      for (const call of calls) {
        const output = await runTool(call.name, call.args, userClinic, history, message);
        responses.push({ functionResponse: { name: call.name, response: output } });
      }
      result = await chat.sendMessage(responses);
    }
    const text = result.response.text();
    return { ok: true, reply: text || 'لم أستطع صياغة رد.' };
  } catch (err) {
    return { ok: false, error: err.message || 'Gemini request failed.' };
  }
});
