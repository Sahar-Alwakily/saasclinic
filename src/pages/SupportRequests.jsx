import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import {
  REQUEST_STATUS, REQUEST_TYPES, submitSupportRequest, typeLabel,
} from '../utils/supportRequest';

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

  return (
    <div className="space-y-6 max-w-3xl">
      <ToastContainer position="top-left" rtl />
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#A67C2D] font-semibold">support</p>
        <h1 className="font-product text-3xl">طلبات للمنصة</h1>
        <p className="text-sm text-stone-500 mt-1">
          هذه الطلبات تصل سوبر أدمن. المنتجات والمدونة بتضيفيها من{' '}
          <Link to="/website" className="font-bold text-[#172B3A]">موقع العيادة</Link>
          {' '}بدون طلب.
        </p>
      </div>
      {isAdmin && (
        <form onSubmit={submit} className="saas-card p-5 space-y-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#E5E9EC]">
            {REQUEST_TYPES.filter((t) => t.id !== 'website_products' && t.id !== 'website_blog').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#E5E9EC]">
            <option value="low">أولوية منخفضة</option>
            <option value="normal">عادية</option>
            <option value="high">مرتفعة</option>
          </select>
          <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#E5E9EC]" placeholder="وصفي الطلب" />
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-[#172B3A] text-white text-sm font-bold">إرسال</button>
        </form>
      )}
      <div className="space-y-2">
        {mine.map((r) => (
          <div key={r.id} className="saas-card p-4">
            <div className="flex justify-between gap-2 text-sm">
              <p className="font-bold">{typeLabel(r.type)}</p>
              <span>{REQUEST_STATUS[r.status] || r.status}</span>
            </div>
            <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{r.description}</p>
            <p className="text-[11px] text-stone-400 mt-2">{r.createdAt ? new Date(r.createdAt).toLocaleString('ar-IL') : ''}</p>
          </div>
        ))}
        {mine.length === 0 && <p className="text-sm text-stone-500">لا طلبات بعد.</p>}
      </div>
    </div>
  );
}
