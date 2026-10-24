import React from 'react';
import { FiPhone, FiMapPin } from 'react-icons/fi';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionContact({ settings = {} }) {
  const { clinic } = useTheme();
  const skin = useSectionSkin();
  const phone = settings.phone || clinic?.phone || clinic?.whatsapp || '';
  const address = settings.address || clinic?.address || '';
  const map = (settings.mapEmbed || '').trim();
  const safeMap = map.startsWith('https://') ? map : '';

  return (
    <section id="contact" className={skin.wrap}>
      <div className={`${skin.inner} grid md:grid-cols-2 gap-6`}>
        <div className={`p-7 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
          <h2 className={skin.title}>{settings.title || 'تواصلي معنا'}</h2>
          {phone && <p className="flex items-center gap-2 mb-3" dir="ltr"><FiPhone /> {phone}</p>}
          {address && <p className="flex items-center gap-2 opacity-80"><FiMapPin /> {address}</p>}
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
