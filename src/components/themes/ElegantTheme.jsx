import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMenu, FiX, FiShoppingBag, FiPlus, FiMapPin, FiInstagram } from "react-icons/fi";
import { FaWhatsapp, FaFacebookF, FaTiktok } from "react-icons/fa";
import { addToCart, fontStack, withAlpha, waLink, serviceDuration, clinicHeadline, clinicCopy, VISIT_JOURNEY, GUEST_NOTES } from "./themeUtils";
import ThemeBlog from "./ThemeBlog";

export default function ElegantTheme({
  clinic, services, products, branches, posts, onOpenBooking, cart, setCart, setShowCart,
  primaryColor, bgColor, textColor, fontFamily, whyChooseUs, whyChooseUsTitle,
}) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { clinicId } = useParams();
  const name = clinic?.name || "Maison de Beauté";
  const gold = primaryColor || "#C9A66B";
  const bg = bgColor || "#0C0B0A";
  const ink = textColor || "#F5EDE3";
  const whatsapp = waLink(clinic?.whatsapp);
  const cartCount = cart.reduce((n, i) => n + (i.qty || 1), 0);
  const demo = !!clinic?._demo;
  const headline = clinicHeadline(clinic) || name;
  const copy = clinicCopy(clinic);

  return (
    <div dir="rtl" className="min-h-screen" style={{ fontFamily: fontStack(fontFamily), color: ink, backgroundColor: bg }}>
      {clinic?.specialty && (
        <div className="text-center text-[10px] tracking-[0.45em] uppercase py-2.5" style={{ backgroundColor: gold, color: "#0C0B0A" }}>
          {clinic.specialty}
        </div>
      )}

      <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ backgroundColor: withAlpha(bg, 0.9), borderColor: withAlpha(gold, 0.22) }}>
        <div className="max-w-7xl mx-auto px-5 py-5 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            {clinic?.logoUrl
              ? <img src={clinic.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: `1px solid ${gold}` }} />
              : <div className="w-10 h-10 rounded-full border flex items-center justify-center font-display" style={{ borderColor: gold, color: gold }}>◇</div>}
            <div>
              <p className="font-display text-2xl leading-none tracking-wide">{name}</p>
              {clinic?.specialty && <p className="text-[10px] tracking-[0.35em] uppercase mt-1" style={{ color: gold }}>{clinic.specialty}</p>}
            </div>
          </a>
          <nav className="hidden lg:flex items-center gap-8 text-xs tracking-[0.18em] uppercase">
            {demo && <a href="#ritual" className="opacity-70 hover:opacity-100">الطقوس</a>}
            <a href="#services" className="opacity-70 hover:opacity-100">الجلسات</a>
            {clinic.showProducts !== false && products.length > 0 && <a href="#atelier" className="opacity-70 hover:opacity-100">الأتيليه</a>}
            {demo && <a href="#notes" className="opacity-70 hover:opacity-100">الضيوف</a>}
            {clinic.showBlog !== false && <a href="#blog" className="opacity-70 hover:opacity-100">المدونة</a>}
            <a href="#visit" className="opacity-70 hover:opacity-100">الفروع</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCart(true)} className="relative p-2">
              <FiShoppingBag />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full text-black flex items-center justify-center" style={{ backgroundColor: gold }}>{cartCount}</span>}
            </button>
            <button onClick={onOpenBooking} className="hidden md:inline-flex px-6 py-2.5 text-xs tracking-[0.2em] uppercase font-bold text-black" style={{ backgroundColor: gold }}>موعد خاص</button>
            <button onClick={() => setMobileMenu(true)} className="lg:hidden"><FiMenu size={22} /></button>
          </div>
        </div>
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-[80]" style={{ backgroundColor: withAlpha(bg, 0.7) }} onClick={() => setMobileMenu(false)}>
          <div className="absolute inset-y-0 right-0 w-80 p-8 border-l" style={{ backgroundColor: bg, borderColor: withAlpha(gold, 0.3) }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileMenu(false)} className="mb-10" style={{ color: gold }}><FiX size={22} /></button>
            <div className="space-y-6 font-display text-2xl">
              <a href="#services" onClick={() => setMobileMenu(false)} className="block">الجلسات</a>
              {clinic.showBlog !== false && <a href="#blog" onClick={() => setMobileMenu(false)} className="block">المدونة</a>}
              <a href="#visit" onClick={() => setMobileMenu(false)} className="block">الفروع</a>
              <button onClick={() => { setMobileMenu(false); onOpenBooking(); }} className="w-full py-3 text-black text-base tracking-widest" style={{ backgroundColor: gold }}>احجزي</button>
            </div>
          </div>
        </div>
      )}

      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          {clinic?.heroImage
            ? <img src={clinic.heroImage} alt="" className="w-full h-full object-cover opacity-35" />
            : <div className="w-full h-full" style={{ background: `linear-gradient(160deg, ${bg}, ${withAlpha(gold, 0.15)})` }} />}
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${bg} 8%, ${withAlpha(bg, 0.55)} 100%)` }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 py-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="h-px w-16 mb-8" style={{ backgroundColor: gold }} />
            {clinic?.specialty && <p className="text-[11px] tracking-[0.4em] uppercase mb-6" style={{ color: gold }}>{clinic.specialty}</p>}
            <h1 className="font-display text-5xl md:text-7xl leading-[1.12] font-medium whitespace-pre-line">
              {headline.split('\n').map((line, i, arr) => (
                <span key={i} className="block" style={arr.length > 1 && i === arr.length - 1 ? { color: gold } : undefined}>{line}</span>
              ))}
            </h1>
            {copy && (
              <p className="mt-6 text-lg leading-relaxed opacity-80 max-w-xl">{copy}</p>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <button onClick={onOpenBooking} className="px-8 py-3.5 text-black font-bold tracking-wide" style={{ backgroundColor: gold }}>احجزي جلسة خاصة</button>
              <a href="#services" className="px-8 py-3.5 border font-medium" style={{ borderColor: gold, color: gold }}>قائمة الطقوس</a>
            </div>
            {demo && <div className="mt-14 flex gap-10 text-sm">
              <div><p className="font-display text-3xl" style={{ color: gold }}>VIP</p><p className="opacity-60 mt-1">أجنحة خاصة</p></div>
              <div><p className="font-display text-3xl" style={{ color: gold }}>Skin</p><p className="opacity-60 mt-1">بروتوكولات بشرة</p></div>
              <div><p className="font-display text-3xl" style={{ color: gold }}>Laser</p><p className="opacity-60 mt-1">تقنيات معتمدة</p></div>
            </div>}
          </motion.div>
        </div>
      </section>

      {demo && <section id="ritual" className="px-5 py-24 border-t" style={{ borderColor: withAlpha(gold, 0.18) }}>
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] tracking-[0.4em] uppercase mb-12" style={{ color: gold }}>طقس الزيارة</p>
          <div className="grid md:grid-cols-3 gap-12">
            {VISIT_JOURNEY.map((item) => (
              <div key={item.n}>
                <p className="font-display text-4xl mb-4" style={{ color: gold }}>{item.n}</p>
                <h3 className="text-xl font-bold mb-3">{item.t}</h3>
                <p className="text-sm leading-relaxed opacity-70">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {(clinic?.doctorName || clinic?.doctorBio) && (
        <section className="px-5 pb-24">
          <div className="max-w-5xl mx-auto border p-10 md:p-14" style={{ borderColor: withAlpha(gold, 0.25) }}>
            <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: gold }}>الأخصائية المقيمة</p>
            <h2 className="font-display text-5xl mb-4">{clinic.doctorName}</h2>
            <p className="text-sm mb-6" style={{ color: gold }}>{[clinic.degree, clinic.specialty].filter(Boolean).join("  ·  ")}</p>
            <p className="text-lg leading-relaxed opacity-80 max-w-3xl">{clinic.doctorBio}</p>
          </div>
        </section>
      )}

      {whyChooseUs && (
        <section className="px-5 pb-24 text-center max-w-3xl mx-auto">
          <div className="h-px w-12 mx-auto mb-8" style={{ backgroundColor: gold }} />
          <h2 className="font-display text-4xl mb-6">{whyChooseUsTitle || "لماذا هذا الأتيليه؟"}</h2>
          <p className="leading-relaxed opacity-80">{whyChooseUs}</p>
        </section>
      )}

      {clinic.showServices !== false && (
        <section id="services" className="px-5 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <h2 className="font-display text-5xl">قائمة الجلسات</h2>
              <div className="h-px flex-1 mx-8 hidden md:block" style={{ backgroundColor: withAlpha(gold, 0.25) }} />
            </div>
            <div className="divide-y" style={{ borderColor: withAlpha(gold, 0.15) }}>
              {services.map((s) => (
                <div key={s.id} className="w-full text-right py-8 flex flex-col md:flex-row md:items-center gap-4 hover:opacity-100 opacity-90">
                  <h3 className="font-display text-3xl flex-1">{s.title || s.name}</h3>
                  {s.description && <p className="text-sm opacity-60 flex-[1.2]">{s.description}</p>}
                  <span className="text-xs tracking-widest opacity-50">{serviceDuration(s)}</span>
                  <span className="font-bold" style={{ color: gold }}>{s.price} ₪</span>
                  <div className="flex gap-4 text-xs tracking-widest">
                    {clinicId && <Link to={`/book/${clinicId}/service/${s.id}`}>التفاصيل</Link>}
                    <button type="button" onClick={() => onOpenBooking({ serviceId: s.id })}>احجزي</button>
                  </div>
                </div>
              ))}
              {services.length === 0 && <p className="py-16 text-center opacity-50">القائمة تُحدَّث من لوحة العيادة</p>}
            </div>
          </div>
        </section>
      )}

      {clinic.showProducts !== false && products.length > 0 && (
        <section id="atelier" className="px-5 pb-24">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-4xl mb-10">أتيليه المنتجات</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ backgroundColor: withAlpha(gold, 0.2) }}>
              {products.map((p) => (
                <div key={p.id} className="p-5" style={{ backgroundColor: bg }}>
                  <div className="aspect-[3/4] mb-4 overflow-hidden bg-black/30">
                    {(p.imageUrl || p.image) && <img src={p.imageUrl || p.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <h3 className="font-medium mb-1">{p.title}</h3>
                  <p className="text-sm mb-4" style={{ color: gold }}>{p.price} ₪</p>
                  <button onClick={() => addToCart(setCart, p)} className="text-xs tracking-widest uppercase flex items-center gap-2" style={{ color: gold }}>
                    <FiPlus /> أضيفي
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {demo && <section id="notes" className="px-5 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {GUEST_NOTES.map((n) => (
            <blockquote key={n.name} className="border-t pt-6" style={{ borderColor: withAlpha(gold, 0.3) }}>
              <p className="font-display text-2xl leading-relaxed mb-6">“{n.quote}”</p>
              <footer className="text-[11px] tracking-[0.2em] uppercase" style={{ color: gold }}>{n.name}</footer>
            </blockquote>
          ))}
        </div>
      </section>}

      <ThemeBlog posts={posts} enabled={clinic.showBlog} accent={gold} variant="elegant" />

      <section id="visit" className="px-5 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="font-display text-5xl mb-6">فروع العيادة</h2>
            {branches.length === 0 && <p className="opacity-60 text-sm">أضيفي الفروع من لوحة التحكم.</p>}
            {branches.map((b) => (
              <Link key={b.id} to={clinicId ? `/book/${clinicId}/branch/${b.id}` : '#'} className="flex gap-3 py-4 border-t" style={{ borderColor: withAlpha(gold, 0.2) }}>
                <FiMapPin style={{ color: gold }} />
                <div>
                  <p className="font-bold">{b.name}</p>
                  <p className="text-sm opacity-60">{b.address}</p>
                  {b.phone && <p className="text-xs opacity-50 mt-1" dir="ltr">{b.phone}</p>}
                </div>
              </Link>
            ))}
          </div>
          <div className="border p-10" style={{ borderColor: gold }}>
            <p className="text-[11px] tracking-[0.35em] uppercase mb-3" style={{ color: gold }}>Private suite</p>
            <p className="font-display text-3xl mb-4">موعد خاص</p>
            <p className="opacity-70 mb-8">اختاري وقتكِ بهدوء. لا انتظار، ولا زحام — فقط أخصائية وبشرتكِ.</p>
            <button onClick={onOpenBooking} className="w-full py-4 text-black font-bold" style={{ backgroundColor: gold }}>احجزي الآن</button>
          </div>
        </div>
      </section>

      <footer className="px-5 py-10 border-t flex flex-col md:flex-row justify-between gap-4 text-sm" style={{ borderColor: withAlpha(gold, 0.2) }}>
        <p className="opacity-50">© {new Date().getFullYear()} {name}</p>
        <div className="flex gap-4 items-center">
          {clinic?.instagram && <a href={clinic.instagram}><FiInstagram /></a>}
          {clinic?.facebook && <a href={clinic.facebook}><FaFacebookF /></a>}
          {clinic?.tiktok && <a href={clinic.tiktok}><FaTiktok /></a>}
        </div>
      </footer>

      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noreferrer" className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-black" style={{ backgroundColor: gold }}>
          <FaWhatsapp size={22} />
        </a>
      )}
    </div>
  );
}
