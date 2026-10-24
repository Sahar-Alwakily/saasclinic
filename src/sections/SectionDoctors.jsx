import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';

export default function SectionDoctors({ settings = {} }) {
  const { clinic, onOpenBooking, primaryColor } = useTheme();
  const name = settings.name || clinic?.doctorName || clinic?.name;
  const bio = settings.bio || clinic?.doctorBio;
  if (!name && !bio) return null;

  return (
    <section id="doctors" className="px-5 pb-20">
      <div className="max-w-5xl mx-auto bg-white rounded-[2rem] p-8 md:p-12 gap-8 items-center border shadow-sm" style={{ borderColor: withAlpha(primaryColor, 0.12) }}>
        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: primaryColor }}>أخصائية البشرة</p>
        <h2 className="font-display text-4xl mb-2">{name}</h2>
        <p className="text-sm font-bold mb-4 opacity-70">{[clinic?.degree, clinic?.specialty].filter(Boolean).join(' · ')}</p>
        {bio && <p className="leading-relaxed opacity-80">{bio}</p>}
        <button type="button" onClick={() => onOpenBooking()} className="mt-6 inline-flex items-center gap-2 text-sm font-bold" style={{ color: primaryColor }}>
          احجزي معها <FiArrowLeft />
        </button>
      </div>
    </section>
  );
}
