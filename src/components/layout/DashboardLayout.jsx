import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const DashboardLayout = () => {
  return (
    <div dir="rtl" className="saas-app flex min-h-screen font-sans">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-auto">
        <Topbar />
        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
