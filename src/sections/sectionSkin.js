import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';

/** أنماط مشتركة حسب themeVariant — ألوان من السياق فقط. */
export function useSectionSkin() {
  const { themeVariant, primaryColor, textColor, isDark } = useTheme();
  const elegant = themeVariant === 'elegant';
  const minimal = themeVariant === 'minimal';
  return {
    elegant,
    minimal,
    primaryColor,
    textColor,
    isDark,
    radius: elegant ? 'rounded-none' : minimal ? 'rounded-lg' : 'rounded-[1.75rem]',
    cardBg: isDark ? withAlpha('#ffffff', 0.06) : '#ffffff',
    border: withAlpha(primaryColor, elegant ? 0.22 : 0.12),
    wrap: 'px-5 pb-20',
    inner: 'max-w-7xl mx-auto',
    kicker: 'text-xs tracking-[0.3em] uppercase mb-2',
    title: elegant ? 'font-display text-5xl mb-8' : 'font-display text-4xl mb-8',
  };
}
