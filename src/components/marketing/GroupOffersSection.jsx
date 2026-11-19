import React from 'react';
import { Ticket } from 'lucide-react';

const field = 'rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const primary = 'rounded-lg bg-[#059669] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#047857] disabled:opacity-60';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]';
const chipGold = 'rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-bold text-[#B45309]';

const GroupOffersSection = ({
  draft,
  setDraft,
  onSubmit,
  saving,
  groupOffers,
  offers,
  onCopy,
  onDelete,
}) => (
  <section className="rounded-lg border border-[#E4EAEE] bg-white p-4">
    <h2 className="text-[15px] font-bold">عروض تفتح بعد عدد موافقات</h2>
    <p className="mt-1 text-[12px] text-[#64748B]">العرض يبقى مغلقاً حتى يبلغ العدد المطلوب (افتراضياً 10).</p>
    <form onSubmit={onSubmit} className="mb-5 mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="اسم العرض"
        className={`lg:col-span-2 ${field}`}
      />
      <select
        value={draft.discountType}
        onChange={(e) => setDraft({ ...draft, discountType: e.target.value })}
        className={field}
        aria-label="نوع الخصم"
      >
        <option value="percent">نسبة %</option>
        <option value="fixed">مبلغ ثابت</option>
      </select>
      <input
        type="number"
        min="0"
        value={draft.value}
        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
        className={field}
        aria-label="قيمة الخصم"
      />
      <input
        type="number"
        min="2"
        value={draft.goal}
        onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
        className={field}
        aria-label="عدد الموافقات"
      />
      <button type="submit" disabled={saving} className={primary}>
        {saving ? 'جاري الحفظ...' : 'إنشاء العرض'}
      </button>
    </form>

    {groupOffers.length === 0 && <p className="mb-4 text-[12.5px] text-[#94A3B8]">لا عروض جماعية بعد.</p>}
    <ul className="mb-5 space-y-2">
      {groupOffers.map((o) => {
        const count = Object.keys(o.accepts || {}).length;
        const goal = Number(o.goal) || 10;
        const open = count >= goal;
        const label = o.discountType === 'percent' ? `${o.value}%` : o.value;
        return (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-4 py-3 text-[13px]">
            <span>
              <span className="block font-bold">{o.title}</span>
              <span className="text-[11px] text-[#64748B]">{label} · {count}/{goal}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className={open ? chipMint : chipGold}>{open ? 'مفتوح' : 'بانتظار الموافقات'}</span>
              <button type="button" onClick={() => onCopy(o.id)} className="rounded-lg bg-[#0F172A] px-3 py-1.5 text-[11px] font-bold text-white">نسخ الرابط</button>
              <button type="button" onClick={() => onDelete(o.id)} className="rounded-lg border border-[#E4EAEE] px-3 py-1.5 text-[11px] font-bold text-[#B91C1C]">حذف</button>
            </span>
          </li>
        );
      })}
    </ul>

    <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold">
      <Ticket size={16} className="text-[#059669]" />
      الكوبونات والعروض
    </h3>
    {offers.length === 0 && <p className="text-[12.5px] text-[#94A3B8]">لا عروض محفوظة. تُنشأ من استرجاع العميلات.</p>}
    <ul className="space-y-2">
      {offers.map((o) => {
        const amount = o.discountType === 'percent' ? `${o.value}%` : o.value;
        return (
          <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-4 py-3 text-[13px]">
            <span className="font-bold">{o.title || 'عرض'}</span>
            <span className={o.adminApproved ? chipMint : chipGold}>
              {o.adminApproved ? `${amount} معتمد` : `${amount} بانتظار اعتماد`}
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);

export default GroupOffersSection;