import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import {
  REQUEST_STATUS, REQUEST_TYPES, submitSupportRequest, typeLabel,
} from '../utils/supportRequest';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const card = 'rounded-lg border border-[#E4EAEE] bg-white';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857] disabled:opacity-60';
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-bold text-[#047857]';
const chipGold = 'rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#B45309]';
const chipSky = 'rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[10px] font-bold text-[#0369A1]';
const chipMuted = 'rounded-full border border-[#E4EAEE] bg-[#F4F7F8] px-2.5 py-0.5 text-[10px] font-bold text-[#64748B]';

function statusChip(status) {
  if (status === 'done' || status === 'resolved') return chipMint;
  if (status === 'new') return chipSky;
  if (status === 'in_progress') return chipGold;
  return chipMuted;
}

export default function SupportRequests() {
  const { clinicId, clinicInfo, isAdmin } = useClinic();
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ type: 'support', description: '', priority: 'normal' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return undefined;
    const unsub = onValue(ref(database, `clinics/${clinicId}/supportRequests`), (snap) => {
      const val = snap.val() || {};
      setMine(Object.entries(val)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [clinicId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !clinicId || !form.description.trim()) return;
    setSaving(true);
    try {
      await submitSupportRequest({
        clinicId,
        clinicName: clinicInfo?.name || '',
        type: form.type,
        description: form.description,
        priority: form.priority,
        source: 'support',
      });
      setForm({ type: 'support', description: '', priority: 'normal' });
      toast.success('أُرسل الطلب إلى وَرَفَ | WARAFA');
    } catch {
      toast.error('تعذّر الإرسال');
    } finally {
      setSaving(false);
    }
  };

  const openCount = mine.filter((r) => r.status === 'new' || r.status === 'in_progress').length;

  const kpis = [
    { label: 'كل الطلبات', value: String(mine.length), note: 'سجل طلبات العيادة', accent: '#059669' },
    { label: 'قيد المتابعة', value: String(openCount), note: 'جديد أو بمعالجة', accent: '#0FA3A3' },
    { label: 'أنواع متاحة', value: String(REQUEST_TYPES.filter((t) => t.id !== 'website_products' && t.id !== 'website_blog').length), note: 'من نموذج الطلب', accent: '#B45309' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الإعدادات</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">طلبات المنصة</h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-[#64748B]">
            الطلبات تصل لفريق وَرَفَ. المنتجات والمدونة من{' '}
            <Link to="/website" className="font-bold text-[#0E7490] hover:underline">موقع العيادة</Link>
            {' '}بدون طلب منفصل.
          </p>
        </div>
        <Link to="/website" className={ghost}>موقع العيادة</Link>
      </header>

      <section aria-label="مؤشرات الطلبات" className="grid grid-cols-3 border-y border-[#E4EAEE]">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-5 py-4 ${i > 0 ? 'border-s border-[#E4EAEE]' : ''}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
              {k.label}
            </p>
            <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      {isAdmin && (
        <form onSubmit={submit} className={`${card} space-y-3 p-4`}>
          <h2 className="text-[15px] font-bold">طلب جديد</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-bold text-[#64748B]">
              نوع الطلب
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${field} mt-1`}>
                {REQUEST_TYPES.filter((t) => t.id !== 'website_products' && t.id !== 'website_blog').map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-bold text-[#64748B]">
              الأولوية
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={`${field} mt-1`}>
                <option value="low">أولوية منخفضة</option>
                <option value="normal">عادية</option>
                <option value="high">مرتفعة</option>
              </select>
            </label>
          </div>
          <label className="block text-[12px] font-bold text-[#64748B]">
            الوصف
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="وصفي الطلب"
              className={`${field} mt-1 min-h-28 resize-y`}
            />
          </label>
          <button type="submit" disabled={saving} className={primary}>
            {saving ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        <p className="text-[13px] font-bold text-[#334155]">
          السجل <span className="font-medium text-[#94A3B8]">{mine.length}</span>
        </p>
        {mine.length === 0 && (
          <div className="rounded-xl border border-[#E4EAEE] bg-white p-10 text-center text-[13px] text-[#64748B]">
            لا طلبات بعد.
          </div>
        )}
        {mine.map((r) => (
          <article key={r.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white p-4">
            <span className="absolute inset-y-0 start-0 w-[3px] bg-[#0FA3A3]" />
            <div className="flex flex-wrap items-start justify-between gap-2 ps-1.5">
              <p className="text-[14px] font-bold">{typeLabel(r.type)}</p>
              <span className={statusChip(r.status)}>{REQUEST_STATUS[r.status] || r.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-[13px] text-[#64748B]">{r.description}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              {r.createdAt ? new Date(r.createdAt).toLocaleString('ar-IL') : ''}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}