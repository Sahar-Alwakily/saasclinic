import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Ticket, Users } from 'lucide-react';

const cards = [
  {
    key: 'campaigns',
    to: '/winback',
    label: 'الحملات',
    accent: '#059669',
    iconWrap: 'bg-[#ECFDF5] text-[#047857]',
    Icon: Ticket,
  },
  {
    key: 'blog',
    to: '/website?tab=blog',
    label: 'المدونة',
    accent: '#0FA3A3',
    iconWrap: 'bg-[#ECFEFF] text-[#0E7490]',
    Icon: Users,
  },
  {
    key: 'orders',
    to: '/products?tab=orders',
    label: 'طلبات المنتجات',
    accent: '#B45309',
    iconWrap: 'bg-[#FFFBEB] text-[#B45309]',
    Icon: ShoppingCart,
  },
];

const OverviewCards = ({ campaigns, blog, orders }) => {
  const values = { campaigns, blog, orders };
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map(({ key, to, label, accent, iconWrap, Icon }) => (
        <Link
          key={key}
          to={to}
          className="flex items-center justify-between gap-3 rounded-lg border border-[#E4EAEE] bg-white p-4 transition hover:border-[#C6EEEE]"
          style={{ borderRightWidth: 3, borderRightColor: accent }}
        >
          <div>
            <p className="text-[11px] font-bold text-[#64748B]">{label}</p>
            <p className="mt-2 text-[28px] font-light leading-none tabular-nums tracking-tight">{values[key]}</p>
          </div>
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconWrap}`}>
            <Icon size={18} />
          </span>
        </Link>
      ))}
    </div>
  );
};

export default OverviewCards;