import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaChartPie, FaUserTie, FaCalendarAlt, FaUsers, FaCog, FaSignOutAlt, FaUserMd, FaNotesMedical, FaBlog, FaStore } from 'react-icons/fa';
import { useClinic } from '../../context/ClinicContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../dashboard/ThemeToggle';

const Sidebar = () => {
  const { clinicInfo, isAdmin } = useClinic();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
      isActive
        ? 'bg-pink-500 text-white shadow-md'
        : 'text-gray-600 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-400'
    }`;

  return (
    <div className="w-64 bg-white dark:bg-slate-800 h-screen border-l border-gray-100 dark:border-slate-700 flex flex-col shadow-sm sticky top-0 transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center text-xl shadow-md">
          🩺
        </div>
        <div>
          <h2 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">نظام العيادات</h2>
          <p className="text-[10px] text-gray-400 truncate w-36">{clinicInfo?.name || 'جاري التحميل...'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <NavLink to="/dashboard" end className={linkClass}>
          <FaChartPie /> لوحة التحكم
        </NavLink>
        <NavLink to="/appointments" className={linkClass}>
          <FaCalendarAlt /> المواعيد والحجوزات
        </NavLink>
        <NavLink to="/treatments" className={linkClass}>
          <FaNotesMedical /> متابعة العلاجات
        </NavLink>

        <NavLink to="/services" className={linkClass}>
          <FaUserMd /> الخدمات والمنتجات
        </NavLink>
        <NavLink to="/blog" className={linkClass}>
          <FaBlog /> المدونة
        </NavLink>

        {isAdmin && (
          <>
            <NavLink to="/customers" className={linkClass}>
              <FaUsers /> ملفات العملاء
            </NavLink>

            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
              <p className="px-4 text-xs font-bold text-gray-400 mb-2">الإدارة</p>
              
              <NavLink to="/branches" className={linkClass}>
                <FaStore /> الفروع
              </NavLink>

              <NavLink to="/staff" className={linkClass}>
                <FaUserTie /> الموظفين
              </NavLink>
              
              <NavLink to="/settings" className={linkClass}>
                <FaCog /> الإعدادات
              </NavLink>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-all font-medium text-sm"
        >
          <FaSignOutAlt /> تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

export default Sidebar;