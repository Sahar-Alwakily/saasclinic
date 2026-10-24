export const LANGS = [
  { id: 'ar', native: 'العربية', dir: 'rtl', locale: 'ar', font: '"IBM Plex Sans Arabic", Tajawal, sans-serif' },
  { id: 'he', native: 'עברית', dir: 'rtl', locale: 'he-IL', font: '"IBM Plex Sans Hebrew", "IBM Plex Sans", sans-serif' },
  { id: 'en', native: 'English', dir: 'ltr', locale: 'en', font: '"IBM Plex Sans", sans-serif' },
  { id: 'ru', native: 'Русский', dir: 'ltr', locale: 'ru', font: '"IBM Plex Sans", sans-serif' },
];

export const DEFAULT_LANG = 'ar';
export const LANG_STORAGE = 'nura.lang';

export const getLang = (id) => LANGS.find((l) => l.id === id) || LANGS[0];
