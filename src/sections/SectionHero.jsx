import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { withAlpha, clinicHeadline, clinicCopy, DEFAULT_HERO } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';

export default function SectionHero({ settings = {} }) {
  const { clinic, onOpenBooking, primaryColor, textColor, themeVariant, services = [] } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const name = clinic?.name || '';
  const doctor = clinic?.doctorName || name;
  const headline = settings.title || clinicHeadline(clinic) || name;
  const copy = settings.subtitle || clinicCopy(clinic);
  const image = settings.image || clinic?.heroImage || clinic?.logoUrl || '';
  const ctaText = settings.ctaText || 'احجزي موعدك الآن ✨';
  const fallbackHero = DEFAULT_HERO[themeVariant] || DEFAULT_HERO.beauty;

  if (themeVariant !== 'beauty') {
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

  const lines = String(headline || `جمالك يبدأ من الداخل\nمع ${doctor}`).split('\n');

  return (
    <section id="hero" className="py-6" dir="rtl">
      <div
        className="flex flex-col-reverse md:flex-row rounded-2xl px-6 md:px-10 lg:px-16 overflow-hidden items-center py-10 md:py-12 shadow-sm gap-8 md:gap-0"
        style={{ background: `linear-gradient(to left, ${withAlpha(primaryColor, 0.18)}, ${withAlpha(primaryColor, 0.06)}, #fff)` }}
      >
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start justify-center gap-5 text-gray-800 text-center md:text-right">
          <span
            className="text-xs md:text-sm font-medium px-4 py-1.5 rounded-full"
            style={{ backgroundColor: withAlpha(primaryColor, 0.1), color: primaryColor }}
          >
            ✨ {name || doctor}
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-snug text-gray-900">
            {lines.map((line, i) => (
              <span key={i} className="block" style={i === lines.length - 1 ? { color: primaryColor } : undefined}>
                {line}
                {i < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </h1>

          {copy && (
            <p className="text-gray-600 text-sm md:text-base font-light leading-relaxed max-w-lg">
              {copy}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full sm:w-auto">
            {(clinic?.doctorName || clinic?.doctorBio) && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 px-6 py-2.5 rounded-full text-sm font-medium hover:text-white transition-all duration-300"
                style={{ borderColor: primaryColor, color: primaryColor }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = primaryColor; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = primaryColor; }}
              >
                👩‍⚕️ تعرّفي على الدكتورة
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2.5 rounded-full text-white text-sm font-medium hover:scale-105 transition-all duration-300 shadow-md"
              style={{ backgroundColor: primaryColor, boxShadow: `0 8px 20px ${withAlpha(primaryColor, 0.35)}` }}
            >
              {ctaText}
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex items-center justify-center relative">
          <div className="absolute w-56 h-56 md:w-80 md:h-80 rounded-full blur-3xl" style={{ backgroundColor: withAlpha(primaryColor, 0.35) }} />
          <img
            className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 object-cover rounded-full border-8 border-white shadow-2xl"
            src={image || fallbackHero}
            alt={doctor}
          />
          <div className="absolute -bottom-2 md:bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-10 md:translate-x-0 flex gap-2">
            {clinic?.specialty && (
              <div className="bg-white shadow-lg rounded-2xl px-3 py-1.5 text-center">
                <p className="text-[10px] text-gray-500">تخصص</p>
                <p className="text-xs font-semibold" style={{ color: primaryColor }}>{clinic.specialty}</p>
              </div>
            )}
            {clinic?.degree && (
              <div className="bg-white shadow-lg rounded-2xl px-3 py-1.5 text-center">
                <p className="text-[10px] text-gray-500">شهادة</p>
                <p className="text-xs font-semibold" style={{ color: primaryColor }}>{clinic.degree}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
          dir="rtl"
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-5 border-b pb-4 gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{doctor}</h2>
                <p className="text-sm font-medium mt-1" style={{ color: primaryColor }}>{clinic?.specialty || clinic?.degree || 'طبيبة مختصة في الطب التجميلي'}</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 text-2xl leading-none flex-shrink-0">✕</button>
            </div>
            {clinic?.doctorBio && (
              <p className="text-gray-700 text-sm leading-relaxed mb-6">{clinic.doctorBio}</p>
            )}
            {services.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">الخدمات التي تقدّمها:</h3>
                <ul className="text-gray-600 text-sm space-y-1 pr-4 mb-6">
                  {services.slice(0, 12).map((s) => (
                    <li key={s.id}>• {s.title || s.name}</li>
                  ))}
                </ul>
              </>
            )}
            <button
              type="button"
              onClick={() => { setShowModal(false); onOpenBooking(); }}
              className="w-full mt-2 text-white py-3 rounded-full font-medium transition-all duration-300 shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              احجزي موعدك الآن ✨
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
