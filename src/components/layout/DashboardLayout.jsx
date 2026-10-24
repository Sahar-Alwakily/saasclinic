import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ShellNavContext } from './shellNav';
import { useClinic } from '../../context/ClinicContext';
import ConsoleChat from '../assistant/ConsoleChat';

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { plan, trialExpired } = useClinic();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <ShellNavContext.Provider value={{ open, setOpen }}>
      <div dir="rtl" className="saas-app flex min-h-dvh font-sans overflow-x-clip">
        {open && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <Sidebar />
        <div className="flex-1 min-w-0 min-h-dvh overflow-y-auto overflow-x-clip">
          <Topbar />
          {trialExpired && (
            <div className="mx-3 sm:mx-5 lg:mx-8 mt-3 rounded-xl bg-[#fff4e5] text-[#9a3412] text-sm px-4 py-2 flex flex-wrap justify-between gap-2">
              <span>انتهت الفترة التجريبية — الكونسول مفتوح حتى ربط الدفع. اختاري باقة لتثبيت الأقسام.</span>
              <Link to="/billing" className="font-bold">الباقات</Link>
            </div>
          )}
          {plan?.id && plan.id !== 'trial' && (
            <p className="mx-3 sm:mx-5 lg:mx-8 mt-2 text-[11px] text-stone-400">باقة {plan.name}</p>
          )}
          <main className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Outlet />
          </main>
          <ConsoleChat />
        </div>
      </div>
    </ShellNavContext.Provider>
  );
};

export default DashboardLayout;
