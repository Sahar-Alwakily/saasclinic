import React from 'react';
import { GUEST_NOTES } from '../components/themes/themeUtils';
import { useSectionSkin } from './sectionSkin';

export default function SectionTestimonials({ settings = {} }) {
  const skin = useSectionSkin();
  const items = Array.isArray(settings.items) && settings.items.length
    ? settings.items
    : GUEST_NOTES.map((n) => ({ quote: n.quote, name: n.name }));
  if (!items.length) return null;

  return (
    <section id="testimonials" className={skin.wrap}>
      <div className={skin.inner}>
        <h2 className={skin.title}>{settings.title || 'من غرفة العيادة'}</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((n, i) => (
            <blockquote key={`${n.name || i}`} className={`p-7 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
              <p className="leading-relaxed mb-4">“{n.quote}”</p>
              <footer className="text-xs tracking-wide opacity-50">{n.name}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
