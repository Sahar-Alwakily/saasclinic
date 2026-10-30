import React from 'react';
import { useLocale } from '../../context/LocaleContext';

const LangSwitcher = ({ tone = 'dark' }) => {
  const { lang, setLang, langs } = useLocale();
  const light = tone === 'light';
  return (
    <div className={`flex items-center gap-0.5 rounded-md p-0.5 text-[11px] font-medium ${light ? 'bg-black/5' : 'bg-white/10'}`} role="navigation" aria-label="Language">
      {langs.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLang(l.id)}
          className={`px-2 py-1 rounded ${
            lang === l.id
              ? light ? 'bg-[#172B3A] text-white' : 'bg-white text-[#172B3A]'
              : light ? 'text-[#75818B] hover:text-[#172B3A]' : 'text-white/60 hover:text-white'
          }`}
        >
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LangSwitcher;
