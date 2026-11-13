import React from 'react';
import { clinicCopy, withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionAbout({ settings = {} }) {
  const { clinic, themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const title = settings.title || 'عن العيادة';
  const description = settings.description || clinicCopy(clinic);
  const image = String(settings.image || '').trim();
  if (!description && !image) return null;

  if (themeVariant !== 'beauty') {
    return (
      <section id="about" className={skin.wrap}>
        <div className={`${skin.inner} grid md:grid-cols-2 gap-8 items-center`}>
          {image && (
            <div className={`overflow-hidden ${skin.radius}`}>
              <img src={image} alt="" className="w-full h-full max-h-[420px] object-cover" />
            </div>
          )}
          <div>
            <p className={skin.kicker} style={{ color: skin.primaryColor }}>العيادة</p>
            <h2 className={skin.title}>{title}</h2>
            {description && <p className="text-lg leading-relaxed opacity-80">{description}</p>}
          </div>
        </div>
      </section>
    );
  }

  const paragraphs = String(description || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const features = Array.isArray(settings.features)
    ? settings.features.map((f) => {
      if (!f) return null;
      if (typeof f === 'string') return f;
      return f.title || f.text || '';
    }).filter(Boolean).slice(0, 4)
    : [];

  return (
    <section id="about" className="px-4 py-16 scroll-mt-28" dir="rtl">
      <div
        className="max-w-6xl mx-auto rounded-[2rem] overflow-hidden border bg-white"
        style={{ borderColor: withAlpha(primaryColor, 0.16) }}
      >
        <div className={`grid ${image ? 'lg:grid-cols-2' : 'lg:grid-cols-[16rem_minmax(0,1fr)]'}`}>
          {image ? (
            <div className="min-h-[260px] lg:min-h-full">
              <img src={image} alt="" className="w-full h-full object-cover min-h-[260px] lg:min-h-[420px]" />
            </div>
          ) : (
            <div
              className="px-8 py-10 lg:px-10 lg:py-14 flex flex-col justify-between gap-8"
              style={{ background: `linear-gradient(180deg, ${withAlpha(primaryColor, 0.14)}, ${withAlpha(primaryColor, 0.05)})` }}
            >
              <p className="text-sm font-bold" style={{ color: primaryColor }}>من نحن</p>
              <p className="text-4xl lg:text-5xl font-extrabold leading-tight text-gray-800">{title}</p>
            </div>
          )}

          <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
            {image && (
              <>
                <p className="text-sm font-bold mb-2" style={{ color: primaryColor }}>من نحن</p>
                <h2 className="text-3xl font-extrabold text-gray-800 mb-5">{title}</h2>
              </>
            )}
            {!image && <h2 className="sr-only">{title}</h2>}
            {paragraphs.length > 0 && (
              <div className="space-y-4 text-gray-600 text-[15px] md:text-base leading-8">
                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}
            {features.length > 0 && (
              <ul className="mt-8 grid sm:grid-cols-2 gap-3">
                {features.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-700 rounded-xl px-4 py-3 bg-[#f8fafc]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
