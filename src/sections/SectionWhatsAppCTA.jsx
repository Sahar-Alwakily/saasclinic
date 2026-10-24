import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { waLink } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionWhatsAppCTA({ settings = {} }) {
  const { clinic } = useTheme();
  const skin = useSectionSkin();
  const href = waLink(clinic?.whatsapp || clinic?.phone);
  if (!href) return null;

  return (
    <section id="whatsapp" className={skin.wrap}>
      <div className={`${skin.inner} text-center p-10 md:p-14 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
        <h2 className={skin.title}>{settings.title || 'احجزي عبر واتساب'}</h2>
        <p className="opacity-70 mb-6">{settings.subtitle || 'رسالة مباشرة لعيادتكِ — بدون وسيط.'}</p>
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold" style={{ backgroundColor: skin.primaryColor }}>
          <FaWhatsapp /> واتساب العيادة
        </a>
      </div>
    </section>
  );
}
