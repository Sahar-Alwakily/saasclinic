import React, { useEffect, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('dashboard-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('dashboard-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('dashboard-theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-gray-600 dark:text-yellow-300 flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
    >
      {isDark ? <FaSun className="text-base" /> : <FaMoon className="text-base" />}
    </button>
  );
};

export default ThemeToggle;