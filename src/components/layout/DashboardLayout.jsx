import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  return (
    <div dir="rtl" className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;