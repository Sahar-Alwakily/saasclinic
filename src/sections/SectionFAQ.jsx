import React, { useState } from 'react';
import { useSectionSkin } from './sectionSkin';

export default function SectionFAQ({ settings = {} }) {
  const skin = useSectionSkin();
  const items = Array.isArray(settings.items) ? settings.items.filter((i) => i?.question) : [];
  const [open, setOpen] = useState(0);
  if (!items.length) return null;

  return (
    <section id="faq" className={skin.wrap}>
      <div className={`${skin.inner} max-w-3xl`}>
        <h2 className={skin.title}>{settings.title || 'أسئلة شائعة'}</h2>
        <div className="space-y-2">
          {items.map((item, i) => {
            const expanded = open === i;
            return (
              <div key={i} className={`border overflow-hidden ${skin.radius}`} style={{ borderColor: skin.border, backgroundColor: skin.cardBg }}>
                <button
                  type="button"
                  className="w-full text-right px-5 py-4 font-bold flex justify-between gap-3"
                  onClick={() => setOpen(expanded ? -1 : i)}
                  aria-expanded={expanded}
                >
                  <span>{item.question}</span>
                  <span className="opacity-40">{expanded ? '−' : '+'}</span>
                </button>
                {expanded && <p className="px-5 pb-4 text-sm leading-relaxed opacity-80">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
