import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../dashboard/ThemeToggle';

const Topbar = () => {
  const { clinicInfo, userRole } = useClinic();
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header className="saas-topbar sticky top-0 z-30 px-5 md:px-8 py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#4d7cff] font-semibold">workspace</p>
        <h1 className="font-product text-lg md:text-xl leading-tight">{clinicInfo?.name || 'عيادة بدون اسم'}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-left text-xs text-stone-500 dark:text-stone-400">
          <p>{today}</p>
          <p className="text-[11px]">{userRole === 'admin' ? 'صلاحية مالك' : 'صلاحية تشغيل'}{user?.email ? ` · ${user.email}` : ''}</p>
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
