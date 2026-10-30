import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';

const Marketing = () => {
  const { clinicPath } = useClinic();
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [offers, setOffers] = useState([]);
  const [blog, setBlog] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('winbackCampaigns')), (s) => setCampaigns(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('winbackOffers')), (s) => setOffers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('blog')), (s) => setBlog(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">التسويق</h1>
        <p className="text-sm text-[#8a9199] mt-1">الحملات المسجّلة، المحتوى، والكوبونات — بدون أرقام مخترعة.</p>
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
