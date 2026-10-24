import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { withAlpha, serviceDuration } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';

export default function SectionServices({ settings = {} }) {
  const { services = [], onOpenBooking, primaryColor } = useTheme();
  const { clinicId } = useParams();
  const title = settings.title || 'علاجات البشرة والتجميل';
  const limit = Number(settings.limit) > 0 ? Number(settings.limit) : services.length;
  const list = services.slice(0, limit);

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
                {s.specialistName && <p className="text-xs opacity-50 mb-4">تقدّمها {s.specialistName}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold text-lg" style={{ color: primaryColor }}>{s.price} ₪</span>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    {clinicId && <Link to={`/book/${clinicId}/service/${s.id}`} style={{ color: primaryColor }}>التفاصيل</Link>}
                    <button type="button" onClick={() => onOpenBooking({ serviceId: s.id })}>احجزي ←</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
