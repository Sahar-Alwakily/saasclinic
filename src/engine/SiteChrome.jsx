import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiMenu, FiX, FiShoppingBag } from 'react-icons/fi';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from './ThemeContext';

/** هيكل الصفحة (ترويسة وتذييل) — ليس قسماً قابلاً للترتيب. */
export default function SiteChrome({ children }) {
  const { clinic, cart, setShowCart, onOpenBooking, primaryColor, textColor, isDark } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const { clinicId } = useParams();
  const name = clinic?.name || 'العيادة';
  const cartCount = (cart || []).reduce((n, i) => n + (i.qty || 1), 0);
  const ink = textColor;
  const headerBg = isDark ? 'rgba(12,11,10,0.88)' : 'rgba(255,255,255,0.75)';

  return (
    <>
      {clinic?.specialty && (
        <div className="relative z-40 text-center text-[11px] tracking-[0.22em] py-2.5 font-medium" style={{ backgroundColor: isDark ? '#141210' : ink, color: isDark ? '#F5EDE3' : '#fff' }}>
          {clinic.specialty}
        </div>
      )}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: headerBg, borderColor: withAlpha(primaryColor, 0.12), color: ink }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-3">
            {clinic?.logoUrl
              ? <img src={clinic.logoUrl} alt="" className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-black/5" />
              : <div className="w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md font-display text-lg" style={{ backgroundColor: primaryColor }}>✦</div>}
            <div>
              <p className="font-bold leading-tight">{name}</p>
              {clinic?.specialty && <p className="text-[10px] tracking-[0.2em] uppercase opacity-50">{clinic.specialty}</p>}
            </div>
          </a>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a href="#hero" className="opacity-70 hover:opacity-100">العيادة</a>
            <a href="#services" className="opacity-70 hover:opacity-100">الجلسات</a>
            <a href="#doctors" className="opacity-70 hover:opacity-100">الأخصائية</a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCart(true)} className="relative p-2.5 rounded-full shadow-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)' }}>
              <FiShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] w-5 h-5 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: primaryColor }}>{cartCount}</span>
              )}
            </button>
            <button type="button" onClick={() => onOpenBooking()} className="hidden sm:inline-flex text-white px-3 md:px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>احجزي</button>
            <button type="button" onClick={() => setMobileMenu(true)} className="lg:hidden p-2 min-w-11 min-h-11 flex items-center justify-center" aria-label="القائمة"><FiMenu size={22} /></button>
          </div>
        </div>
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenu(false)}>
          <div className="absolute top-0 right-0 h-full w-[min(20rem,88vw)] p-8 shadow-2xl" style={{ backgroundColor: isDark ? '#141210' : '#fff', color: ink }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setMobileMenu(false)} className="mb-8"><FiX size={22} /></button>
            <div className="space-y-5 text-lg font-medium">
              <a href="#hero" onClick={() => setMobileMenu(false)} className="block">العيادة</a>
              <a href="#services" onClick={() => setMobileMenu(false)} className="block">الجلسات</a>
              <a href="#doctors" onClick={() => setMobileMenu(false)} className="block">الأخصائية</a>
              <button type="button" onClick={() => { setMobileMenu(false); onOpenBooking(); }} className="w-full text-white py-3 rounded-full font-bold" style={{ backgroundColor: primaryColor }}>احجزي جلستكِ</button>
            </div>
          </div>
        </div>
      )}

      {children}

      <footer className="px-5 py-12" style={{ backgroundColor: isDark ? '#141210' : '#3A2A28', color: '#F8EDE8' }}>
        <div className="max-w-7xl mx-auto">
          <p className="font-display text-3xl mb-2">{name}</p>
          {clinicId && <p className="text-xs opacity-40 mt-8">© {new Date().getFullYear()} {name}</p>}
        </div>
      </footer>
    </>
  );
}
