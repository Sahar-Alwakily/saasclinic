import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartPie, FaCalendarAlt, FaUsers, FaSpa, FaGlobe, FaRobot, FaPaperPlane,
  FaBullhorn, FaChartBar, FaUserTie, FaCreditCard, FaCog, FaSignOutAlt, FaTimes,
} from 'react-icons/fa';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import { useShellNav } from './shellNav';

const linkClass = ({ isActive }) =>
  `flex flex-col px-3 py-2 rounded-xl text-sm transition-all ${
    isActive
      ? 'bg-white/10 text-white shadow-[inset_3px_0_0_#4d7cff]'
      : 'text-white/70 hover:text-white hover:bg-white/5'
  }`;

const childClass = ({ isActive }) =>
  `block px-3 py-1.5 rounded-lg text-[12px] ${
    isActive ? 'text-white bg-white/10' : 'text-white/45 hover:text-white/80'
  }`;

const NAV = [
  {
    to: '/dashboard',
    label: 'الرئيسية',
    hint: 'ملخص الأداء والتنبيهات',
    icon: FaChartPie,
  },
  {
    to: '/appointments',
    label: 'المواعيد',
    hint: 'تقويم، حجوزات، إلغاء، انتظار',
    icon: FaCalendarAlt,
    children: [
      { to: '/appointments', label: 'الحجوزات' },
      { to: '/ops', label: 'الانتظار والشواغر' },
    ],
  },
  {
    to: '/customers',
    label: 'العميلات',
    hint: 'الملفات، الزيارات، سجل التواصل',
    icon: FaUsers,
    admin: true,
  },
  {
    to: '/services',
    label: 'العلاجات والخدمات',
    hint: 'الخدمات والأسعار والباقات',
    icon: FaSpa,
    children: [
      { to: '/services', label: 'الخدمات والأسعار' },
      { to: '/treatments', label: 'متابعة العلاجات' },
    ],
  },
  {
    to: '/website',
    label: 'موقع العيادة',
    hint: 'التصميم، الصفحات، الدومين، SEO',
    icon: FaGlobe,
    admin: true,
  },
  {
    to: '/assistant',
    label: 'المساعد الذكي',
    hint: 'واتساب، إعدادات الردود، المحادثات',
    icon: FaRobot,
    admin: true,
  },
  {
    to: '/winback',
    label: 'استرجاع العميلات',
    hint: 'حملات العودة والنتائج',
    icon: FaPaperPlane,
    admin: true,
  },
  {
    to: '/marketing',
    label: 'التسويق',
    hint: 'الحملات، المحتوى، الكوبونات',
    icon: FaBullhorn,
    admin: true,
    children: [
      { to: '/marketing', label: 'نظرة الحملات' },
      { to: '/blog', label: 'المحتوى' },
      { to: '/orders', label: 'الطلبات' },
    ],
  },
  {
    to: '/reports',
    label: 'التقارير والتحليلات',
    hint: 'الإيرادات والتحويل والحضور',
    icon: FaChartBar,
    admin: true,
  },
  {
    to: '/team',
    label: 'الفريق والفروع',
    hint: 'الموظفات، الصلاحيات، الجداول',
    icon: FaUserTie,
    admin: true,
    children: [
      { to: '/staff', label: 'الموظفات' },
      { to: '/branches', label: 'الفروع والجداول' },
    ],
  },
  {
    to: '/billing',
    label: 'المدفوعات والاشتراكات',
    hint: 'الفواتير، العربون، الاشتراك',
    icon: FaCreditCard,
    admin: true,
  },
  {
    to: '/settings',
    label: 'الإعدادات',
    hint: 'بيانات العيادة، الخصوصية، التكاملات',
    icon: FaCog,
    admin: true,
  },
];

const Sidebar = () => {
  const { clinicInfo, isAdmin } = useClinic();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { open, setOpen } = useShellNav();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = NAV.filter((item) => !item.admin || isAdmin);

  return (
    <aside
      className={`saas-rail fixed lg:sticky top-0 right-0 z-50 h-dvh w-[min(17.5rem,88vw)] flex flex-col border-l border-white/5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4d7cff] via-[#a78bfa] to-[#ff6b4a] text-white font-product font-extrabold flex items-center justify-center text-lg">
          ن
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-product text-xl leading-none">نورا</p>
          <p className="text-[11px] text-white/45 mt-1 truncate">{clinicInfo?.name || 'منصة تشغيل العيادة'}</p>
        </div>
        <button type="button" className="lg:hidden p-2 text-white/70" aria-label="إغلاق" onClick={() => setOpen(false)}>
          <FaTimes />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const childActive = item.children?.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
          const open = pathname === item.to || pathname.startsWith(`${item.to}/`) || childActive;
          return (
            <div key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => linkClass({ isActive: isActive || open })}
              >
                <span className="flex items-center gap-3 font-medium">
                  <Icon className="shrink-0 opacity-80" />
                  {item.label}
                </span>
                <span className={`text-[10px] leading-snug mt-0.5 pr-7 ${open ? 'text-white/50' : 'text-white/30'}`}>
                  {item.hint}
                </span>
              </NavLink>
              {item.children && open && (
                <div className="pr-9 pb-1 space-y-0.5">
                  {item.children.map((c) => (
                    <NavLink key={c.to} to={c.to} className={childClass} end={c.to === item.to}>
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[#ff8d78] hover:bg-white/5"
        >
          <FaSignOutAlt /> خروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
