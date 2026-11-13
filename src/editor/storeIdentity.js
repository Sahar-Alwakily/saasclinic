export const THEME_PRESETS = {
  beauty: { primaryColor: '#3B82F6', bgColor: '#EFF6FF', textColor: '#1F2937', fontFamily: 'Cairo' },
  elegant: { primaryColor: '#C9A66B', bgColor: '#0C0B0A', textColor: '#F5EDE3', fontFamily: 'serif' },
  minimal: { primaryColor: '#1C1917', bgColor: '#FAF8F5', textColor: '#1C1917', fontFamily: 'Tajawal' },
};

export const THEMES = [
  { id: 'beauty', name: 'بيوتي', color: 'bg-blue-500' },
  { id: 'elegant', name: 'أتيليه ذهبي', color: 'bg-amber-700' },
  { id: 'minimal', name: 'عيادة هادئة', color: 'bg-stone-800' },
];

export const FONT_OPTIONS = [
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Cairo', label: 'Cairo' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans' },
];

export function emptyStore() {
  return {
    storeTheme: 'beauty',
    doctorName: '',
    logoUrl: '',
    specialty: '',
    degree: '',
    doctorBio: '',
    primaryColor: '#3B82F6',
    bgColor: '#EFF6FF',
    textColor: '#1F2937',
    fontFamily: 'Cairo',
    showProducts: true,
    showBlog: true,
    seoTitle: '',
    seoDescription: '',
    websitePublished: true,
    heroImage: '',
  };
}

export function storeFromClinic(info) {
  const base = emptyStore();
  if (!info) return base;
  return {
    ...base,
    storeTheme: info.storeTheme || base.storeTheme,
    doctorName: info.doctorName || '',
    logoUrl: info.logoUrl || '',
    specialty: info.specialty || '',
    degree: info.degree || '',
    doctorBio: info.doctorBio || '',
    primaryColor: info.primaryColor || base.primaryColor,
    bgColor: info.bgColor || base.bgColor,
    textColor: info.textColor || base.textColor,
    fontFamily: info.fontFamily || base.fontFamily,
    showProducts: info.showProducts !== false,
    showBlog: info.showBlog !== false,
    seoTitle: info.seoTitle || '',
    seoDescription: info.seoDescription || '',
    websitePublished: info.websitePublished !== false,
    heroImage: info.heroImage || '',
  };
}

export function safeHex(value, fallback = '#C48B7A') {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : fallback;
}
