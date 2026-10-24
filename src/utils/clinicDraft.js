import { normalizeSections } from '../editor/sectionCatalog';
import { createDefaultSections } from '../sections/defaultSections';

/** نفس قائمة الأقسام في المحرر والمعاينة الحية. */
export function clinicSections(clinic) {
  return normalizeSections(clinic?.sections) || createDefaultSections();
}

/** حقول تبويب الواجهة تُكتب فوق إعدادات الأقسام المطابقة. */
export function overlayStoreOnSections(sections, store = {}) {
  return (sections || []).map((block) => {
    const settings = { ...(block.settings || {}) };
    if (block.type === 'hero') {
      if (store.heroTitle) settings.title = store.heroTitle;
      if (store.storeDescription) settings.subtitle = store.storeDescription;
      if (store.heroImage) settings.image = store.heroImage;
    }
    if (block.type === 'about') {
      if (store.storeDescription && !settings.description) settings.description = store.storeDescription;
    }
    if (block.type === 'whyChooseUs') {
      if (store.whyChooseUsTitle) settings.title = store.whyChooseUsTitle;
      if (store.whyChooseUs) settings.description = store.whyChooseUs;
    }
    if (block.type === 'contact') {
      if (store.whatsapp) settings.phone = store.whatsapp;
      if (store.address) settings.address = store.address;
    }
    return { ...block, settings };
  });
}

/** مسودة iframe واحدة: ألوان العيادة + الأقسام. */
export function buildDraftClinic(clinicInfo = {}, extras = {}) {
  const store = extras.store || {};
  const profile = extras.profile || {};
  const base = { ...clinicInfo, ...store };
  const list = extras.sections || clinicSections(base);
  const sections = extras.overlayStore ? overlayStoreOnSections(list, store) : list;
  return {
    ...base,
    name: profile.name || base.name || '',
    phone: profile.phone || base.phone || '',
    sections,
    _demo: false,
  };
}
