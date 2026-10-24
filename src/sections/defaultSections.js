/** معرّف قسم جديد — Firebase يقبل المفتاح كنص حر. */
export function newSectionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * الأقسام الافتراضية لأي عيادة جديدة.
 * الترتيب هنا للإنشاء فقط — المحرّك يعرض clinic.sections كما هي.
 */
export function createDefaultSections() {
  return [
    {
      id: newSectionId(),
      type: 'hero',
      visible: true,
      settings: {
        title: '',
        subtitle: '',
        image: '',
        ctaText: 'احجزي استشارة البشرة',
      },
    },
    {
      id: newSectionId(),
      type: 'services',
      visible: true,
      settings: {
        title: 'علاجات البشرة والتجميل',
        limit: 12,
      },
    },
    {
      id: newSectionId(),
      type: 'doctors',
      visible: true,
      settings: {},
    },
    {
      id: newSectionId(),
      type: 'about',
      visible: true,
      settings: { title: 'عن العيادة', description: '', image: '' },
    },
    {
      id: newSectionId(),
      type: 'whyChooseUs',
      visible: true,
      settings: { title: 'لماذا تختارين عيادتنا؟', description: '', features: [] },
    },
    {
      id: newSectionId(),
      type: 'products',
      visible: true,
      settings: { title: 'بوتيك العناية' },
    },
    {
      id: newSectionId(),
      type: 'testimonials',
      visible: true,
      settings: { title: 'من غرفة العيادة', items: [] },
    },
    {
      id: newSectionId(),
      type: 'blog',
      visible: true,
      settings: { title: 'المدونة' },
    },
    {
      id: newSectionId(),
      type: 'faq',
      visible: true,
      settings: {
        title: 'أسئلة شائعة',
        items: [
          { question: 'كم تستغرق الجلسة؟', answer: 'المدة مكتوبة في صفحة الجلسة، ويُؤكَّد الوقت عند اختيار الموعد.' },
          { question: 'كيف أحجز؟', answer: 'اختاري الفرع ثم اليوم من جدول دوام المختصة.' },
        ],
      },
    },
    {
      id: newSectionId(),
      type: 'branches',
      visible: true,
      settings: { title: 'فروع العيادة' },
    },
    {
      id: newSectionId(),
      type: 'contact',
      visible: true,
      settings: { title: 'تواصلي معنا', phone: '', address: '', mapEmbed: '' },
    },
    {
      id: newSectionId(),
      type: 'whatsappCta',
      visible: true,
      settings: { title: 'احجزي عبر واتساب', subtitle: 'رسالة مباشرة لعيادتكِ — بدون وسيط.' },
    },
  ];
}
