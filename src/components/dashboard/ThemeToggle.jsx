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
      className="w-10 h-10 rounded-2xl bg-[#14121c] text-[#f0b429] dark:bg-[#fffcf7] dark:text-[#14121c] flex items-center justify-center border border-black/10 hover:scale-105 transition"
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
    >
      {isDark ? <FaSun className="text-base" /> : <FaMoon className="text-base" />}
    </button>
  );
};

export default ThemeToggle;