const STORAGE_KEY = 'dashboard-theme';

export function readDashboardThemeDark() {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyDashboardTheme(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    localStorage.setItem(STORAGE_KEY, 'dark');
  } else {
    root.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY, 'light');
  }
}

/** Apply saved theme as early as possible (before React paint). */
export function initDashboardTheme() {
  applyDashboardTheme(readDashboardThemeDark());
}