import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ShellNavContext } from './shellNav';

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

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
          <main className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Outlet />
          </main>
        </div>
      </div>
    </ShellNavContext.Provider>
  );
};

export default DashboardLayout;
