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
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#ff6b4a] font-semibold">growth</p>
        <h1 className="font-product text-3xl">التسويق</h1>
        <p className="text-sm text-stone-500 mt-1">الحملات المسجّلة، المحتوى، والكوبونات — بدون أرقام مخترعة.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/winback" className="saas-card p-5 hover:shadow-md">
          <p className="text-[11px] text-stone-400">الحملات</p>
          <p className="font-product text-3xl">{campaigns.length}</p>
        </Link>
        <Link to="/blog" className="saas-card p-5 hover:shadow-md">
          <p className="text-[11px] text-stone-400">المحتوى</p>
          <p className="font-product text-3xl">{blog.length}</p>
        </Link>
        <Link to="/orders" className="saas-card p-5 hover:shadow-md">
          <p className="text-[11px] text-stone-400">الطلبات</p>
          <p className="font-product text-3xl">{orders.length}</p>
        </Link>
      </div>

      <div className="saas-card p-5">
        <h2 className="font-product text-xl mb-3">الكوبونات والعروض</h2>
        {offers.length === 0 && <p className="text-sm text-stone-500">لا عروض محفوظة. تُنشأ من استرجاع العميلات.</p>}
        <ul className="space-y-2">
          {offers.map((o) => (
            <li key={o.id} className="flex justify-between text-sm rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] px-3 py-2">
              <span>{o.title || 'عرض'}</span>
              <span className="text-stone-500">{o.discountType === 'percent' ? `${o.value}%` : o.value} {o.adminApproved ? '· معتمد' : '· بانتظار اعتماد'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="saas-card p-5">
        <h2 className="font-product text-xl mb-3">نتائج الحملات</h2>
        {campaigns.length === 0 && <p className="text-sm text-stone-500">لا حملات بعد.</p>}
        {campaigns.map((c) => {
          const rows = messages.filter((x) => x.campaignId === c.id);
          const failed = rows.filter((x) => x.status === 'failed').length;
          return (
            <div key={c.id} className="py-3 border-b border-[#e4ddd0] dark:border-white/10 last:border-0 text-sm">
              <p className="font-bold">{c.name || 'حملة'}</p>
              <p className="text-xs text-stone-500 mt-1">رسائل {rows.length} · فشل {failed}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Marketing;
