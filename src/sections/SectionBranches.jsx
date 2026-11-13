import React from 'react';
import { FiMapPin, FiPhone, FiClock } from 'react-icons/fi';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';
import { publicPlaces } from '../utils/publicPlaces';

export default function SectionBranches({ settings = {} }) {
  const { clinic, branches = [], onOpenBooking, themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const places = publicPlaces(clinic, branches);
  if (!places.length) return null;

  const title = settings.title || 'فروع العيادة';
  const bookAt = (place) => onOpenBooking?.({ branchId: place.id, branchName: place.name });

  if (themeVariant === 'beauty') {
    return (
      <section id="branches" className="px-4 py-16 scroll-mt-28" dir="rtl">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: primaryColor }}>الحجوزات</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 mt-2">
            فروع <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>العيادة</span>
          </h2>
          <div className="w-20 h-1 mx-auto mt-4 rounded-full" style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }} />
        </div>
        <div className={`max-w-6xl mx-auto grid gap-4 ${places.length === 1 ? 'md:grid-cols-1 md:max-w-xl' : 'md:grid-cols-2'}`}>
          {places.map((place) => (
            <article
              key={place.id}
              className="bg-white rounded-[1.5rem] p-6 border shadow-sm flex flex-col gap-3"
              style={{ borderColor: withAlpha(primaryColor, 0.14) }}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                  <FiMapPin />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800">{place.name}</h3>
                  {place.address && <p className="text-sm text-gray-500 mt-1">{place.address}</p>}
                </div>
              </div>
              {place.phone && (
                <p className="flex items-center gap-2 text-sm text-gray-600" dir="ltr"><FiPhone /> {place.phone}</p>
              )}
              {place.hours && (
                <p className="flex items-center gap-2 text-sm text-gray-600"><FiClock /> {place.hours}</p>
              )}
              <button
                type="button"
                onClick={() => bookAt(place)}
                className="mt-auto w-full py-2.5 rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                احجزي في هذا الفرع
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="branches" className={skin.wrap}>
      <div className={`${skin.inner} grid md:grid-cols-3 gap-5`}>
        <div className={`md:col-span-1 p-7 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
          <h2 className="font-display text-3xl mb-4">{title}</h2>
          <p className="text-sm opacity-70">{places.length === 1 ? 'موقع الحجز' : `${places.length} فروع للحجز`}</p>
          <button type="button" onClick={() => bookAt(places[0])} className="mt-6 w-full py-3 rounded-full text-white font-bold" style={{ backgroundColor: skin.primaryColor }}>احجزي موعداً</button>
        </div>
        <div className="md:col-span-2 grid gap-4">
          {places.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => bookAt(place)}
              className={`p-5 flex items-center gap-4 border text-right ${skin.radius}`}
              style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}
            >
              <div className="w-11 h-11 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: skin.primaryColor }}><FiMapPin /></div>
              <div>
                <h3 className="font-bold">{place.name}</h3>
                {place.address && <p className="text-sm opacity-70">{place.address}</p>}
                {place.phone && <p className="text-xs opacity-50 mt-1" dir="ltr">{place.phone}</p>}
                {place.hours && <p className="text-xs opacity-50 mt-1">{place.hours}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
