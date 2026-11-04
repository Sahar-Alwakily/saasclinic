import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../dashboard/ThemeToggle';
import NotificationBell from './NotificationBell';
import { useShellNav } from './shellNav';
import { FaBars } from 'react-icons/fa';

const TITLES = [
  ['/appointments/waitlist', 'قائمة الانتظار'],
  ['/appointments/gaps', 'المواعيد المتاحة'],
  ['/appointments/reminders', 'التذكيرات والقواعد'],
  ['/appointments/schedule', 'دوام الموظفين'],
  ['/appointments/attendance', 'الحضور'],
  ['/appointments', 'الحجوزات'],
  ['/customers', 'العميلات'],
  ['/services', 'الخدمات'],
  ['/treatments', 'متابعة العلاجات'],
  ['/products', 'المنتجات'],
  ['/website', 'موقع العيادة'],
  ['/assistant', 'نورا الذكية'],
  ['/winback', 'استرجاع العميلات'],
  ['/marketing', 'التسويق'],
  ['/blog', 'المحتوى'],
  ['/orders', 'الطلبات'],
  ['/reports', 'التقارير'],
  ['/staff', 'الموظفات'],
  ['/branches', 'الفروع'],
  ['/team', 'الفريق والفروع'],
  ['/billing', 'المدفوعات'],
  ['/settings', 'الإعدادات'],
  ['/dashboard', 'الرئيسية'],
  ['/ops', 'تعبئة السجل'],
  ['/support', 'طلبات المنصة'],
];

function pageTitle(pathname, search) {
  if (pathname.startsWith('/customers/')) return 'ملف العميلة';
  const tab = new URLSearchParams(search).get('tab');
  if (pathname === '/settings' && tab === 'privacy') return 'الخصوصية';
  if (pathname === '/settings' && tab === 'integrations') return 'التكاملات';
  if (pathname === '/products' && tab === 'orders') return 'طلبيات المنتجات';
  if (pathname === '/website' && tab === 'blog') return 'مدونة الموقع';
  const hit = TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return hit ? hit[1] : 'مساحة العمل';
}

const Topbar = () => {
  const { clinicInfo, userRole } = useClinic();
  const { user } = useAuth();
  const { setOpen } = useShellNav();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const title = pageTitle(pathname, search);
  const [q, setQ] = useState('');
  const initial = (clinicInfo?.name || user?.email || 'ن').trim().charAt(0);

  return (
    <header className="saas-topbar sticky top-0 z-30 px-3 sm:px-6 h-16 flex items-center justify-between gap-3 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden shrink-0 w-10 h-10 rounded-2xl bg-[#111827] text-white flex items-center justify-center"
          aria-label="فتح القائمة"
          onClick={() => setOpen(true)}
        >
          <FaBars size={14} />
        </button>
        <h1 className="text-[17px] font-bold leading-tight truncate text-[#111827] dark:text-white">{title}</h1>
      </div>
      <form
        className="hidden md:flex items-center gap-2 nura-search px-4 h-10 w-[min(22rem,36vw)] text-[#6b7280]"
        onSubmit={(e) => {
          e.preventDefault();
          const next = q.trim();
          navigate(next ? `/customers` : '/dashboard');
        }}
      >
        <Search size={14} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث في العميلات…"
          className="flex-1 bg-transparent border-0 outline-none text-sm text-[#111827]"
        />
        <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white text-[#9ca3af]">Enter</kbd>
      </form>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-2 ps-1">
          <div className="w-9 h-9 rounded-full bg-[#ecfdf3] text-[#15803d] font-bold flex items-center justify-center text-sm">{initial}</div>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-bold text-[#111827] truncate max-w-[9rem]">{clinicInfo?.ownerName || clinicInfo?.name || 'العيادة'}</p>
            <p className="text-[11px] text-[#9ca3af]">{userRole === 'admin' ? 'مالكة' : 'تشغيل'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
