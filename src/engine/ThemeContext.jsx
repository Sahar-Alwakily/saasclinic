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

/** ألوان وخطوط الثيم فقط — لا ترتيب أقسام. */
export function resolveThemeTokens(clinic = {}, themeVariant = 'beauty') {
  const variant = themeVariant || clinic.storeTheme || 'beauty';
  const primaryColor = clinic.primaryColor || '#C48B7A';
  const bgColor = clinic.bgColor || (variant === 'elegant' ? '#0C0B0A' : '#FBF4F0');
  const textColor = clinic.textColor || (variant === 'elegant' ? '#F5EDE3' : '#3A2A28');
  const fontFamily = clinic.fontFamily || (variant === 'elegant' ? 'serif' : 'Tajawal');
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
