import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionWhyChooseUs({ settings = {} }) {
  const { clinic, themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const title = settings.title || clinic?.whyChooseUsTitle || 'لماذا تختارين عيادتنا؟';
  const description = settings.description || clinic?.whyChooseUs || '';
  const features = Array.isArray(settings.features) ? settings.features.filter(Boolean) : [];
  if (!description && !features.length) return null;

  if (themeVariant !== 'beauty') {
    return (
      <section id="why" className={skin.wrap}>
        <div className={`${skin.inner} max-w-3xl text-center`}>
          <h2 className={skin.title}>{title}</h2>
          {description && <p className="text-lg leading-relaxed opacity-80 mb-8">{description}</p>}
          {features.length > 0 && (
            <ul className="grid sm:grid-cols-3 gap-4 text-sm">
              {features.map((f, i) => (
                <li key={i} className={`p-4 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>{typeof f === 'string' ? f : f.title}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  const words = String(title).trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  const lead = words.join(' ');

  return (
    <section id="why" className="px-4 py-16 scroll-mt-28" dir="rtl">
      <div className="text-center mb-12">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: primaryColor }}>لماذا نحن</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 mt-2">
          {lead}{last ? ' ' : ''}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>
            {last || title}
          </span>
        </h2>
        <div className="w-20 h-1 mx-auto mt-4 rounded-full" style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }} />
        {description && <p className="text-sm text-gray-500 mt-4 max-w-2xl mx-auto leading-relaxed">{description}</p>}
      </div>

      {features.length > 0 && (
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const label = typeof f === 'string' ? f : f.title;
            const text = typeof f === 'string' ? '' : (f.text || '');
            return (
              <article
                key={i}
                className="relative overflow-hidden bg-white rounded-[1.5rem] p-6 shadow-sm border hover:-translate-y-1 hover:shadow-lg transition duration-300"
                style={{ borderColor: withAlpha(primaryColor, 0.12) }}
              >
                <p className="font-extrabold text-3xl mb-3" style={{ color: withAlpha(primaryColor, 0.35) }}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div
                  className="absolute top-5 left-5 w-9 h-9 rounded-full text-white flex items-center justify-center text-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  <FaCheck />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{label}</h3>
                {text && <p className="text-sm text-gray-500 leading-relaxed">{text}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
