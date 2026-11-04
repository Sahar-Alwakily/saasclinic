import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Ticket, Users } from 'lucide-react';

const cards = [
  {
    key: 'campaigns',
    to: '/winback',
    label: 'الحملات',
    tone: 'stat-card-mint',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    Icon: Ticket,
  },
  {
    key: 'blog',
    to: '/website?tab=blog',
    label: 'المدونة',
    tone: 'stat-card-sky',
    iconWrap: 'bg-sky-100 text-sky-700',
    Icon: Users,
  },
  {
    key: 'orders',
    to: '/products?tab=orders',
    label: 'طلبات المنتجات',
    tone: 'stat-card-gold',
    iconWrap: 'bg-amber-100 text-amber-700',
    Icon: ShoppingCart,
  },
];

const OverviewCards = ({ campaigns, blog, orders }) => {
  const values = { campaigns, blog, orders };
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {cards.map(({ key, to, label, tone, iconWrap, Icon }) => (
        <Link
          key={key}
          to={to}
          className={`saas-card ${tone} p-5 flex items-center justify-between gap-3 transition hover:-translate-y-0.5`}
        >
          <div>
            <p className="text-xs font-bold text-[#6b7280]">{label}</p>
            <p className="stat-num text-[34px] leading-none mt-2">{values[key]}</p>
          </div>
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconWrap}`}>
            <Icon size={20} />
          </span>
        </Link>
      ))}
    </div>
  );
};

export default OverviewCards;
