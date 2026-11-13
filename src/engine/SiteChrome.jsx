import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiMenu, FiX, FiShoppingBag } from 'react-icons/fi';
import { FaGem, FaShoppingBag, FaBars, FaTimes } from 'react-icons/fa';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from './ThemeContext';
import { SITE_POLICIES } from '../utils/sitePolicies';
import { placeLabel, publicEmail, publicPhones, publicPlaces } from '../utils/publicPlaces';

function SitePolicies({ clinic, primaryColor }) {
  const items = SITE_POLICIES
    .map((item) => ({ ...item, text: String(clinic?.[item.key] || '').trim() }))
    .filter((item) => item.text);
  if (!items.length) return null;
  return (
    <section id="policies" className="relative z-10 max-w-7xl mx-auto px-5 py-12">
      <h2 className="font-bold text-xl mb-4">سياسات العيادة</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border p-4" style={{ borderColor: withAlpha(primaryColor, 0.2) }}>
            <h3 className="font-bold mb-1">{item.label}</h3>
            <p className="text-sm whitespace-pre-wrap opacity-80">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BeautyChrome({ children }) {
  const { clinic, cart, setShowCart, onOpenBooking, primaryColor, services = [], branches = [] } = useTheme();
  const places = publicPlaces(clinic, branches);
  const phones = publicPhones(clinic, places);
  const email = publicEmail(clinic);
  const [showMenu, setShowMenu] = useState(false);
  const { clinicId } = useParams();
  const name = clinic?.name || 'العيادة';
  const doctor = clinic?.doctorName || name;
  const cartCount = (cart || []).reduce((n, i) => n + (i.qty || 1), 0);
  const showProducts = clinic?.showProducts !== false;
  const showBlog = clinic?.showBlog !== false;

  const navLinks = [
    { href: '#contact', text: 'اتصل بنا' },
    ...(showBlog ? [{ href: '#blog', text: 'المدونة' }] : []),
    { href: '#book', text: 'احجزي الآن', special: true },
    { href: '#services', text: 'الخدمات' },
    ...(showProducts ? [{ href: '#products', text: 'المنتجات' }] : []),
    { href: '#hero', text: 'الرئيسية' },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 mx-auto my-3 max-w-7xl px-4">
        <div
          className="flex items-center justify-between rounded-2xl backdrop-blur-xl bg-white/85 px-5 py-2.5 border shadow-sm"
          style={{ borderColor: withAlpha(primaryColor, 0.25) }}
        >
          <a href="#hero" className="flex items-center gap-2 group">
            {clinic?.logoUrl ? (
              <img src={clinic.logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shadow-md" />
            ) : (
              <div
                className="w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
              >
                <FaGem />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-gray-800 leading-tight">{doctor}</p>
              <p className="text-[10px] text-gray-500">{clinic?.specialty || name}</p>
            </div>
          </a>

          <ul className="hidden md:flex items-center gap-1 font-medium">
            {navLinks.map((link) => (
              <li key={link.href + link.text}>
                {link.special ? (
                  <button
                    type="button"
                    onClick={() => onOpenBooking()}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm text-white shadow-md hover:shadow-lg hover:scale-[1.03] transition-all"
                    style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
                  >
                    {link.text}
                  </button>
                ) : (
                  <a
                    href={link.href}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm text-gray-600 transition-all"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = withAlpha(primaryColor, 0.1);
                      e.currentTarget.style.color = primaryColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }}
                  >
                    {link.text}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative p-2.5 rounded-full transition-colors"
              style={{ backgroundColor: withAlpha(primaryColor, 0.1), color: primaryColor }}
              onClick={() => setShowCart(true)}
            >
              <FaShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md"
                  style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
                >
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="md:hidden p-2.5 rounded-full"
              style={{ backgroundColor: withAlpha(primaryColor, 0.1), color: primaryColor }}
              onClick={() => setShowMenu(true)}
              aria-label="القائمة"
            >
              <FaBars className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-24" />

      {showMenu && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" className="absolute inset-0 bg-black/20" aria-label="إغلاق" onClick={() => setShowMenu(false)} />
          <div
            className="absolute top-0 right-0 w-full sm:w-80 h-full backdrop-blur-xl shadow-2xl p-6 flex flex-col gap-6"
            style={{ background: `linear-gradient(to bottom, ${withAlpha(primaryColor, 0.08)}, #fff)` }}
            dir="rtl"
          >
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="p-2 rounded-full"
                style={{ backgroundColor: withAlpha(primaryColor, 0.15), color: primaryColor }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 w-full mt-4">
              {navLinks.map((link) => (
                link.special ? (
                  <button
                    key={link.text}
                    type="button"
                    onClick={() => { setShowMenu(false); onOpenBooking(); }}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-md"
                    style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
                  >
                    {link.text}
                  </button>
                ) : (
                  <a
                    key={link.href + link.text}
                    href={link.href}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center justify-center py-3 px-4 rounded-xl w-full text-sm font-semibold bg-white/70 text-gray-800"
                  >
                    {link.text}
                  </a>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 sm:mx-[10%]">{children}</div>

      <SitePolicies clinic={clinic} primaryColor={primaryColor} />

      <div className="bg-gradient-to-b from-white to-gray-50 pt-20 pb-10 px-4 md:px-10" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                {clinic?.logoUrl
                  ? <img className="w-20 h-20 object-contain" src={clinic.logoUrl} alt="" />
                  : (
                    <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                      <FaGem />
                    </div>
                  )}
                <span className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>
                  {doctor}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {clinic?.storeDescription || clinic?.doctorBio || `نقدّم في ${name} خدمات التجميل والعناية التي تهدف إلى تعزيز جمالكِ الطبيعي.`}
              </p>
            </div>
            {services.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>
                خدماتنا
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {services.slice(0, 12).map((s) => (
                  <div key={s.id} className="flex items-center group gap-2">
                    <span className="w-2 h-2 rounded-full group-hover:animate-pulse" style={{ backgroundColor: primaryColor }} />
                    <span className="text-gray-600 text-sm">{s.title || s.name}</span>
                  </div>
                ))}
              </div>
            </div>
            )}
            <div className="space-y-6">
              <h3 className="text-xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>
                تواصلي معنا
              </h3>
              <div className="space-y-4">
                {phones.map((phone) => (
                  <p key={phone} className="text-gray-600 text-base" dir="ltr">{phone}</p>
                ))}
                {email && (
                  <p className="text-gray-600 text-base" dir="ltr">{email}</p>
                )}
                {places.map((place) => (
                  <p key={place.id} className="text-gray-600 text-sm">
                    {placeLabel(place)}{place.hours ? ` · ${place.hours}` : ''}
                  </p>
                ))}
                <button
                  type="button"
                  onClick={() => onOpenBooking(places[0] ? { branchId: places[0].id, branchName: places[0].name } : {})}
                  className="text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  احجزي موعدك الآن ✨
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 my-8" />
          <p className="text-center text-sm text-gray-500">
            حقوق النشر © {new Date().getFullYear()} <span className="font-semibold" style={{ color: primaryColor }}>{name}</span>
            {clinicId ? ' — جميع الحقوق محفوظة' : ''}
          </p>
        </div>
      </div>
    </>
  );
}

export default function SiteChrome({ children }) {
  const { clinic, cart, setShowCart, onOpenBooking, primaryColor, textColor, isDark, themeVariant } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const { clinicId } = useParams();
  const name = clinic?.name || 'العيادة';
  const cartCount = (cart || []).reduce((n, i) => n + (i.qty || 1), 0);
  const ink = textColor;
  const headerBg = isDark ? 'rgba(12,11,10,0.88)' : 'rgba(255,255,255,0.75)';

  if (themeVariant === 'beauty') {
    return <BeautyChrome>{children}</BeautyChrome>;
  }

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

      <SitePolicies clinic={clinic} primaryColor={primaryColor} />

      <footer className="px-5 py-12" style={{ backgroundColor: isDark ? '#141210' : '#3A2A28', color: '#F8EDE8' }}>
        <div className="max-w-7xl mx-auto">
          <p className="font-display text-3xl mb-2">{name}</p>
          {clinicId && <p className="text-xs opacity-40 mt-8">© {new Date().getFullYear()} {name}</p>}
        </div>
      </footer>
    </>
  );
}
