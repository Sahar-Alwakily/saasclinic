/** مواقع التواصل والحجز من بيانات العيادة الحقيقية فقط — بدون رسائل لوحة التحكم. */

export function publicEmail(clinic = {}) {
  const email = String(clinic.contactEmail || clinic.publicEmail || clinic.email || '').trim();
  if (!email) return '';
  const owner = String(clinic.ownerEmail || '').trim().toLowerCase();
  if (owner && email.toLowerCase() === owner) return '';
  if (/@test\.com$/i.test(email)) return '';
  return email;
}

export function publicPlaces(clinic = {}, branches = []) {
  const info = clinic || {};
  const real = (Array.isArray(branches) ? branches : []).filter(
    (b) => b && (b.name || b.address || b.phone),
  );
  if (real.length) {
    return real.map((b) => ({
      id: b.id,
      name: b.name || 'فرع',
      address: String(b.address || '').trim(),
      phone: String(b.phone || info.phone || info.whatsapp || '').trim(),
      hours: String(b.hours || '').trim(),
      whatsapp: String(b.whatsapp || '').trim(),
    }));
  }

  const address = String(info.address || '').trim();
  const phone = String(info.phone || info.whatsapp || '').trim();
  const hours = String(info.hours || info.workingHours || '').trim();
  if (!address && !phone) return [];

  const shortCity = address && address.length <= 28 && !address.includes('\n');
  return [{
    id: 'main',
    name: shortCity ? address : (info.name || 'العيادة'),
    address: shortCity ? '' : address,
    phone,
    hours,
    whatsapp: String(info.whatsapp || '').trim(),
  }];
}

export function placeLabel(place = {}) {
  const name = String(place.name || '').trim();
  const address = String(place.address || '').trim();
  if (!address) return name;
  if (!name) return address;
  if (address === name || address.startsWith(`${name}،`) || address.startsWith(`${name},`) || address.includes(name)) {
    return address;
  }
  return `${name} — ${address}`;
}

export function publicPhones(clinic = {}, places = []) {
  const out = [];
  const add = (value) => {
    const phone = String(value || '').trim();
    if (phone && !out.includes(phone)) out.push(phone);
  };
  places.forEach((place) => {
    add(place.phone);
    add(place.whatsapp);
  });
  add(clinic.phone);
  add(clinic.whatsapp);
  return out;
}
