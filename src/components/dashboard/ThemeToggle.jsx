import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyDashboardTheme, readDashboardThemeDark } from '../../utils/dashboardTheme';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => readDashboardThemeDark());

  useEffect(() => {
    applyDashboardTheme(isDark);
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      className="w-10 h-10 rounded-full bg-white text-[#111827] dark:bg-[#152029] dark:text-[#E8EEEA] flex items-center justify-center border border-[#ebeef2] dark:border-[#2A3944] transition"
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};

export default ThemeToggle;