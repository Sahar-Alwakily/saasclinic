import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartPie, FaCalendarAlt, FaUsers, FaSpa, FaRobot, FaPaperPlane, FaGlobe,
  FaBullhorn, FaChartBar, FaUserTie, FaCreditCard, FaCog, FaSignOutAlt, FaTimes, FaClipboardList,
  FaBoxOpen,
} from 'react-icons/fa';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import { useShellNav } from './shellNav';

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[13.5px] font-medium transition-colors ${
    isActive
      ? 'bg-[#10b981] text-white shadow-sm'
      : 'text-[#6b7280] hover:text-[#047857] hover:bg-[#ecfdf5]'
  }`;

const childClass = ({ isActive }) =>
  `block px-3 py-1.5 rounded-xl text-[12px] ${
    isActive ? 'text-[#047857] font-semibold bg-[#ecfdf5]' : 'text-[#9ca3af] hover:text-[#047857]'
  }`;

const NAV = [
  { group: 'القائمة' },
  { to: '/dashboard', label: 'الرئيسية', icon: FaChartPie },
  {
    to: '/appointments',
    label: 'المواعيد',
    icon: FaCalendarAlt,
    children: [
      { to: '/appointments', label: 'الحجوزات' },
      { to: '/appointments/waitlist', label: 'قائمة الانتظار', cap: 'ops' },
      { to: '/appointments/gaps', label: 'المواعيد المتاحة', cap: 'ops' },
      { to: '/appointments/reminders', label: 'التذكيرات والقواعد', cap: 'ops' },
      { to: '/appointments/schedule', label: 'دوام الموظفين' },
      { to: '/appointments/attendance', label: 'الحضور' },
    ],
  },
  {
    to: '/customers',
    label: 'العميلات',
    icon: FaUsers,
    admin: true,
    children: [
      { to: '/customers', label: 'الملفات' },
      { to: '/treatments', label: 'متابعة العلاجات', cap: 'treatments' },
    ],
  },
  { to: '/services', label: 'الخدمات', icon: FaSpa },
  {
    to: '/products',
    label: 'المنتجات',
    icon: FaBoxOpen,
    admin: true,
    children: [
      { to: '/products', label: 'الكتالوج' },
      { to: '/products?tab=orders', label: 'الطلبيات' },
    ],
  },
  {
    to: '/website',
    label: 'موقع العيادة',
    icon: FaGlobe,
    admin: true,
    children: [
      { to: '/website', label: 'معلومات الموقع' },
      { to: '/website?tab=blog', label: 'المدونة' },
    ],
  },
  { to: '/assistant', label: 'نورا الذكية', icon: FaRobot, admin: true, cap: 'assistant' },
  { to: '/winback', label: 'استرجاع العميلات', icon: FaPaperPlane, admin: true, cap: 'winback' },
  {
    to: '/marketing',
    label: 'التسويق',
    icon: FaBullhorn,
    admin: true,
    cap: 'marketing',
    children: [
      { to: '/marketing', label: 'نظرة الحملات' },
    ],
  },
  { group: 'الإعدادات' },
  { to: '/reports', label: 'التقارير', icon: FaChartBar, admin: true },
  {
    to: '/team',
    label: 'الفريق والفروع',
    icon: FaUserTie,
    admin: true,
    children: [
      { to: '/staff', label: 'الموظفات' },
      { to: '/branches', label: 'الفروع والجداول' },
    ],
  },
  { to: '/billing', label: 'المدفوعات', icon: FaCreditCard, admin: true },
  { to: '/support', label: 'طلبات المنصة', icon: FaClipboardList, admin: true },
  {
    to: '/settings',
    label: 'الإعدادات',
    icon: FaCog,
    admin: true,
    children: [
      { to: '/settings', label: 'بيانات العيادة' },
      { to: '/settings?tab=privacy', label: 'الخصوصية' },
      { to: '/settings?tab=whatsapp', label: 'واتساب' },
      { to: '/settings?tab=integrations', label: 'التكاملات' },
    ],
  },
];

const Sidebar = () => {
  const { clinicInfo, isAdmin, hasCap = () => false } = useClinic();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const childIsActive = (to) => {
    const [path, qs] = String(to).split('?');
    if (path === '/appointments') return pathname === '/appointments';
    if (path === '/customers') return pathname === '/customers' || pathname.startsWith('/customers/');
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
    const want = new URLSearchParams(qs || '');
    const have = new URLSearchParams(search);
    if (!qs) return !have.get('tab');
    return [...want.entries()].every(([k, v]) => have.get(k) === v);
  };

  const { open, setOpen } = useShellNav();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visible = NAV.filter((item) => {
    if (item.group) return true;
    return (!item.admin || isAdmin) && (!item.cap || hasCap(item.cap));
  }).map((item) => (
    item.group ? item : { ...item, children: item.children?.filter((c) => !c.cap || hasCap(c.cap)) }
  ));

  const groups = [];
  let current = null;
  visible.forEach((item) => {
    if (item.group) {
      current = { label: item.group, items: [] };
      groups.push(current);
      return;
    }
    if (!current) {
      current = { label: '', items: [] };
      groups.push(current);
    }
    current.items.push(item);
  });

  return (
    <aside
      className={`saas-rail fixed lg:sticky top-0 right-0 z-50 h-dvh w-[min(15.5rem,88vw)] flex flex-col border-l pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="px-4 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#16a34a] text-white text-sm font-bold flex items-center justify-center">ن</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-none text-[#111827]">نورا</p>
          <p className="text-[11px] text-[#9ca3af] mt-1 truncate">{clinicInfo?.name || 'تشغيل العيادة'}</p>
        </div>
        <button type="button" className="lg:hidden p-2 text-[#6b7280]" aria-label="إغلاق" onClick={() => setOpen(false)}>
          <FaTimes />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        {groups.filter((g) => g.items.length).map((group) => (
          <div key={group.label || 'root'} className="mb-4">
            {group.label && (
              <p className="px-3 pt-2 pb-2 text-[10px] tracking-[0.18em] uppercase text-[#c0c5cc]">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const childActive = item.children?.some((c) => childIsActive(c.to));
                const sectionOpen = pathname === item.to || pathname.startsWith(`${item.to}/`) || childActive;
                return (
                  <div key={item.to}>
                    <NavLink to={item.to} className={({ isActive }) => linkClass({ isActive: isActive || sectionOpen })}>
                      <Icon className="shrink-0 text-[13px] opacity-80" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                    {item.children && sectionOpen && (
                      <div className="me-3 ms-8 my-1 space-y-0.5">
                        {item.children.map((c) => (
                          <Link key={c.to} to={c.to} className={childClass({ isActive: childIsActive(c.to) })}>
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] text-[#6b7280] hover:bg-[#f3f5f7]"
        >
          <FaSignOutAlt /> خروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
