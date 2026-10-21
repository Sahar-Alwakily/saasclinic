import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../dashboard/ThemeToggle';
import { useShellNav } from './shellNav';
import { FaBars } from 'react-icons/fa';

const Topbar = () => {
  const { clinicInfo, userRole, plan } = useClinic();
  const { user } = useAuth();
  const { setOpen } = useShellNav();
  const today = new Date().toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header className="saas-topbar sticky top-0 z-30 px-3 sm:px-5 md:px-8 py-3 flex items-center justify-between gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          className="lg:hidden shrink-0 w-11 h-11 rounded-xl bg-[#14121c] text-white flex items-center justify-center"
          aria-label="فتح القائمة"
          onClick={() => setOpen(true)}
        >
          <FaBars />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#4d7cff] font-semibold">workspace</p>
          <h1 className="font-product text-base sm:text-lg md:text-xl leading-tight truncate">{clinicInfo?.name || 'عيادة بدون اسم'}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-left text-xs text-stone-500 dark:text-stone-400">
          <p>{today}</p>
          <p className="text-[11px]">{userRole === 'admin' ? 'صلاحية مالك' : 'صلاحية تشغيل'}{plan?.name ? ` · ${plan.name}` : ''}{user?.email ? ` · ${user.email}` : ''}</p>
        </div>
        <span className="hidden md:inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#22c9a0]/15 text-[#0f766e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c9a0] animate-pulse" /> مباشر
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Topbar;
