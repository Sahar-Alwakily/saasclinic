import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaComments, FaTimes, FaPaperPlane, FaKey } from 'react-icons/fa';
import { useClinicSnapshot } from '../../hooks/useClinicSnapshot';
import { spokenLocal } from '../../utils/consoleBrief';
import { askGemini } from '../../utils/geminiChat';
import { getGeminiKey, setGeminiKey } from '../../utils/geminiKey';

const ConsoleChat = () => {
  const { pathname } = useLocation();
  const brief = useClinicSnapshot(pathname);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      system: true,
      text: 'أهلين. احكي عادي — حجوزات، فراغ، إيراد، أو شو ما شغّلك هلق.',
    },
  ]);
  const scroller = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setHasKey(!!getGeminiKey());
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, busy]);

  const saveKey = () => {
    setGeminiKey(keyDraft);
    setHasKey(!!getGeminiKey());
    setShowKey(false);
    setKeyDraft('');
  };

  const send = async () => {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft('');
    const prior = messages;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const key = getGeminiKey();
      let reply;
      if (key) {
        reply = await askGemini({
          key,
          briefText: brief.text,
          history: prior,
          question: q,
          pathname,
        });
      } else {
        reply = spokenLocal(brief, q);
      }
      setMessages((m) => [...m, { role: 'assistant', text: reply.answer, links: reply.links || [] }]);
    } catch {
      const local = spokenLocal(brief, q);
      setMessages((m) => [...m, {
        role: 'assistant',
        text: local.answer,
        links: local.links || [],
      }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-[55] bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] w-14 h-14 rounded-2xl bg-[#14121c] text-white shadow-lg flex items-center justify-center ${open ? 'hidden' : ''}`}
        aria-label="فتح المساعد"
      >
        <FaComments />
      </button>

      {open && (
        <div className="fixed z-[60] bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] w-[min(24rem,calc(100vw-1.5rem))] h-[min(36rem,calc(100dvh-5rem))] rounded-3xl bg-white dark:bg-[#14121c] border border-[#e4ddd0] dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
          <header className="px-4 py-3 bg-[#14121c] text-white flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-product text-lg leading-none">المساعد</p>
              <p className="text-[11px] text-white/50 mt-1">{hasKey ? 'يحكي معك من سجل العيادة' : 'فعّلي المفتاح حتى يساير الحكي'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="p-2 rounded-lg hover:bg-white/10" aria-label="مفتاح" onClick={() => setShowKey((v) => !v)}>
                <FaKey className="text-sm" />
              </button>
              <button type="button" className="p-2 rounded-lg hover:bg-white/10" aria-label="إغلاق" onClick={() => setOpen(false)}>
                <FaTimes />
              </button>
            </div>
          </header>

          {showKey && (
            <div className="px-3 py-2 bg-[#f3efe6] dark:bg-[#1e1b28] space-y-2 text-xs">
              <p>مفتاح Google AI Studio — اختياري إذا ما كان محمّل من المشروع.</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="AIza… أو AQ."
                  className="flex-1 p-2 rounded-xl outline-none bg-white dark:bg-[#14121c]"
                  dir="ltr"
                />
                <button type="button" onClick={saveKey} className="px-3 rounded-xl bg-[#4d7cff] text-white font-bold">حفظ</button>
              </div>
            </div>
          )}

          <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`text-sm leading-relaxed ${m.role === 'user' ? 'mr-8' : 'ml-4'}`}>
                <div className={`rounded-2xl px-3 py-2 whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#4d7cff] text-white' : 'bg-[#f3efe6] dark:bg-[#1e1b28]'}`}>
                  {m.text}
                </div>
                {m.links?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {m.links.map((l) => (
                      <Link
                        key={`${l.path}-${l.label}`}
                        to={l.path}
                        className="text-[11px] px-2 py-1 rounded-full bg-[#14121c] text-white"
                        onClick={() => setOpen(false)}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-stone-400">عم بقرأ السجل ويرد...</p>}
          </div>

          <form
            className="p-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] outline-none text-sm"
              placeholder="اكتبي اللي بدك ياه..."
              disabled={busy}
            />
            <button type="submit" disabled={busy || !draft.trim()} className="w-12 rounded-xl bg-[#14121c] text-white flex items-center justify-center disabled:opacity-40" aria-label="إرسال">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ConsoleChat;
