import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaStar, FaClock, FaAward, FaCalendarAlt } from 'react-icons/fa';
import { withAlpha, serviceDuration } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';

export default function SectionServices({ settings = {} }) {
  const { services = [], onOpenBooking, primaryColor, clinic, themeVariant } = useTheme();
  const { clinicId } = useParams();
  const title = settings.title || 'خدماتنا التجميلية';
  const limit = Number(settings.limit) > 0 ? Number(settings.limit) : services.length;
  const list = services.slice(0, limit);
  const [selected, setSelected] = useState(null);
  const beauty = themeVariant === 'beauty';

  if (!beauty) {
    return (
      <section id="services" className="px-5 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: primaryColor }}>قائمة الجلسات</p>
              <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
            </div>
            <button type="button" onClick={() => onOpenBooking()} className="text-sm font-bold shrink-0" style={{ color: primaryColor }}>احجزي الآن ←</button>
          </div>
          {list.length === 0 ? (
            <div className="rounded-3xl p-12 text-center border" style={{ backgroundColor: withAlpha('#ffffff', 0.7), borderColor: withAlpha(primaryColor, 0.12) }}>
              <p className="font-bold mb-2">الجلسات تُحدَّث قريباً</p>
              <button type="button" onClick={() => onOpenBooking()} className="mt-4 px-6 py-3 rounded-full text-white font-bold" style={{ backgroundColor: primaryColor }}>احجزي استشارة</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((s) => (
                <article key={s.id} className="text-right bg-white rounded-[1.75rem] p-6 border shadow-sm hover:-translate-y-1 transition duration-300" style={{ borderColor: withAlpha(primaryColor, 0.1), backgroundColor: withAlpha('#ffffff', 0.95) }}>
                  {s.imageUrl && (
                    <div className="h-36 rounded-2xl overflow-hidden mb-4 bg-[#f6eee9]">
                      <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] tracking-widest uppercase opacity-50">جلسة تجميل</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ backgroundColor: withAlpha(primaryColor, 0.12), color: primaryColor }}>{serviceDuration(s)}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{s.title || s.name}</h3>
                  {s.description && <p className="text-sm opacity-70 line-clamp-2 mb-4">{s.description}</p>}
                  <div className="flex items-center justify-end gap-3 text-sm font-bold">
                    {clinicId && <Link to={`/book/${clinicId}/service/${s.id}`} style={{ color: primaryColor }}>التفاصيل</Link>}
                    <button type="button" onClick={() => onOpenBooking({ serviceId: s.id })}>احجزي ←</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const imgOf = (s) => s.imageUrl || s.serviceImageUrl || s.image || '';

  return (
    <section id="services" className="px-4 py-16" dir="rtl">
      <div className="text-center mb-12">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: primaryColor }}>الخدمات</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 mt-2">
          خدماتنا <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }}>التجميلية</span>
        </h2>
        <div className="w-20 h-1 mx-auto mt-4 rounded-full" style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.75)})` }} />
        <p className="text-sm text-gray-500 mt-4 max-w-2xl mx-auto leading-relaxed">
          {settings.subtitle || `اكتشفي مجموعة من أفضل الخدمات التجميلية مع ${clinic?.doctorName || clinic?.name || 'العيادة'} — واحجزي موعدك بسهولة.`}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-center py-12 text-gray-500">لا توجد خدمات متاحة حالياً</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {list.map((service) => (
            <button
              type="button"
              key={service.id}
              onClick={() => setSelected(service)}
              className="group flex flex-col items-center text-center cursor-pointer p-5 bg-white rounded-2xl border hover:shadow-xl transition-all duration-300"
              style={{ borderColor: withAlpha(primaryColor, 0.2) }}
            >
              <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 rounded-full group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(to bottom right, ${withAlpha(primaryColor, 0.2)}, ${withAlpha(primaryColor, 0.12)})` }} />
                {imgOf(service) ? (
                  <img className="w-full h-full object-cover rounded-full border-2 relative z-10" style={{ borderColor: withAlpha(primaryColor, 0.25) }} src={imgOf(service)} alt="" />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center relative z-10" style={{ backgroundColor: withAlpha(primaryColor, 0.08), color: primaryColor }}>
                    <FaStar className="text-2xl" />
                  </div>
                )}
              </div>
              <p className="text-sm font-bold text-gray-800 group-hover:opacity-80">{service.title || service.name}</p>
              {service.isFeatured && (
                <span className="text-[10px] px-2 py-0.5 rounded-full mt-2 flex items-center gap-1 font-semibold" style={{ backgroundColor: withAlpha(primaryColor, 0.15), color: primaryColor }}>
                  <FaStar className="text-[8px]" /> مميزة
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="إغلاق" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <button type="button" onClick={() => setSelected(null)} className="absolute top-4 left-4 z-20 bg-white rounded-full p-2 shadow-md" style={{ color: primaryColor }}>✕</button>
            <div className="overflow-y-auto">
              <div className="p-6 md:p-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-24 h-24 rounded-full border-4 overflow-hidden shadow-md mb-4 flex items-center justify-center" style={{ borderColor: withAlpha(primaryColor, 0.25), backgroundColor: withAlpha(primaryColor, 0.08) }}>
                    {imgOf(selected)
                      ? <img src={imgOf(selected)} alt="" className="w-full h-full object-cover" />
                      : <FaStar className="text-3xl" style={{ color: primaryColor }} />}
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-800">{selected.title || selected.name}</h3>
                </div>
                {selected.description && (
                  <div className="p-5 rounded-2xl mb-4" style={{ backgroundColor: withAlpha(primaryColor, 0.08) }}>
                    <h4 className="text-base font-bold text-gray-800 mb-2">وصف الخدمة</h4>
                    <p className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">{selected.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}>
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-1 text-sm"><FaClock style={{ color: primaryColor }} /> مدة الجلسة</h4>
                    <p className="text-gray-600 text-sm">{selected.sessionDuration || serviceDuration(selected)}</p>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}>
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-1 text-sm"><FaAward style={{ color: primaryColor }} /> السعر</h4>
                    <p className="text-gray-600 text-sm">{selected.price ? `${selected.price} ₪` : 'حسب الاستشارة'}</p>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t p-4" style={{ borderColor: withAlpha(primaryColor, 0.15) }}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => { const id = selected.id; setSelected(null); onOpenBooking({ serviceId: id }); }}
                    className="flex-1 text-white px-6 py-3 rounded-xl font-bold text-center shadow-md flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}
                  >
                    <FaCalendarAlt /> احجزي موعدك
                  </button>
                  {clinicId && (
                    <Link
                      to={`/book/${clinicId}/service/${selected.id}`}
                      className="flex-1 border-2 px-6 py-3 rounded-xl font-semibold text-center"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      التفاصيل
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
