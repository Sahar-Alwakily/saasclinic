import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/team', label: 'نظرة عامة', exact: true },
  { to: '/staff', label: 'الموظفات' },
  { to: '/appointments/schedule', label: 'الدوام والعطل' },
  { to: '/branches', label: 'الفروع' },
];

const TeamNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="أقسام الفريق"
      className="grid w-full grid-cols-2 gap-1 rounded-xl border border-[#E4EAEE] bg-white p-1 sm:inline-flex sm:w-auto sm:flex-wrap"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.to
          : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-center text-[11.5px] font-bold transition-colors ${
              active
                ? 'bg-[#ECFEFF] text-[#0E7490]'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default TeamNav;
