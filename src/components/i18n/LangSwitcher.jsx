import React from 'react';
import { useLocale } from '../../context/LocaleContext';

const LangSwitcher = ({ tone = 'dark' }) => {
  const { lang, setLang, langs } = useLocale();
  const light = tone === 'light';
  return (
    <div className={`flex items-center gap-0.5 rounded-full p-0.5 text-[11px] font-bold ${light ? 'bg-black/5' : 'bg-white/10'}`} role="navigation" aria-label="Language">
      {langs.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLang(l.id)}
          className={`px-2 py-1 rounded-full ${
            lang === l.id
              ? light ? 'bg-[#14121c] text-white' : 'bg-white text-[#14121c]'
              : light ? 'text-stone-500 hover:text-[#14121c]' : 'text-white/60 hover:text-white'
          }`}
        >
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LangSwitcher;
