import React from 'react';
import { Ticket } from 'lucide-react';

const field = 'p-2.5 border border-[#e4eee8] rounded-2xl text-sm bg-[#f8faf9]';

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
  <section className="saas-card p-5">
    <h2 className="font-bold text-[#111827] dark:text-white">عروض تفتح بعد عدد موافقات</h2>
    <p className="text-sm text-[#8a9199] mt-1 mb-4">العرض يبقى مغلقاً حتى يبلغ العدد الافتراضي 10 أشخاص. ويمكن تغييره.</p>
    <form onSubmit={onSubmit} className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 mb-5">
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
      <button
        type="submit"
        disabled={saving}
        className="py-2.5 px-4 rounded-2xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-60"
      >
        {saving ? 'جاري الحفظ...' : 'إنشاء العرض'}
      </button>
    </form>

    {groupOffers.length === 0 && <p className="text-sm text-[#8a9199] mb-4">لا عروض جماعية بعد.</p>}
    <ul className="space-y-2 mb-5">
      {groupOffers.map((o) => {
        const count = Object.keys(o.accepts || {}).length;
        const goal = Number(o.goal) || 10;
        const open = count >= goal;
        const label = o.discountType === 'percent' ? `${o.value}%` : o.value;
        return (
          <li key={o.id} className="flex flex-wrap justify-between items-center gap-2 text-sm rounded-2xl bg-[#f8faf9] border border-[#e4eee8] px-4 py-3">
            <span>
              <span className="font-bold text-[#111827] dark:text-white block">{o.title}</span>
              <span className="text-xs text-[#8a9199]">{label} · {count}/{goal}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className={`nura-chip ${open ? 'nura-chip-mint' : 'nura-chip-gold'}`}>{open ? 'مفتوح' : 'بانتظار الموافقات'}</span>
              <button type="button" onClick={() => onCopy(o.id)} className="px-3 py-1.5 rounded-2xl bg-[#111827] text-white text-xs font-bold">نسخ الرابط</button>
              <button type="button" onClick={() => onDelete(o.id)} className="px-3 py-1.5 rounded-2xl border border-[#e4eee8] text-xs font-bold text-[#9a3f32]">حذف</button>
            </span>
          </li>
        );
      })}
    </ul>

    <h3 className="font-bold text-[#111827] dark:text-white mb-3 flex items-center gap-2">
      <Ticket size={16} className="text-emerald-600" />
      الكوبونات والعروض
    </h3>
    {offers.length === 0 && <p className="text-sm text-[#8a9199]">لا عروض محفوظة. تُنشأ من استرجاع العميلات.</p>}
    <ul className="space-y-2">
      {offers.map((o) => {
        const amount = o.discountType === 'percent' ? `${o.value}%` : o.value;
        return (
          <li key={o.id} className="flex justify-between items-center gap-3 text-sm rounded-2xl bg-[#f8faf9] border border-[#e4eee8] px-4 py-3">
            <span className="font-bold text-[#111827] dark:text-white">{o.title || 'عرض'}</span>
            <span className={`nura-chip ${o.adminApproved ? 'nura-chip-mint' : 'nura-chip-gold'}`}>
              {o.adminApproved ? `${amount} معتمد` : `${amount} بانتظار اعتماد`}
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);

export default GroupOffersSection;
