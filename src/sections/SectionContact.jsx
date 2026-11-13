import React from 'react';
import { FiPhone, FiMapPin } from 'react-icons/fi';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';
import { placeLabel, publicEmail, publicPhones, publicPlaces } from '../utils/publicPlaces';

export default function SectionContact({ settings = {} }) {
  const { clinic, branches = [], themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const places = publicPlaces(clinic, branches);
  const phones = settings.phone ? [settings.phone] : publicPhones(clinic, places);
  const email = publicEmail(clinic);
  const address = settings.address || '';
  const map = (settings.mapEmbed || '').trim();
  const safeMap = map.startsWith('https://') ? map : '';
  if (!phones.length && !places.length && !email && !address && !safeMap) return null;

  const body = (
    <>
      <h2 className={themeVariant === 'beauty' ? 'text-2xl font-extrabold text-gray-800 mb-5' : skin.title}>
        {settings.title || 'تواصلي معنا'}
      </h2>
      {phones.map((phone) => (
        <p key={phone} className="flex items-center gap-2 mb-3 text-gray-600" dir="ltr"><FiPhone /> {phone}</p>
      ))}
      {email && <p className="mb-3 text-gray-600" dir="ltr">{email}</p>}
      {places.map((place) => (
        <p key={place.id} className="flex items-start gap-2 mb-2 text-gray-600">
          <FiMapPin className="mt-1 shrink-0" />
          <span>{placeLabel(place)}</span>
        </p>
      ))}
      {address && !places.length && (
        <p className="flex items-center gap-2 text-gray-600"><FiMapPin /> {address}</p>
      )}
    </>
  );

  if (themeVariant === 'beauty') {
    return (
      <section id="contact" className="px-4 py-16 scroll-mt-28" dir="rtl">
        <div className={`max-w-6xl mx-auto grid gap-6 ${safeMap ? 'md:grid-cols-2' : ''}`}>
          <div className="bg-white rounded-[1.5rem] p-7 border shadow-sm" style={{ borderColor: withAlpha(primaryColor, 0.14) }}>
            {body}
          </div>
          {safeMap && (
            <div className="overflow-hidden min-h-[220px] rounded-[1.5rem] border" style={{ borderColor: withAlpha(primaryColor, 0.14) }}>
              <iframe title="خريطة العيادة" src={safeMap} className="w-full h-full min-h-[220px] border-0" loading="lazy" />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className={skin.wrap}>
      <div className={`${skin.inner} grid md:grid-cols-2 gap-6`}>
        <div className={`p-7 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
          {body}
        </div>
        {safeMap && (
          <div className={`overflow-hidden min-h-[220px] border ${skin.radius}`} style={{ borderColor: skin.border }}>
            <iframe title="خريطة العيادة" src={safeMap} className="w-full h-full min-h-[220px] border-0" loading="lazy" />
          </div>
        )}
      </div>
    </section>
  );
}
