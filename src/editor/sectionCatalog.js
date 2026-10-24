import { newSectionId } from '../sections/defaultSections';
import { SECTION_REGISTRY } from '../sections';

/** أسماء عربية لأنواع الأقسام */
export const SECTION_LABELS = {
  hero: 'البانر',
  services: 'الجلسات',
  doctors: 'الأخصائية',
  products: 'المنتجات',
  blog: 'المدونة',
  branches: 'الفروع',
  contact: 'التواصل',
  about: 'عن العيادة',
  testimonials: 'آراء العميلات',
  faq: 'الأسئلة',
  whyChooseUs: 'لماذا نحن',
  whatsappCta: 'واتساب',
};

const DEFAULT_SETTINGS = {
  hero: { title: '', subtitle: '', image: '', ctaText: 'احجزي استشارة البشرة' },
  services: { title: 'علاجات البشرة والتجميل', limit: 12 },
  doctors: { title: '' },
  about: { title: 'عن العيادة', description: '', image: '' },
  products: { title: 'بوتيك العناية' },
  blog: { title: 'المدونة' },
  testimonials: { title: 'من غرفة العيادة', items: [] },
  faq: {
    title: 'أسئلة شائعة',
    items: [
      { question: 'كم تستغرق الجلسة؟', answer: 'المدة مكتوبة في صفحة الجلسة، ويُؤكَّد الوقت عند اختيار الموعد.' },
      { question: 'كيف أحجز؟', answer: 'اختاري الفرع ثم اليوم من جدول دوام المختصة.' },
    ],
  },
  branches: { title: 'فروع العيادة' },
  contact: { title: 'تواصلي معنا', phone: '', address: '', mapEmbed: '' },
  whyChooseUs: { title: 'لماذا تختارين عيادتنا؟', description: '', features: [] },
  whatsappCta: { title: 'احجزي عبر واتساب', subtitle: 'رسالة مباشرة لعيادتكِ — بدون وسيط.' },
};

/** حقول اللوحة حسب النوع */
export const SECTION_FIELDS = {
  hero: [
    { key: 'title', label: 'العنوان', kind: 'textarea' },
    { key: 'subtitle', label: 'النص الفرعي', kind: 'textarea' },
    { key: 'image', label: 'رابط الصورة', kind: 'url' },
    { key: 'ctaText', label: 'نص الزر', kind: 'text' },
  ],
  services: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'limit', label: 'عدد الجلسات المعروضة', kind: 'number' },
  ],
  doctors: [{ key: 'title', label: 'العنوان', kind: 'text' }],
  about: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'description', label: 'الوصف', kind: 'textarea' },
    { key: 'image', label: 'رابط الصورة', kind: 'url' },
  ],
  products: [{ key: 'title', label: 'العنوان', kind: 'text' }],
  blog: [{ key: 'title', label: 'العنوان', kind: 'text' }],
  testimonials: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'items', label: 'الآراء', kind: 'quotes' },
  ],
  faq: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'items', label: 'الأسئلة', kind: 'faqs' },
  ],
  branches: [{ key: 'title', label: 'العنوان', kind: 'text' }],
  contact: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'phone', label: 'الهاتف', kind: 'text' },
    { key: 'address', label: 'العنوان الجغرافي', kind: 'textarea' },
    { key: 'mapEmbed', label: 'رابط تضمين الخريطة', kind: 'url' },
  ],
  whyChooseUs: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'description', label: 'الوصف', kind: 'textarea' },
    { key: 'features', label: 'النقاط', kind: 'strings' },
  ],
  whatsappCta: [
    { key: 'title', label: 'العنوان', kind: 'text' },
    { key: 'subtitle', label: 'النص الفرعي', kind: 'textarea' },
  ],
};

export function sectionLabel(type) {
  return SECTION_LABELS[type] || type;
}

/** أنواع يمكن إضافتها الآن (المسجّلة في المحرّك) */
export function addableTypes() {
  return Object.keys(SECTION_REGISTRY);
}

export function createSection(type) {
  return {
    id: newSectionId(),
    type,
    visible: true,
    settings: { ...(DEFAULT_SETTINGS[type] || {}) },
  };
}

export function normalizeSections(raw) {
  if (Array.isArray(raw)) return raw.filter((s) => s && s.id && s.type);
  if (raw && typeof raw === 'object') {
    return Object.values(raw).filter((s) => s && s.id && s.type);
  }
  return null;
}
