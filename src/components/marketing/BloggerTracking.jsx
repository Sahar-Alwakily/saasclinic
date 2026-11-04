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

const field = 'p-2.5 border border-[#e4eee8] rounded-2xl text-sm bg-[#f8faf9]';

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
    <section className="saas-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-[#111827] dark:text-white flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            تتبع المدونين والشركاء
          </h2>
          <p className="text-sm text-[#8a9199] mt-1">الزيارات هي نقرات الرابط، والمشتريات هي من أكمل الشراء. الأرقام هنا عينة للعرض.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#10b981] text-white text-sm font-bold"
        >
          <Ticket size={16} />
          إنشاء كوبون لمدون
        </button>
      </div>

      {open && (
        <form onSubmit={addBlogger} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mb-4">
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
          <button type="submit" className="px-4 py-2.5 rounded-2xl bg-[#111827] text-white text-sm font-bold">إضافة</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-[640px]">
          <thead>
            <tr>
              <th>اسم المدون</th>
              <th>كود الخصم</th>
              <th>
                <span className="inline-flex items-center gap-1"><MousePointerClick size={14} /> عدد الزيارات</span>
              </th>
              <th>
                <span className="inline-flex items-center gap-1"><ShoppingCart size={14} /> عدد المشتريات</span>
              </th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-bold text-[#111827] dark:text-white">{row.name}</td>
                <td><span className="font-mono text-xs" dir="ltr">{row.code}</span></td>
                <td>{row.visits.toLocaleString('en')}</td>
                <td>{row.purchases.toLocaleString('en')}</td>
                <td>
                  <span className={`nura-chip ${row.status === 'active' ? 'nura-chip-mint' : 'nura-chip-rose'}`}>
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
