import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { FaShoppingBag, FaArrowLeft } from 'react-icons/fa';
import { addToCart, withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionProducts({ settings = {} }) {
  const { products = [], setCart, clinic, themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const [selected, setSelected] = useState(null);
  if (clinic?.showProducts === false) return null;
  const list = (products || []).slice(0, Number(settings.limit) > 0 ? Number(settings.limit) : 8);
  if (!list.length) return null;

  const imgOf = (p) => p.imageUrl || p.image || p.photo || '';
  const nameOf = (p) => p.title || p.name || 'منتج';

  if (themeVariant !== 'beauty') {
    return (
      <section id="products" className={skin.wrap}>
        <div className={skin.inner}>
          <p className={skin.kicker} style={{ color: skin.primaryColor }}>روتين منزلي</p>
          <h2 className={skin.title}>{settings.title || 'بوتيك العناية'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {list.map((p) => (
              <div key={p.id} className={`p-3 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
                <div className={`aspect-square overflow-hidden mb-3 ${skin.minimal ? 'rounded-md' : 'rounded-2xl'}`} style={{ backgroundColor: skin.cardBg }}>
                  {imgOf(p)
                    ? <img src={imgOf(p)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center opacity-40">عناية</div>}
                </div>
                <h3 className="font-bold text-sm mb-1 line-clamp-1">{nameOf(p)}</h3>
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

  return (
    <section id="products" className="px-2 sm:px-6 my-20" dir="rtl">
      <div className="text-center mb-12">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: primaryColor }}>المنتجات</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 mt-2">
          منتجات <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>مختارة</span>
        </h2>
        <p className="text-sm text-gray-500 mt-3">{settings.subtitle || 'مستحضرات عناية بأعلى جودة'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {list.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col"
            style={{ borderColor: withAlpha(primaryColor, 0.2) }}
          >
            <div className="h-40 sm:h-48 flex items-center justify-center p-4 overflow-hidden" style={{ backgroundColor: withAlpha(primaryColor, 0.08) }}>
              {imgOf(product)
                ? <img className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300" src={imgOf(product)} alt="" onClick={() => setSelected(product)} />
                : <FaShoppingBag className="text-3xl opacity-30" style={{ color: primaryColor }} />}
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1 line-clamp-2 min-h-12">{nameOf(product)}</h3>
              {(product.catalog || product.category) && (
                <p className="text-xs text-gray-500 mb-2">{product.catalog || product.category}</p>
              )}
              <p className="text-base md:text-lg font-bold mb-3 mt-auto" style={{ color: primaryColor }}>
                {product.price ? `${product.price} ₪` : 'السعر غير متوفر'}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelected(product)} className="flex-1 text-xs text-gray-500 border px-2 py-1.5 rounded-lg" style={{ borderColor: withAlpha(primaryColor, 0.2) }}>
                  التفاصيل
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(setCart, { ...product, title: nameOf(product), imageUrl: imgOf(product) })}
                  className="flex-1 text-white text-xs px-2 py-1.5 rounded-lg font-semibold"
                  style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
                >
                  أضف للسلة
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list.length > 0 && (
        <div className="text-center mt-12">
          <a
            href="#products"
            className="inline-flex items-center gap-2 bg-white border-2 px-8 py-3 rounded-xl font-semibold shadow-sm"
            style={{ color: primaryColor, borderColor: primaryColor }}
          >
            لمزيد من المنتجات
            <FaArrowLeft className="text-xs" />
          </a>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="إغلاق" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md md:max-w-2xl lg:max-w-4xl rounded-3xl bg-white shadow-xl overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="p-6 flex items-center justify-center w-full md:w-1/2" style={{ backgroundColor: withAlpha(primaryColor, 0.08) }}>
                {imgOf(selected)
                  ? <img src={imgOf(selected)} alt="" className="w-full h-56 md:h-80 object-contain rounded-xl" />
                  : <FaShoppingBag className="text-5xl opacity-30" style={{ color: primaryColor }} />}
              </div>
              <div className="p-6 md:p-8 space-y-4 w-full md:w-1/2">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">{nameOf(selected)}</h3>
                  <button type="button" onClick={() => setSelected(null)} className="text-gray-500 text-2xl leading-none">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ backgroundColor: withAlpha(primaryColor, 0.08) }}>
                  <div>
                    <p className="text-xs text-gray-500">السعر</p>
                    <p className="text-lg font-bold" style={{ color: primaryColor }}>{selected.price ? `${selected.price} ₪` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">التصنيف</p>
                    <p className="font-medium text-gray-800 text-sm">{selected.catalog || selected.category || 'عناية'}</p>
                  </div>
                </div>
                {(selected.description || selected.use) && (
                  <p className="text-gray-600 text-sm whitespace-pre-line">{selected.description || selected.use}</p>
                )}
                <button
                  type="button"
                  onClick={() => { addToCart(setCart, { ...selected, title: nameOf(selected), imageUrl: imgOf(selected) }); setSelected(null); }}
                  className="w-full text-white py-3 rounded-xl font-bold shadow"
                  style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
                >
                  أضف إلى السلة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
