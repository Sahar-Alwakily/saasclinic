export const WHATSAPP_TEMPLATE_ID = 'HX99ea210d242b8206801b26eaf0c5bd15';

export const SERVICE_CATEGORIES = [
  { id: 'laser', name: 'ليزر' },
  { id: 'vitamins', name: 'فيتامينات' },
  { id: 'cosmetica', name: 'كوزمتكا' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'general', name: 'عام' },
];

export const LASER_ZONES = [
  { id: 'hands', label: 'اليدين' },
  { id: 'half_hands', label: 'نصف اليدين' },
  { id: 'abdomen', label: 'البطن' },
  { id: 'face', label: 'الوجه' },
  { id: 'half_legs', label: 'نصف الساقين' },
  { id: 'underarms', label: 'تحت الإبط' },
  { id: 'bikini', label: 'bikini' },
  { id: 'full_legs', label: 'الساقين كامل' },
  { id: 'back', label: 'الظهر' },
  { id: 'neck', label: 'الرقبة' },
];

export const DEFAULT_INSTRUCTIONS = {
  laser: {
    during: ['تجنّبي الشمس المباشرة يوم الجلسة.', 'أبلغي العيادة بأي تحسّس على المنطقة.'],
    after: ['رطّبي المنطقة حسب توجيه المختصة.', 'لا تزيلِ القشور يدوياً.'],
  },
  botox: {
    during: ['اجلسي بثبات أثناء الحقن.', 'أخبري الطبيبة بأي أدوية سيولة.'],
    after: ['لا تنحني بشدة أول ساعات.', 'لا تمسّي مكان الحقن.'],
  },
  filler: {
    during: ['أخبرينا بأي حساسية سابقة للفيلر.', 'أزيلي المكياج قبل الجلسة.'],
    after: ['كمّادات باردة عند التورّم.', 'تجنّبي الرياضة العنيفة 24 ساعة.'],
  },
  glow: {
    during: ['البشرة نظيفة بدون كريمات ثقيلة.', 'أخبرينا إن كنتِ حاملاً.'],
    after: ['واقي شمس يومياً.', 'تجنّبي الساونا أسبوعاً إن طُلب.'],
  },
  default: {
    during: ['اتّبعي تعليمات العيادة المكتوبة لهذه الجلسة.'],
    after: ['راجعي العيادة عند أي احمرار غير معتاد.'],
  },
};

export function matchInstructionKey(serviceName = '') {
  const s = String(serviceName);
  if (/ليزر|laser/i.test(s)) return 'laser';
  if (/بوتوكس|botox/i.test(s)) return 'botox';
  if (/فيلر|filler/i.test(s)) return 'filler';
  if (/نضارة|glow/i.test(s)) return 'glow';
  return 'default';
}

export function phaseLabel(phase) {
  return phase === 'after' ? 'بعد العلاج' : 'أثناء العلاج';
}
