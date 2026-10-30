import { push, ref, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';

export const SITE_REQUEST_TYPES = [
  { id: 'website_design', label: 'تصميم الموقع' },
  { id: 'website_products', label: 'منتجات الموقع' },
  { id: 'website_blog', label: 'مدونة الموقع' },
  { id: 'website_custom', label: 'تخصيص الموقع' },
];

export const REQUEST_TYPES = [
  ...SITE_REQUEST_TYPES,
  { id: 'feature', label: 'ميزة جديدة' },
  { id: 'staff_branch', label: 'حسابات أو فروع إضافية' },
  { id: 'subscription_upgrade', label: 'ترقية اشتراك' },
  { id: 'support', label: 'دعم تقني' },
  { id: 'other', label: 'طلب آخر' },
];

export const REQUEST_STATUS = {
  new: 'جديد',
  review: 'قيد المراجعة',
  progress: 'قيد التنفيذ',
  waiting: 'بانتظار العيادة',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

export function typeLabel(id) {
  return REQUEST_TYPES.find((t) => t.id === id)?.label || id;
}

export function isSiteRequest(type) {
  return String(type || '').startsWith('website_');
}

export async function submitSupportRequest({
  clinicId,
  clinicName,
  type,
  description,
  priority = 'normal',
  details,
  source = 'console',
}) {
  const text = String(description || '').trim();
  if (!clinicId || !text) throw new Error('missing');
  const payload = {
    clinicId,
    clinicName: clinicName || '',
    type,
    description: text,
    priority,
    status: 'new',
    source,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (details && typeof details === 'object' && Object.keys(details).length) {
    payload.details = details;
  }
  const row = push(ref(database, `clinics/${clinicId}/supportRequests`));
  await set(row, payload);
  await set(ref(database, `platform/requests/${row.key}`), payload);
  return row.key;
}
