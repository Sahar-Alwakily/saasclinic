export function fontStack(fontFamily) {
  if (fontFamily === 'serif') return `'Cormorant Garamond', Georgia, serif`;
  if (fontFamily === 'sans-serif') return `'Tajawal', system-ui, sans-serif`;
  return `"${fontFamily || 'Tajawal'}", 'Tajawal', sans-serif`;
}

export function withAlpha(hex, alpha) {
  const raw = (hex || '#c48b7a').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(196, 139, 122, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function addToCart(setCart, product) {
  setCart((prev) => {
    const existing = prev.find((item) => item.id === product.id);
    if (existing) {
      return prev.map((item) => item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item);
    }
    return [...prev, { ...product, qty: 1 }];
  });
}

export function waLink(phone) {
  if (!phone) return null;
  return `https://wa.me/${String(phone).replace(/\D/g, '')}`;
}

export function serviceDuration(service) {
  return service?.duration || service?.time || '45–60 د';
}

export const DRAFT_STORAGE_KEY = 'clinicLiveStoreDraft';

export function clinicHeadline(clinic) {
  return (clinic?.heroTitle || '').trim();
}

export function clinicCopy(clinic) {
  return (clinic?.storeDescription || '').trim();
}

export const SKIN_PILLARS = [
  { title: 'تشخيص البشرة', desc: 'قراءة دقيقة لنوع بشرتكِ، المسام، التصبغ، والجفاف — قبل أي جلسة.' },
  { title: 'أجهزة تجميل معتمدة', desc: 'ليزر، إشراق، وتنظيف عميق ببروتوكولات آمنة لأخصائيات البشرة.' },
  { title: 'خصوصية تليق بكِ', desc: 'غرف هادئة، استشارة فردية، وخطة مكتوبة بدون وعود مبالغ فيها.' },
];

export const SKIN_CONCERNS = [
  { id: 'glow', label: 'إشراق وتوحيد لون' },
  { id: 'acne', label: 'حب شباب ومسام' },
  { id: 'laser', label: 'ليزر الجسم والوجه' },
  { id: 'antiage', label: 'شد ونضارة' },
  { id: 'eyes', label: 'منطقة العين' },
  { id: 'sensitive', label: 'بشرة حساسة' },
];

export const VISIT_JOURNEY = [
  { n: '01', t: 'استشارة خاصة', d: 'تجلس الأخصائية معكِ لتفهم بشرتكِ ونمط حياتكِ، لا قائمة جاهزة.' },
  { n: '02', t: 'جلسة مدروسة', d: 'ليزر، تنظيف، أو إشراق — بحسب احتياجكِ الحقيقي في هذا الموسم.' },
  { n: '03', t: 'روتين منزلي', d: 'منتجات قليلة وواضحة، ومتابعة بعد الجلسة لتحافظي على النتيجة.' },
];

export const SKIN_PROMISES = [
  'بدون ضغط على شراء جلسات لا تحتاجينها',
  'بروتوكولات تناسب البشرة الحساسة والملونة',
  'خصوصية كاملة داخل غرفة العلاج',
];

export const GUEST_NOTES = [
  { quote: 'أول مرة أحس إن في حدا قرا بشرتي بهدوء، مش بس عرض باقات.', name: 'سارة · بشرة مختلطة' },
  { quote: 'الغرفة نظيفة والجلسة مرتبة، والنتيجة ظهرت تدريجياً زي ما وعدوني.', name: 'لين · جلسات ليزر' },
  { quote: 'الخطة المنزلية قصيرة وواضحة. ما حطولي عشر منتجات.', name: 'هدى · إشراق' },
];

export const DEFAULT_HERO = {
  beauty: 'https://images.unsplash.com/photo-1570172619604-71fdc739a2ce?auto=format&fit=crop&w=1400&q=80',
  elegant: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80',
  minimal: 'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1400&q=80',
};
