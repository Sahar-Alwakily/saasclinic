import React from 'react';
import { SECTION_REGISTRY } from '../sections';
import { ThemeProvider, resolveThemeTokens } from './ThemeContext';
import SiteChrome from './SiteChrome';
import { withAlpha } from '../components/themes/themeUtils';

/**
 * يعرض clinic.sections بالترتيب المخزّن فقط.
 * الأقسام غير المرئية أو غير المسجّلة تُتخطى.
 */
export default function SectionRenderer({
  sections = [],
  clinic,
  services,
  products,
  branches,
  posts,
  onOpenBooking,
  cart,
  setCart,
  setShowCart,
  themeVariant,
}) {
  const tokens = resolveThemeTokens(clinic, themeVariant);
  const beauty = (themeVariant || tokens.themeVariant) === 'beauty';
  const theme = {
    ...tokens,
    clinic,
    services,
    products,
    branches,
    posts,
    onOpenBooking,
    cart,
    setCart,
    setShowCart,
  };

  const list = Array.isArray(sections) ? sections : [];

  return (
    <ThemeProvider value={theme}>
      <div
        dir="rtl"
        className="min-h-screen relative overflow-x-hidden"
        style={{ fontFamily: tokens.font, color: tokens.textColor, backgroundColor: tokens.bgColor }}
      >
        {!beauty && (
          <div className="pointer-events-none absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-50" style={{ background: withAlpha(tokens.primaryColor, 0.32) }} />
        )}
        <SiteChrome>
          {list.map((block) => {
            if (!block || block.visible === false) return null;
            const Cmp = SECTION_REGISTRY[block.type];
            if (!Cmp) return null;
            return <Cmp key={block.id} settings={block.settings || {}} section={block} />;
          })}
        </SiteChrome>
      </div>
    </ThemeProvider>
  );
}
