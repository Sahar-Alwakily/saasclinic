import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiMapPin, FiPhone, FiClock } from 'react-icons/fi';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionBranches({ settings = {} }) {
  const { clinic, branches = [], onOpenBooking } = useTheme();
  const { clinicId } = useParams();
  const skin = useSectionSkin();

  return (
    <section id="branches" className={skin.wrap}>
      <div className={`${skin.inner} grid md:grid-cols-3 gap-5`}>
        <div className={`md:col-span-1 p-7 border ${skin.radius}`} style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}>
          <h2 className="font-display text-3xl mb-4">{settings.title || 'فروع العيادة'}</h2>
          {clinic?.phone && <p className="flex items-center gap-2 text-sm opacity-80 mb-3" dir="ltr"><FiPhone /> {clinic.phone}</p>}
          <p className="flex items-center gap-2 text-sm opacity-80"><FiClock /> حجوزات خاصة حسب الموعد</p>
          <button type="button" onClick={() => onOpenBooking()} className="mt-6 w-full py-3 rounded-full text-white font-bold" style={{ backgroundColor: skin.primaryColor }}>احجزي موعداً</button>
        </div>
        <div className="md:col-span-2 grid gap-4">
          {branches.length === 0 && <p className="text-sm opacity-60 p-5">أضيفي الفروع من لوحة التحكم لتظهر هنا.</p>}
          {branches.map((b) => (
            <Link
              key={b.id}
              to={clinicId ? `/book/${clinicId}/branch/${b.id}` : '#'}
              className={`p-5 flex items-center gap-4 border ${skin.radius}`}
              style={{ backgroundColor: skin.cardBg, borderColor: skin.border }}
            >
              <div className="w-11 h-11 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: skin.primaryColor }}><FiMapPin /></div>
              <div>
                <h3 className="font-bold">{b.name}</h3>
                <p className="text-sm opacity-70">{b.address}</p>
                {b.phone && <p className="text-xs opacity-50 mt-1" dir="ltr">{b.phone}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
