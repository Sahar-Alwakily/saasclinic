import React from 'react';
import { clinicCopy } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionAbout({ settings = {} }) {
  const { clinic } = useTheme();
  const skin = useSectionSkin();
  const title = settings.title || 'عن العيادة';
  const description = settings.description || clinicCopy(clinic);
  const image = settings.image || '';
  if (!description && !image) return null;

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
