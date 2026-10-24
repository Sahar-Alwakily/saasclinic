import React from 'react';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionWhyChooseUs({ settings = {} }) {
  const { clinic } = useTheme();
  const skin = useSectionSkin();
  const title = settings.title || clinic?.whyChooseUsTitle || 'لماذا تختارين عيادتنا؟';
  const description = settings.description || clinic?.whyChooseUs || '';
  const features = Array.isArray(settings.features) ? settings.features.filter(Boolean) : [];
  if (!description && !features.length) return null;

  return (
    <section id="why" className={skin.wrap}>
      <div className={`${skin.inner} max-w-3xl text-center`}>
        <h2 className={skin.title}>{title}</h2>
        {description && <p className="text-lg leading-relaxed opacity-80 mb-8">{description}</p>}
        {features.length > 0 && (
          <ul className="grid sm:grid-cols-3 gap-4 text-sm">
            {features.map((f, i) => (
              <li key={i} className={`p-4 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>{f}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
