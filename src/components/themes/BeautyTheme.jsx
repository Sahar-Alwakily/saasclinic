import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMenu, FiX, FiShoppingBag, FiPlus, FiMapPin, FiInstagram, FiPhone, FiClock, FiArrowLeft } from "react-icons/fi";
import { FaWhatsapp, FaFacebookF, FaTiktok } from "react-icons/fa";
import {
  addToCart, fontStack, withAlpha, waLink, serviceDuration,
  clinicHeadline, clinicCopy,
  SKIN_PILLARS, SKIN_CONCERNS, VISIT_JOURNEY, GUEST_NOTES,
} from "./themeUtils";
import ThemeBlog from "./ThemeBlog";

export default function BeautyTheme({
  clinic, services, products, branches, posts, onOpenBooking, cart, setCart, setShowCart,
  primaryColor, bgColor, textColor, fontFamily, whyChooseUs, whyChooseUsTitle,
}) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { clinicId } = useParams();
  const name = clinic?.name || "عيادة العناية بالبشرة";
  const mainColor = primaryColor || "#C48B7A";
  const lightBg = bgColor || "#FBF4F0";
  const ink = textColor || "#3A2A28";
  const whatsapp = waLink(clinic?.whatsapp);
  const cartCount = cart.reduce((n, i) => n + (i.qty || 1), 0);
  const demo = !!clinic?._demo;
  const headline = clinicHeadline(clinic) || name;
  const copy = clinicCopy(clinic);

  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-x-hidden"
      style={{ fontFamily: fontStack(fontFamily), color: ink, backgroundColor: lightBg }}
    >
      <div className="pointer-events-none absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-50" style={{ background: withAlpha(mainColor, 0.32) }} />
      <div className="pointer-events-none absolute top-1/3 -right-20 w-96 h-96 rounded-full blur-3xl opacity-40" style={{ background: withAlpha(mainColor, 0.2) }} />

      {clinic?.specialty && (
        <div className="relative z-40 text-white text-center text-[11px] tracking-[0.22em] py-2.5 font-medium" style={{ backgroundColor: ink }}>
          {clinic.specialty}
        </div>
      )}

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/75 border-b" style={{ borderColor: withAlpha(mainColor, 0.12) }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            {clinic?.logoUrl
              ? <img src={clinic.logoUrl} alt="" className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-black/5" />
              : <div className="w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md font-display text-lg" style={{ backgroundColor: mainColor }}>✦</div>}
            <div>
              <p className="font-bold leading-tight">{name}</p>
              {clinic?.specialty && <p className="text-[10px] tracking-[0.2em] uppercase opacity-50">{clinic.specialty}</p>}
            </div>
          </a>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a href="#about" className="opacity-70 hover:opacity-100 transition">العيادة</a>
            {demo && <a href="#concerns" className="opacity-70 hover:opacity-100 transition">احتياجكِ</a>}
            <a href="#services" className="opacity-70 hover:opacity-100 transition">الجلسات</a>
            {clinic.showProducts !== false && products.length > 0 && <a href="#products" className="opacity-70 hover:opacity-100 transition">بوتيك العناية</a>}
            {clinic.showBlog !== false && <a href="#blog" className="opacity-70 hover:opacity-100 transition">المدونة</a>}
            {(clinic?.doctorName || clinic?.doctorBio) && <a href="#specialist" className="opacity-70 hover:opacity-100 transition">الأخصائية</a>}
            <a href="#visit" className="opacity-70 hover:opacity-100 transition">الفروع</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCart(true)} className="relative p-2.5 rounded-full bg-white/80 shadow-sm">
              <FiShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] w-5 h-5 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: mainColor }}>{cartCount}</span>
              )}
            </button>
            <button onClick={onOpenBooking} className="hidden md:inline-flex text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg" style={{ backgroundColor: mainColor }}>احجزي جلستكِ</button>
            <button onClick={() => setMobileMenu(true)} className="lg:hidden p-2"><FiMenu size={22} /></button>
          </div>
        </div>
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-[80] bg-[#3A2A28]/40 backdrop-blur-sm" onClick={() => setMobileMenu(false)}>
          <div className="absolute top-0 right-0 h-full w-80 bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileMenu(false)} className="mb-8"><FiX size={22} /></button>
            <div className="space-y-5 text-lg font-medium">
              <a href="#about" onClick={() => setMobileMenu(false)} className="block">العيادة</a>
              <a href="#services" onClick={() => setMobileMenu(false)} className="block">الجلسات</a>
              <a href="#specialist" onClick={() => setMobileMenu(false)} className="block">الأخصائية</a>
              {clinic.showBlog !== false && <a href="#blog" onClick={() => setMobileMenu(false)} className="block">المدونة</a>}
              <a href="#visit" onClick={() => setMobileMenu(false)} className="block">الفروع</a>
              <button onClick={() => { setMobileMenu(false); onOpenBooking(); }} className="w-full text-white py-3 rounded-full font-bold" style={{ backgroundColor: mainColor }}>احجزي جلستكِ</button>
            </div>
          </div>
        </div>
      )}

      <section className="px-5 pt-12 pb-20 md:pt-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-7 relative z-10 order-2 lg:order-1">
            {clinic?.specialty && (
              <p className="text-xs tracking-[0.35em] uppercase font-bold" style={{ color: mainColor }}>{clinic.specialty}</p>
            )}
            <h1 className="font-display text-5xl md:text-7xl leading-[1.08] font-semibold whitespace-pre-line">
              {headline.split('\n').map((line, i, arr) => (
                <span key={i} className="block" style={arr.length > 1 && i === arr.length - 1 ? { color: mainColor } : undefined}>{line}</span>
              ))}
            </h1>
            {copy && (
              <p className="text-lg leading-relaxed max-w-xl" style={{ color: withAlpha(ink, 0.78) }}>{copy}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={onOpenBooking} className="px-8 py-3.5 rounded-full text-white font-bold shadow-xl" style={{ backgroundColor: mainColor }}>احجزي استشارة البشرة</button>
              <a href="#services" className="px-8 py-3.5 rounded-full bg-white/90 border font-bold" style={{ borderColor: withAlpha(mainColor, 0.25) }}>اكتشفي الجلسات</a>
            </div>
            {demo && (
              <div className="flex flex-wrap gap-8 pt-2 text-sm">
                <div><p className="font-display text-3xl leading-none" style={{ color: mainColor }}>01</p><p className="opacity-60 mt-1">تشخيص فردي</p></div>
                <div><p className="font-display text-3xl leading-none" style={{ color: mainColor }}>VIP</p><p className="opacity-60 mt-1">غرف هادئة</p></div>
                <div><p className="font-display text-3xl leading-none" style={{ color: mainColor }}>Skin</p><p className="opacity-60 mt-1">خطة مكتوبة</p></div>
              </div>
            )}
          </motion.div>
          <div className="relative order-1 lg:order-2">
            <div className="aspect-[4/5] max-h-[580px] rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ background: `linear-gradient(160deg, ${withAlpha(mainColor, 0.45)}, #e8d5cc 45%, ${withAlpha(mainColor, 0.2)})` }}>
              {clinic?.heroImage
                ? <img src={clinic.heroImage} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-sm opacity-70 px-6 text-center bg-white/40">
                    <span className="font-display text-4xl">✦</span>
                    أضيفي صورة البانر من الإعدادات
                  </div>}
            </div>
          </div>
        </div>
      </section>

      {demo && <section id="concerns" className="px-5 pb-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: mainColor }}>ما الذي يقلقكِ في بشرتكِ؟</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {SKIN_CONCERNS.map((c) => (
              <a key={c.id} href="#services" className="shrink-0 px-4 py-2 rounded-full bg-white/80 border text-sm font-medium" style={{ borderColor: withAlpha(mainColor, 0.18) }}>
                {c.label}
              </a>
            ))}
          </div>
        </div>
      </section>}

      {demo && <section id="about" className="px-5 pb-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-5">
          {SKIN_PILLARS.map((item, i) => (
            <div key={i} className="bg-white/80 backdrop-blur rounded-[1.75rem] p-7 border shadow-sm" style={{ borderColor: withAlpha(mainColor, 0.12) }}>
              <p className="font-display text-3xl mb-3" style={{ color: mainColor }}>0{i + 1}</p>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed opacity-70">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>}

      {demo && <section className="px-5 pb-20">
        <div className="max-w-7xl mx-auto rounded-[2rem] p-8 md:p-12 border bg-white/60" style={{ borderColor: withAlpha(mainColor, 0.12) }}>
          <h2 className="font-display text-4xl mb-10">رحلة الزيارة</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {VISIT_JOURNEY.map((item) => (
              <div key={item.n}>
                <p className="font-display text-2xl mb-2" style={{ color: mainColor }}>{item.n}</p>
                <h3 className="font-bold text-lg mb-2">{item.t}</h3>
                <p className="text-sm leading-relaxed opacity-70">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {(clinic?.doctorName || clinic?.doctorBio) && (
        <section id="specialist" className="px-5 pb-20">
          <div className={`max-w-5xl mx-auto bg-white rounded-[2rem] p-8 md:p-12 gap-8 items-center border shadow-sm ${demo ? 'grid md:grid-cols-[1.1fr_1.4fr]' : ''}`} style={{ borderColor: withAlpha(mainColor, 0.12) }}>
            <div>
              <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: mainColor }}>أخصائية البشرة</p>
              <h2 className="font-display text-4xl mb-2">{clinic.doctorName || name}</h2>
              <p className="text-sm font-bold mb-4 opacity-70">{[clinic.degree, clinic.specialty].filter(Boolean).join(" · ")}</p>
              <p className="leading-relaxed opacity-80">{clinic.doctorBio}</p>
              <button onClick={onOpenBooking} className="mt-6 inline-flex items-center gap-2 text-sm font-bold" style={{ color: mainColor }}>
                احجزي معها <FiArrowLeft />
              </button>
            </div>
            {demo && (
              <div className="rounded-[1.5rem] p-6" style={{ backgroundColor: withAlpha(mainColor, 0.1) }}>
                <p className="font-bold mb-3">ماذا تتوقعين في زيارتكِ؟</p>
                <ul className="space-y-2 text-sm opacity-80">
                  <li>تحليل نوع البشرة والاحتياج الحالي</li>
                  <li>خطة جلسات واضحة بدون مبالغة</li>
                  <li>روتين منزلي يناسب منتجاتكِ</li>
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {whyChooseUs && (
        <section className="px-5 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-4xl mb-4">{whyChooseUsTitle || "لماذا تختارين عيادتنا؟"}</h2>
            <p className="text-lg leading-relaxed opacity-80">{whyChooseUs}</p>
          </div>
        </section>
      )}

      {clinic.showServices !== false && (
        <section id="services" className="px-5 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: mainColor }}>قائمة الجلسات</p>
                <h2 className="font-display text-4xl md:text-5xl">علاجات البشرة والتجميل</h2>
              </div>
              <button onClick={onOpenBooking} className="hidden md:block text-sm font-bold" style={{ color: mainColor }}>احجزي الآن ←</button>
            </div>
            {services.length === 0 ? (
              <div className="bg-white/70 rounded-3xl p-12 text-center border" style={{ borderColor: withAlpha(mainColor, 0.12) }}>
                <p className="font-bold mb-2">الجلسات تُحدَّث قريباً</p>
                <button onClick={onOpenBooking} className="mt-4 px-6 py-3 rounded-full text-white font-bold" style={{ backgroundColor: mainColor }}>احجزي استشارة</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((s) => (
                  <article key={s.id} className="text-right bg-white rounded-[1.75rem] p-6 border shadow-sm hover:-translate-y-1 transition duration-300" style={{ borderColor: withAlpha(mainColor, 0.1) }}>
                    {s.imageUrl && (
                      <div className="h-36 rounded-2xl overflow-hidden mb-4 bg-[#f6eee9]">
                        <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] tracking-widest uppercase opacity-50">جلسة تجميل</p>
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ backgroundColor: withAlpha(mainColor, 0.12), color: mainColor }}>{serviceDuration(s)}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{s.title || s.name}</h3>
                    {s.description && <p className="text-sm opacity-70 line-clamp-2 mb-4">{s.description}</p>}
                    {s.specialistName && <p className="text-xs opacity-50 mb-4">تقدّمها {s.specialistName}</p>}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-extrabold text-lg" style={{ color: mainColor }}>{s.price} ₪</span>
                      <div className="flex items-center gap-3 text-sm font-bold">
                        {clinicId && <Link to={`/book/${clinicId}/service/${s.id}`} style={{ color: mainColor }}>التفاصيل</Link>}
                        <button type="button" onClick={() => onOpenBooking({ serviceId: s.id })}>احجزي ←</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {clinic.showProducts !== false && products.length > 0 && (
        <section id="products" className="px-5 pb-20">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: mainColor }}>روتين منزلي</p>
            <h2 className="font-display text-4xl mb-10">بوتيك العناية</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-[1.5rem] p-3 border" style={{ borderColor: withAlpha(mainColor, 0.1) }}>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-[#f6eee9] mb-3">
                    {p.imageUrl || p.image ? <img src={p.imageUrl || p.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-40">عناية</div>}
                  </div>
                  <h3 className="font-bold text-sm mb-1 line-clamp-1">{p.title}</h3>
                  <p className="font-bold mb-3" style={{ color: mainColor }}>{p.price} ₪</p>
                  <button onClick={() => addToCart(setCart, p)} className="w-full py-2 rounded-full text-white text-sm font-bold flex items-center justify-center gap-1" style={{ backgroundColor: mainColor }}>
                    <FiPlus size={14} /> أضيفي للسلة
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {demo && <section className="px-5 pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl mb-8">من غرفة العيادة</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {GUEST_NOTES.map((n) => (
              <blockquote key={n.name} className="bg-white/80 rounded-[1.75rem] p-7 border" style={{ borderColor: withAlpha(mainColor, 0.12) }}>
                <p className="leading-relaxed mb-4">“{n.quote}”</p>
                <footer className="text-xs tracking-wide opacity-50">{n.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>}

      <ThemeBlog posts={posts} enabled={clinic.showBlog} accent={mainColor} variant="beauty" />

      <section id="visit" className="px-5 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-5">
          <div className="md:col-span-1 bg-white rounded-[1.75rem] p-7 border" style={{ borderColor: withAlpha(mainColor, 0.1) }}>
            <h2 className="font-display text-3xl mb-4">فروع العيادة</h2>
            {clinic?.phone && <p className="flex items-center gap-2 text-sm opacity-80 mb-3" dir="ltr"><FiPhone /> {clinic.phone}</p>}
            <p className="flex items-center gap-2 text-sm opacity-80"><FiClock /> حجوزات خاصة حسب الموعد</p>
            <button onClick={onOpenBooking} className="mt-6 w-full py-3 rounded-full text-white font-bold" style={{ backgroundColor: mainColor }}>احجزي موعداً</button>
          </div>
          <div className="md:col-span-2 grid gap-4">
            {branches.length === 0 && <p className="text-sm opacity-60 p-5">أضيفي الفروع من لوحة التحكم لتظهر هنا.</p>}
            {branches.map((b) => (
              <Link key={b.id} to={clinicId ? `/book/${clinicId}/branch/${b.id}` : '#'} className="bg-white/80 rounded-2xl p-5 flex items-center gap-4 border" style={{ borderColor: withAlpha(mainColor, 0.08) }}>
                <div className="w-11 h-11 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: mainColor }}><FiMapPin /></div>
                <div>
                  <h3 className="font-bold">{b.name}</h3>
                  <p className="text-sm opacity-70">{b.address}</p>
                  {b.phone && <p className="text-xs opacity-50 mt-1" dir="ltr">{b.phone}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-5 py-12 bg-[#3A2A28] text-[#F8EDE8]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="font-display text-3xl mb-2">{name}</p>
            {copy && <p className="text-sm opacity-70 max-w-sm">{copy}</p>}
          </div>
          <div className="flex gap-3">
            {clinic?.instagram && <a href={clinic.instagram} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><FiInstagram /></a>}
            {clinic?.facebook && <a href={clinic.facebook} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><FaFacebookF /></a>}
            {clinic?.tiktok && <a href={clinic.tiktok} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><FaTiktok /></a>}
          </div>
        </div>
        <p className="max-w-7xl mx-auto text-xs opacity-40 mt-8">© {new Date().getFullYear()} {name}</p>
      </footer>

      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noreferrer" className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xl">
          <FaWhatsapp size={26} />
        </a>
      )}
    </div>
  );
}
