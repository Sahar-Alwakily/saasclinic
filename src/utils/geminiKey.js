export const GEMINI_KEY_STORAGE = 'nura.geminiApiKey';

export function getGeminiKey() {
  if (typeof window !== 'undefined') {
    const local = window.localStorage.getItem(GEMINI_KEY_STORAGE);
    if (local && local.trim()) return local.trim();
  }
  return String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

export function setGeminiKey(key) {
  if (typeof window === 'undefined') return;
  const v = String(key || '').trim();
  if (v) window.localStorage.setItem(GEMINI_KEY_STORAGE, v);
  else window.localStorage.removeItem(GEMINI_KEY_STORAGE);
}
