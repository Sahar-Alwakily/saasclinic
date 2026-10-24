import React from 'react';
import { motion } from 'framer-motion';
import { withAlpha, clinicHeadline, clinicCopy, DEFAULT_HERO } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';

export default function SectionHero({ settings = {} }) {
  const { clinic, onOpenBooking, primaryColor, textColor, themeVariant } = useTheme();
  const name = clinic?.name || '';
  const headline = settings.title || clinicHeadline(clinic) || name;
  const copy = settings.subtitle || clinicCopy(clinic);
  const image = settings.image || clinic?.heroImage || '';
  const ctaText = settings.ctaText || 'احجزي استشارة البشرة';
  const fallbackHero = DEFAULT_HERO[themeVariant] || DEFAULT_HERO.beauty;

  return (
    <section id="hero" className="px-5 pt-12 pb-20 md:pt-20">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-7 relative z-10 order-2 lg:order-1">
          {clinic?.specialty && (
            <p className="text-xs tracking-[0.35em] uppercase font-bold" style={{ color: primaryColor }}>{clinic.specialty}</p>
          )}
          <h1 className="font-display text-5xl md:text-7xl leading-[1.08] font-semibold whitespace-pre-line">
            {String(headline).split('\n').map((line, i, arr) => (
              <span key={i} className="block" style={arr.length > 1 && i === arr.length - 1 ? { color: primaryColor } : undefined}>{line}</span>
            ))}
          </h1>
          {copy && (
            <p className="text-lg leading-relaxed max-w-xl" style={{ color: withAlpha(textColor, 0.78) }}>{copy}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onOpenBooking()} className="px-8 py-3.5 rounded-full text-white font-bold shadow-xl" style={{ backgroundColor: primaryColor }}>{ctaText}</button>
            <a href="#services" className="px-8 py-3.5 rounded-full font-bold border" style={{ backgroundColor: withAlpha('#ffffff', 0.9), borderColor: withAlpha(primaryColor, 0.25) }}>اكتشفي الجلسات</a>
          </div>
        </motion.div>
        <div className="relative order-1 lg:order-2">
          <div className="aspect-[4/5] max-h-[580px] rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ background: `linear-gradient(160deg, ${withAlpha(primaryColor, 0.45)}, #e8d5cc 45%, ${withAlpha(primaryColor, 0.2)})` }}>
            {image
              ? <img src={image} alt="" className="w-full h-full object-cover" />
              : <img src={fallbackHero} alt="" className="w-full h-full object-cover opacity-90" />}
          </div>
        </div>
      </div>
    </section>
  );
}
