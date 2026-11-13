import React, { useState } from 'react';
import { FaChevronDown, FaQuestionCircle } from 'react-icons/fa';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionFAQ({ settings = {} }) {
  const { themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const items = Array.isArray(settings.items) ? settings.items.filter((i) => i?.question) : [];
  const [openIndex, setOpenIndex] = useState(null);
  if (!items.length) return null;

  if (themeVariant !== 'beauty') {
    return (
      <section id="faq" className={skin.wrap}>
        <div className={`${skin.inner} max-w-3xl`}>
          <h2 className={skin.title}>{settings.title || 'أسئلة شائعة'}</h2>
          <div className="space-y-2">
            {items.map((item, i) => {
              const expanded = openIndex === i;
              return (
                <div key={i} className={`border overflow-hidden ${skin.radius}`} style={{ borderColor: skin.border, backgroundColor: skin.cardBg }}>
                  <button type="button" className="w-full text-right px-5 py-4 font-bold flex justify-between gap-3" onClick={() => setOpenIndex(expanded ? -1 : i)}>
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

  return (
    <section id="faq" className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-3 shadow-md"
          style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
        >
          <FaQuestionCircle className="text-xl" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800">
          الأسئلة <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>الشائعة</span>
        </h2>
        <p className="text-sm text-gray-500 mt-2">{settings.subtitle || 'إجابات على أكثر الأسئلة تكراراً'}</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-6 space-y-3">
          {items.map((faq, index) => (
            <div key={index} className="border border-gray-100 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-right text-sm md:text-base font-semibold text-gray-800 px-5 py-4 flex justify-between items-center hover:bg-blue-50 transition-colors"
              >
                <span>{faq.question}</span>
                <span className="transition-transform" style={{ color: primaryColor, transform: openIndex === index ? 'rotate(180deg)' : 'none' }}>
                  <FaChevronDown />
                </span>
              </button>
              {openIndex === index && (
                <div className="px-5 pb-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
