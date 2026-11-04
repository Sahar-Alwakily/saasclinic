const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isCapacity(status, message) {
  return status === 429 || status === 503
    || /high demand|overloaded|unavailable|RESOURCE_EXHAUSTED|try again later|quota/i.test(message || '');
}

function isMissingModel(status, message) {
  return status === 404 || /not found|NOT_FOUND/i.test(message || '');
}

const SYSTEM = `أنتِ مساعدة الكونسول لعيادة تجميل. تحكين بالعامية الشامية، طبيعية، كأنك زميلة بالمناوبة.
تسايرين الحديث: تفهمين المقصود من الرسائل السابقة، بتردّي على اللي قالته المستخدِمة مو على قائمة أسئلة.
إذا ناقصت معلومة، اسألي سؤال واحد قصير. اقترحي الخطوة والشاشة من شغلك.
الأرقام والحالات من سجل العيادة المرفق فقط. لا تخترعي حملة أو طقس أو سبب برا السجل. إذا مش موجود بالسجل قولي «مش مسجّل».
إذا السؤال كم حجز أو كم حجوزات، جيبي العدد من حجوزات_هذا_الشهر.total بهالجملة: هذا الشهر عندكِ N حجز. لا تطلبي توضيح.
إذا السؤال عن حجوزات اليوم، جيبي العدد من مواعيد_اليوم.total. إذا صفر قولي: اليوم ما في حجوزات. لا تذكري الرسائل الفاشلة إلا إذا السؤال عنها.
إذا قال بكرا أو غدا بعد سؤال عن الحجوزات، جيبي مواعيد_بكرة.total. إذا صفر قولي: بكرا ما في حجوزات.
لا تعرضي للمستخدِمة أزرار أسئلة جاهزة ولا تعيدي نفس الجملة الافتتاحية.
إذا في شاشة مفيدة في آخر الرد فقط:
LINK:/appointments|الحجوزات`;

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => p.text || '').join('').trim();
}

export function parseGeminiReply(raw) {
  const lines = String(raw || '').split('\n');
  const links = [];
  const keep = [];
  lines.forEach((line) => {
    const m = line.trim().match(/^LINK:\s*(\/[^\s|]+)\s*\|\s*(.+)$/i);
    if (m) {
      links.push({ path: m[1], label: m[2].trim() });
      return;
    }
    keep.push(line);
  });
  return { answer: keep.join('\n').trim(), links };
}

export async function askGemini({ key, briefText, history = [], question, pathname }) {
  if (!key) {
    const err = new Error('NO_KEY');
    err.code = 'NO_KEY';
    throw err;
  }
  const talk = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => !m.system)
    .slice(-12)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

  const contents = [
    { role: 'user', parts: [{ text: `سجل العيادة (حقائق، حدّثيه كل رد):\n${briefText}` }] },
    { role: 'model', parts: [{ text: 'ماشي، معي السجل. رح أساير الحكي ومن الأرقام بس.' }] },
    ...talk,
    { role: 'user', parts: [{ text: `الشاشة اللي فاتحتها: ${pathname}\n\n${question}` }] },
  ];
  const body = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
  };

  let last = 'المساعد مشغول.';
  let capacity = false;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        last = 'ما في اتصال بالموديل.';
        break;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const raw = extractText(data);
        if (!raw) {
          last = 'الموديل رجّع رداً فارغاً.';
          break;
        }
        return parseGeminiReply(raw);
      }
      last = data?.error?.message || `HTTP ${res.status}`;
      if (isMissingModel(res.status, last)) break;
      if (isCapacity(res.status, last)) {
        capacity = true;
        await sleep(600 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  const err = new Error(capacity ? 'CAPACITY' : last);
  err.code = capacity ? 'RATE' : 'API';
  throw err;
}
