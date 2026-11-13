import React, { createContext, useContext } from 'react';
import { fontStack } from '../components/themes/themeUtils';

const ThemeContext = createContext(null);

export function ThemeProvider({ value, children }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme يجب أن يُستدعى داخل ThemeProvider');
  return ctx;
}

function pick(value, legacy, next) {
  if (!value) return next;
  if (String(value).toLowerCase() === String(legacy).toLowerCase()) return next;
  return value;
}

/** ألوان وخطوط الثيم فقط — لا ترتيب أقسام. */
export function resolveThemeTokens(clinic = {}, themeVariant = 'beauty') {
  const variant = themeVariant || clinic.storeTheme || 'beauty';
  const beauty = variant === 'beauty';
  const primaryColor = beauty
    ? pick(clinic.primaryColor, '#C48B7A', '#3B82F6')
    : (clinic.primaryColor || '#C48B7A');
  const bgColor = beauty
    ? pick(clinic.bgColor, '#FBF4F0', '#EFF6FF')
    : (clinic.bgColor || (variant === 'elegant' ? '#0C0B0A' : '#FBF4F0'));
  const textColor = beauty
    ? pick(clinic.textColor, '#3A2A28', '#1F2937')
    : (clinic.textColor || (variant === 'elegant' ? '#F5EDE3' : '#3A2A28'));
  const fontFamily = beauty
    ? pick(clinic.fontFamily, 'Tajawal', 'Cairo')
    : (clinic.fontFamily || (variant === 'elegant' ? 'serif' : 'Tajawal'));
  return {
    themeVariant: variant,
    primaryColor,
    bgColor,
    textColor,
    fontFamily,
    font: fontStack(fontFamily),
    isDark: variant === 'elegant',
  };
}
