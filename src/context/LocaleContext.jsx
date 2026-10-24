import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, LANG_STORAGE, LANGS, getLang } from '../i18n/langs';
import { interpolate, lookup, MESSAGES } from '../i18n/messages';

const LocaleContext = createContext(null);

export const LocaleProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG;
    const saved = window.localStorage.getItem(LANG_STORAGE);
    return LANGS.some((l) => l.id === saved) ? saved : DEFAULT_LANG;
  });

  const meta = getLang(lang);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    document.documentElement.style.fontFamily = meta.font;
    window.localStorage.setItem(LANG_STORAGE, lang);
  }, [lang, meta.dir, meta.font]);

  const setLang = useCallback((id) => {
    if (LANGS.some((l) => l.id === id)) setLangState(id);
  }, []);

  const t = useCallback((path, vars) => {
    const raw = lookup(lang, path);
    if (raw == null) return path;
    if (typeof raw === 'string') return interpolate(raw, vars);
    return raw;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, dir: meta.dir, locale: meta.locale, t, langs: LANGS, messages: MESSAGES[lang] || MESSAGES.ar }),
    [lang, setLang, meta.dir, meta.locale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
};
