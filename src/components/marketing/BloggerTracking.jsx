import React, { useState } from 'react';
import { MousePointerClick, ShoppingCart, Ticket, Users } from 'lucide-react';
import { toast } from 'react-toastify';

const MOCK_BLOGGERS = [
  { id: 'b1', name: 'أحمد الخطيب', code: 'BLOGGER_AHMED_20', visits: 1284, purchases: 46, status: 'active' },
  { id: 'b2', name: 'ليلى منصور', code: 'BLOGGER_LAYLA_15', visits: 860, purchases: 31, status: 'active' },
  { id: 'b3', name: 'سارة نعيم', code: 'NOOR_SARA_10', visits: 412, purchases: 9, status: 'active' },
  { id: 'b4', name: 'كريم حداد', code: 'KARIM_25', visits: 205, purchases: 4, status: 'expired' },
  { id: 'b5', name: 'هدى عودة', code: 'HUDA_CLINIC_12', visits: 637, purchases: 22, status: 'active' },
];

const field = 'rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#047857]';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]';
const chipRose = 'rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-bold text-[#B91C1C]';

function couponCode(name) {
  const first = (name.trim().split(/\s+/)[0] || 'BLOG').replace(/\s+/g, '');
  return `BLOGGER_${first}_10`.toUpperCase();
}

const BloggerTracking = () => {
  const [rows, setRows] = useState(MOCK_BLOGGERS);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });

  const addBlogger = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return toast.error('اسم المدون مطلوب');
    const code = (form.code.trim() || couponCode(name)).toUpperCase().replace(/\s+/g, '_');
    setRows((prev) => [{ id: `local-${Date.now()}`, name, code, visits: 0, purchases: 0, status: 'active' }, ...prev]);
    setForm({ name: '', code: '' });
    setOpen(false);
    toast.success('أُضيف الكوبون للمعاينة');
  };

  return (
    <section className="rounded-lg border border-[#E4EAEE] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <Users size={18} className="text-[#059669]" />
            تتبع المدونين والشركاء
          </h2>
          <p className="mt-1 text-[12px] text-[#64748B]">الزيارات نقرات الرابط؛ المشتريات من أكمل الشراء. أرقام عينة للعرض.</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className={primary}>
          <Ticket size={16} />
          إنشاء كوبون لمدون
        </button>
      </div>

      {open && (
        <form onSubmit={addBlogger} className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسم المدون"
            className={field}
          />
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="كود الخصم"
            dir="ltr"
            className={field}
          />
          <button type="submit" className="rounded-lg bg-[#0F172A] px-4 py-2 text-[12.5px] font-bold text-white">إضافة</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#E4EAEE]">
        <table className="min-w-[640px] w-full text-[13px]">
          <thead className="bg-[#F8FBFC] text-[11px] font-bold text-[#64748B]">
            <tr>
              <th className="p-3 text-right">اسم المدون</th>
              <th className="p-3 text-right">كود الخصم</th>
              <th className="p-3 text-right">
                <span className="inline-flex items-center gap-1"><MousePointerClick size={14} /> عدد الزيارات</span>
              </th>
              <th className="p-3 text-right">
                <span className="inline-flex items-center gap-1"><ShoppingCart size={14} /> عدد المشتريات</span>
              </th>
              <th className="p-3 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EAEE]">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.name}</td>
                <td className="p-3"><span className="font-mono text-[11px]" dir="ltr">{row.code}</span></td>
                <td className="p-3 tabular-nums">{row.visits.toLocaleString('en')}</td>
                <td className="p-3 tabular-nums">{row.purchases.toLocaleString('en')}</td>
                <td className="p-3">
                  <span className={row.status === 'active' ? chipMint : chipRose}>
                    {row.status === 'active' ? 'نشط' : 'منتهي'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default BloggerTracking;