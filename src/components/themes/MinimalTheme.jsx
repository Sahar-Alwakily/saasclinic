import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMenu, FiX, FiShoppingBag, FiPlus, FiMapPin, FiInstagram } from "react-icons/fi";
import { FaWhatsapp, FaFacebookF, FaTiktok } from "react-icons/fa";
import { addToCart, fontStack, waLink, serviceDuration, clinicHeadline, clinicCopy, SKIN_CONCERNS, SKIN_PROMISES, GUEST_NOTES } from "./themeUtils";
import ThemeBlog from "./ThemeBlog";

export default function MinimalTheme({
  clinic, services, products, branches, posts, onOpenBooking, cart, setCart, setShowCart,
  primaryColor, bgColor, textColor, fontFamily, whyChooseUs, whyChooseUsTitle,
}) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { clinicId } = useParams();
  const name = clinic?.name || "عيادة البشرة";
  const ink = primaryColor || "#1C1917";
  const bg = bgColor || "#FAF8F5";
  const text = textColor || "#1C1917";
  const whatsapp = waLink(clinic?.whatsapp);
  const cartCount = cart.reduce((n, i) => n + (i.qty || 1), 0);
  const demo = !!clinic?._demo;
  const headline = clinicHeadline(clinic) || name;
  const copy = clinicCopy(clinic);

  return (
    <div dir="rtl" className="min-h-screen" style={{ fontFamily: fontStack(fontFamily), color: text, backgroundColor: bg }}>
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            {clinic?.logoUrl
              ? <img src={clinic.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              : <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ink }} />}
            <span className="font-medium tracking-tight">{name}</span>
          </a>
          <nav className="hidden md:flex gap-8 text-sm opacity-70">
            <a href="#work" className="hover:opacity-100">الجلسات</a>
            <a href="#specialist" className="hover:opacity-100">الأخصائية</a>
            {demo && <a href="#notes" className="hover:opacity-100">ملاحظات</a>}
            {clinic.showBlog !== false && <a href="#blog" className="hover:opacity-100">المدونة</a>}
            <a href="#studio" className="hover:opacity-100">الفروع</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCart(true)} className="relative p-2">
              <FiShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[10px] rounded-full text-white flex items-center justify-center" style={{ backgroundColor: ink }}>{cartCount}</span>}
            </button>
            <button onClick={onOpenBooking} className="hidden md:inline text-sm underline underline-offset-8 decoration-1">احجزي جلسة</button>
            <button onClick={() => setMobileMenu(true)} className="md:hidden"><FiMenu /></button>
          </div>
        </div>
      </header>

      {mobileMenu && (
        <div className="fixed inset-0 z-[80] bg-black/20" onClick={() => setMobileMenu(false)}>
          <div className="absolute inset-y-0 right-0 w-72 p-8 bg-[#FAF8F5]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileMenu(false)} className="mb-8"><FiX /></button>
            <div className="space-y-5 text-lg">
              <a href="#work" onClick={() => setMobileMenu(false)} className="block">الجلسات</a>
              {clinic.showBlog !== false && <a href="#blog" onClick={() => setMobileMenu(false)} className="block">المدونة</a>}
              <a href="#studio" onClick={() => setMobileMenu(false)} className="block">الفروع</a>
              <button onClick={() => { setMobileMenu(false); onOpenBooking(); }} className="underline">احجزي</button>
            </div>
          </div>
        </div>
      )}

      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid lg:grid-cols-2 gap-16 items-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {clinic?.specialty && <p className="text-xs tracking-[0.28em] uppercase mb-6 opacity-50">{clinic.specialty}</p>}
          <h1 className="font-display text-5xl md:text-6xl leading-[1.12] font-medium whitespace-pre-line">{headline}</h1>
          {copy && (
            <p className="mt-6 text-lg leading-relaxed opacity-70 max-w-md">{copy}</p>
          )}
          <div className="mt-10 flex flex-wrap gap-6 items-center">
            <button onClick={onOpenBooking} className="text-white px-8 py-3 text-sm" style={{ backgroundColor: ink }}>احجزي استشارة</button>
            <a href="#work" className="text-sm underline underline-offset-8">الجلسات</a>
          </div>
        </motion.div>
        <div className="aspect-[4/5] overflow-hidden bg-stone-200">
          {clinic?.heroImage
            ? <img src={clinic.heroImage} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-sm opacity-50 px-6 text-center">أضيفي صورة البانر من الإعدادات</div>}
        </div>
      </section>

      {demo && <section className="max-w-6xl mx-auto px-5 pb-16">
        <p className="text-xs tracking-[0.25em] uppercase opacity-40 mb-5">اهتمامات البشرة</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-lg">
          {SKIN_CONCERNS.map((c) => (
            <a key={c.id} href="#work" className="opacity-70 hover:opacity-100 border-b border-stone-300 pb-1">{c.label}</a>
          ))}
        </div>
      </section>}

      {demo && <section className="max-w-6xl mx-auto px-5 pb-20 grid md:grid-cols-3 gap-10 border-t border-stone-200 pt-16">
        {SKIN_PROMISES.map((t) => (
          <p key={t} className="text-lg leading-snug">{t}</p>
        ))}
      </section>}

      {(clinic?.doctorName || clinic?.doctorBio) && (
        <section id="specialist" className="max-w-6xl mx-auto px-5 pb-20 grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase opacity-40 mb-3">الأخصائية</p>
            <h2 className="font-display text-4xl">{clinic.doctorName || "أخصائية البشرة"}</h2>
          </div>
          <div>
            <p className="text-sm opacity-50 mb-4">{[clinic.degree, clinic.specialty].filter(Boolean).join(" · ")}</p>
            <p className="leading-relaxed opacity-80">{clinic.doctorBio}</p>
          </div>
        </section>
      )}

      {whyChooseUs && (
        <section className="max-w-3xl mx-auto px-5 pb-20">
          <h2 className="font-display text-4xl mb-5">{whyChooseUsTitle || "لماذا هنا؟"}</h2>
          <p className="leading-relaxed opacity-80">{whyChooseUs}</p>
        </section>
      )}

      {clinic.showServices !== false && (
        <section id="work" className="max-w-6xl mx-auto px-5 pb-20">
          <h2 className="font-display text-4xl mb-10">الجلسات</h2>
          <div className="grid md:grid-cols-2 gap-x-12">
            {services.map((s, i) => (
              <div key={s.id} className="text-right py-8 border-t border-stone-200 flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs opacity-40 mb-2">{String(i + 1).padStart(2, "0")} · {serviceDuration(s)}</p>
                  <h3 className="text-xl font-medium mb-2">{s.title || s.name}</h3>
                  {s.description && <p className="text-sm opacity-60 mb-3">{s.description}</p>}
                  <div className="flex gap-4 text-sm">
                    {clinicId && <Link to={`/book/${clinicId}/service/${s.id}`} className="underline underline-offset-4">التفاصيل</Link>}
                    <button type="button" onClick={() => onOpenBooking({ serviceId: s.id })} className="underline underline-offset-4">احجزي</button>
                  </div>
                </div>
                <span className="shrink-0 font-medium">{s.price} ₪</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {clinic.showProducts !== false && products.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 pb-20">
          <h2 className="font-display text-4xl mb-10">العناية المنزلية</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {products.map((p) => (
              <div key={p.id}>
                <div className="aspect-square bg-stone-100 mb-3 overflow-hidden">
                  {(p.imageUrl || p.image) && <img src={p.imageUrl || p.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <h3 className="text-sm mb-1">{p.title}</h3>
                <p className="text-sm mb-3 opacity-70">{p.price} ₪</p>
                <button onClick={() => addToCart(setCart, p)} className="text-xs flex items-center gap-1 underline underline-offset-4">
                  <FiPlus size={12} /> أضيفي
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {demo && <section id="notes" className="max-w-6xl mx-auto px-5 pb-20 border-t border-stone-200 pt-16">
        <h2 className="font-display text-4xl mb-10">ملاحظات الضيوف</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {GUEST_NOTES.map((n) => (
            <blockquote key={n.name}>
              <p className="leading-relaxed mb-4">{n.quote}</p>
              <footer className="text-xs opacity-40">{n.name}</footer>
            </blockquote>
          ))}
        </div>
      </section>}

      <ThemeBlog posts={posts} enabled={clinic.showBlog} accent={ink} variant="minimal" />

      <section id="studio" className="max-w-6xl mx-auto px-5 pb-24 grid md:grid-cols-2 gap-12 border-t border-stone-200 pt-16">
        <div>
          <h2 className="font-display text-4xl mb-4">الفروع</h2>
          <button onClick={onOpenBooking} className="text-sm underline underline-offset-8">احجزي استشارة بشرة</button>
        </div>
        <div className="space-y-4">
          {branches.map((b) => (
            <Link key={b.id} to={clinicId ? `/book/${clinicId}/branch/${b.id}` : '#'} className="flex justify-between gap-4 border-b border-stone-200 pb-4">
              <span>{b.name}</span>
              <span className="text-sm opacity-60">{b.address || b.phone}</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-5 py-10 flex justify-between items-center text-sm opacity-60 border-t border-stone-200">
        <p>© {new Date().getFullYear()} {name}</p>
        <div className="flex gap-4">
          {clinic?.instagram && <a href={clinic.instagram}><FiInstagram /></a>}
          {clinic?.facebook && <a href={clinic.facebook}><FaFacebookF /></a>}
          {clinic?.tiktok && <a href={clinic.tiktok}><FaTiktok /></a>}
          {whatsapp && <a href={whatsapp}><FaWhatsapp /></a>}
        </div>
      </footer>
    </div>
  );
}
