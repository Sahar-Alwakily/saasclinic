import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';

const Marketing = () => {
  const { clinicPath, clinicId } = useClinic();
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [offers, setOffers] = useState([]);
  const [blog, setBlog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [groupOffers, setGroupOffers] = useState([]);
  const [draft, setDraft] = useState({ title: '', discountType: 'percent', value: 15, goal: 10 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('winbackCampaigns')), (s) => setCampaigns(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('winbackOffers')), (s) => setOffers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('blog')), (s) => setBlog(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('groupOffers')), (s) => setGroupOffers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const createGroupOffer = async (e) => {
    e.preventDefault();
    const title = draft.title.trim();
    const goal = Math.max(2, Number(draft.goal) || 10);
    if (!title) return toast.error('اسم العرض مطلوب');
    if (!clinicPath) return;
    setSaving(true);
    try {
      const node = push(ref(database, clinicPath('groupOffers')));
      await set(node, {
        title,
        discountType: draft.discountType,
        value: Number(draft.value) || 0,
        goal,
        createdAt: Date.now(),
      });
      setDraft({ title: '', discountType: 'percent', value: 15, goal: 10 });
      toast.success('العرض بانتظار الموافقات');
    } catch {
      toast.error('تعذّر حفظ العرض');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (id) => {
    const url = `${window.location.origin}/group/${clinicId}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('نُسخ رابط الموافقة');
    } catch {
      toast.info(url);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">التسويق</h1>
        <p className="text-sm text-[#8a9199] mt-1">الحملات المسجّلة، والعرض الجماعي الذي يُفتح بعد اكتمال عدد الموافقات.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Link to="/winback" className="saas-card stat-card-mint p-5">
          <p className="text-xs text-[#047857]">الحملات</p>
          <p className="stat-num text-[34px] leading-none mt-2">{campaigns.length}</p>
        </Link>
        <Link to="/website?tab=blog" className="saas-card stat-card-sky p-5">
          <p className="text-xs text-[#0369a1]">المدونة</p>
          <p className="stat-num text-[34px] leading-none mt-2">{blog.length}</p>
        </Link>
        <Link to="/products?tab=orders" className="saas-card stat-card-gold p-5">
          <p className="text-xs text-[#b45309]">طلبيات المنتجات</p>
          <p className="stat-num text-[34px] leading-none mt-2">{orders.length}</p>
        </Link>
      </div>

      <section id="group-offers" className="saas-card p-5">
        <h2 className="font-bold text-[#111827]">عروض تفتح بعد عدد موافقات</h2>
        <p className="text-sm text-[#8a9199] mt-1 mb-4">العرض يبقى مغلقاً حتى يبلغ العدد. الافتراض 10 أشخاص، ويمكن تغييره.</p>
        <form onSubmit={createGroupOffer} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="اسم العرض" className="lg:col-span-2 p-2.5 border border-[#e4eee8] rounded-2xl text-sm" />
          <select value={draft.discountType} onChange={(e) => setDraft({ ...draft, discountType: e.target.value })} className="p-2.5 border border-[#e4eee8] rounded-2xl text-sm">
            <option value="percent">نسبة %</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input type="number" min="0" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} className="p-2.5 border border-[#e4eee8] rounded-2xl text-sm" aria-label="قيمة الخصم" />
          <input type="number" min="2" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} className="p-2.5 border border-[#e4eee8] rounded-2xl text-sm" aria-label="عدد الموافقات" />
          <button type="submit" disabled={saving} className="sm:col-span-2 lg:col-span-5 py-2.5 rounded-2xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-60">
            {saving ? 'جاري الحفظ...' : 'إنشاء العرض'}
          </button>
        </form>
        {groupOffers.length === 0 && <p className="text-sm text-[#8a9199]">لا عروض جماعية بعد.</p>}
        <ul className="space-y-2">
          {groupOffers.map((o) => {
            const count = Object.keys(o.accepts || {}).length;
            const goal = Number(o.goal) || 10;
            const open = count >= goal;
            const label = o.discountType === 'percent' ? `${o.value}%` : o.value;
            return (
              <li key={o.id} className="flex flex-wrap justify-between items-center gap-2 text-sm rounded-2xl bg-[#f8faf9] border border-[#e4eee8] px-4 py-3">
                <span>
                  <span className="font-bold text-[#111827] block">{o.title}</span>
                  <span className="text-xs text-[#8a9199]">{label} · {count}/{goal}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`nura-chip ${open ? 'nura-chip-mint' : 'nura-chip-gold'}`}>{open ? 'مفتوح' : 'بانتظار الموافقات'}</span>
                  <button type="button" onClick={() => copyLink(o.id)} className="px-3 py-1.5 rounded-2xl bg-[#111827] text-white text-xs font-bold">نسخ الرابط</button>
                  <button type="button" onClick={() => remove(ref(database, clinicPath(`groupOffers/${o.id}`)))} className="px-3 py-1.5 rounded-2xl border border-[#e4eee8] text-xs font-bold text-[#9a3f32]">حذف</button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] mb-3">الكوبونات والعروض</h2>
        {offers.length === 0 && <p className="text-sm text-[#8a9199]">لا عروض محفوظة. تُنشأ من استرجاع العميلات.</p>}
        <ul className="space-y-2">
          {offers.map((o) => (
            <li key={o.id} className="flex justify-between items-center text-sm rounded-2xl bg-[#f8faf9] border border-[#e4eee8] px-4 py-3">
              <span className="font-bold text-[#111827]">{o.title || 'عرض'}</span>
              <span className={`nura-chip ${o.adminApproved ? 'nura-chip-mint' : 'nura-chip-gold'}`}>
                {o.discountType === 'percent' ? `${o.value}%` : o.value} {o.adminApproved ? '· معتمد' : '· بانتظار اعتماد'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] mb-3">نتائج الحملات</h2>
        {campaigns.length === 0 && <p className="text-sm text-[#8a9199]">لا حملات بعد.</p>}
        {campaigns.map((c) => {
          const rows = messages.filter((x) => x.campaignId === c.id);
          const failed = rows.filter((x) => x.status === 'failed').length;
          return (
            <div key={c.id} className="py-3 border-b border-[#e4eee8] last:border-0">
              <p className="font-bold text-[#111827]">{c.name || 'حملة'}</p>
              <div className="flex gap-2 mt-1">
                <span className="nura-chip nura-chip-sky">رسائل {rows.length}</span>
                <span className="nura-chip nura-chip-rose">فشل {failed}</span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default Marketing;
