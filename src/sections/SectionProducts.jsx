import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { addToCart } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionProducts({ settings = {} }) {
  const { products = [], setCart, clinic } = useTheme();
  const skin = useSectionSkin();
  if (clinic?.showProducts === false) return null;
  const list = products || [];
  if (!list.length) return null;

  return (
    <section id="products" className={skin.wrap}>
      <div className={skin.inner}>
        <p className={skin.kicker} style={{ color: skin.primaryColor }}>روتين منزلي</p>
        <h2 className={skin.title}>{settings.title || 'بوتيك العناية'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {list.map((p) => (
            <div key={p.id} className={`p-3 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
              <div
                className={`aspect-square overflow-hidden mb-3 ${skin.minimal ? 'rounded-md' : 'rounded-2xl'}`}
                style={{ backgroundColor: skin.cardBg }}
              >
                {p.imageUrl || p.image
                  ? <img src={p.imageUrl || p.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center opacity-40">عناية</div>}
              </div>
              <h3 className="font-bold text-sm mb-1 line-clamp-1">{p.title}</h3>
              <p className="font-bold mb-3" style={{ color: skin.primaryColor }}>{p.price} ₪</p>
              <button type="button" onClick={() => addToCart(setCart, p)} className="w-full py-2 rounded-full text-white text-sm font-bold flex items-center justify-center gap-1" style={{ backgroundColor: skin.primaryColor }}>
                <FiPlus size={14} /> أضيفي للسلة
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
