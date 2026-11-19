import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onValue, ref } from 'firebase/database';
import { Bell } from 'lucide-react';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { toYmd } from '../../utils/clinicInsights';

function rows(snap) {
  const val = snap.val();
  return val ? Object.entries(val).map(([id, v]) => ({ id, ...(v || {}) })) : [];
}

const NOTE_ACCENTS = {
  pending: '#B45309',
  today: '#0FA3A3',
  failed: '#DC2626',
  orders: '#B45309',
  default: '#059669',
};

function noteAccent(id) {
  if (id.startsWith('inbox')) return '#059669';
  return NOTE_ACCENTS[id] || NOTE_ACCENTS.default;
}

function buildNotes({ appointments, inbox, messages, orders }) {
  const today = toYmd(new Date());
  const items = [];
  const pending = appointments.filter((a) => a.status === 'pending' && a.date >= today);
  if (pending.length) {
    items.push({
      id: 'pending',
      title: `${pending.length} حجز بانتظار التأكيد`,
      detail: pending.slice(0, 2).map((a) => a.customerName).filter(Boolean).join('، ') || 'من سجل المواعيد',
      to: '/appointments',
    });
  }
  const todayApts = appointments.filter((a) => a.date === today && !['cancelled'].includes(a.status));
  if (todayApts.length) {
    items.push({
      id: 'today',
      title: `${todayApts.length} موعد اليوم`,
      detail: todayApts.slice(0, 2).map((a) => `${a.customerName || 'عميلة'} ${a.time || ''}`.trim()).join('، '),
      to: '/appointments',
    });
  }
  inbox.filter((i) => i.status === 'open').slice(0, 5).forEach((i) => {
    items.push({
      id: `inbox-${i.id}`,
      title: i.name || 'رسالة واردة',
      detail: i.body || i.phone || 'من صندوق الاسترجاع',
      to: '/winback',
    });
  });
  const failed = messages.filter((m) => m.status === 'failed');
  if (failed.length) {
    items.push({
      id: 'failed',
      title: `${failed.length} رسالة فشل إرسالها`,
      detail: 'من حملات الاسترجاع',
      to: '/winback',
    });
  }
  const waitingOrders = orders.filter((o) => !o.status || o.status === 'pending' || o.status === 'new');
  if (waitingOrders.length) {
    items.push({
      id: 'orders',
      title: `${waitingOrders.length} طلب منتج بانتظار المتابعة`,
      detail: 'من طلبيات المنتجات',
      to: '/products?tab=orders',
    });
  }
  return items;
}

const NotificationBell = () => {
  const { clinicPath } = useClinic();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [messages, setMessages] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const unsubs = [
      onValue(ref(database, clinicPath('appointments')), (s) => setAppointments(rows(s))),
      onValue(ref(database, clinicPath('winbackInbox')), (s) => setInbox(rows(s))),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(rows(s))),
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(rows(s))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicPath]);

  const notes = useMemo(
    () => buildNotes({ appointments, inbox, messages, orders }),
    [appointments, inbox, messages, orders],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4EAEE] bg-white text-[#64748B] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490] dark:border-[#2A3944] dark:bg-[#152029] dark:text-[#E8EEEA]"
        aria-label="تنبيهات"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} strokeWidth={2.25} />
        {notes.length > 0 && (
          <span className="absolute -start-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#059669] px-1 text-[10px] font-bold text-white dark:border-[#152029]">
            {notes.length > 9 ? '9+' : notes.length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute end-0 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#E4EAEE] bg-white shadow-xl dark:border-[#2A3944] dark:bg-[#152029]"
          role="menu"
        >
          <div className="border-b border-[#E4EAEE] bg-[#F8FBFC] px-4 py-3 dark:border-[#2A3944] dark:bg-[#101920]">
            <p className="text-[11px] font-bold text-[#94A3B8]">المتابعة</p>
            <p className="text-[14px] font-extrabold text-[#0F172A] dark:text-white">التنبيهات</p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              {notes.length ? `${notes.length} بند يحتاج متابعة` : 'لا شيء معلّق الآن'}
            </p>
          </div>
          <div className="max-h-[min(20rem,70vh)] space-y-2 overflow-y-auto p-2">
            {notes.length === 0 && (
              <div className="rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-8 text-center text-[13px] text-[#64748B] dark:border-[#2A3944] dark:bg-[#101920]">
                كل شيء هادئ — لا تنبيهات حالياً.
              </div>
            )}
            {notes.map((note) => {
              const accent = noteAccent(note.id);
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => go(note.to)}
                  className="relative w-full overflow-hidden rounded-lg border border-[#E4EAEE] bg-white py-2.5 ps-4 pe-3 text-right transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FBFC] dark:border-[#2A3944] dark:bg-[#152029] dark:hover:bg-[#101920]"
                  role="menuitem"
                >
                  <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
                  <span className="block text-[13px] font-bold text-[#0F172A] dark:text-white">{note.title}</span>
                  {note.detail && (
                    <span className="mt-0.5 block line-clamp-2 text-[11px] leading-relaxed text-[#64748B]">{note.detail}</span>
                  )}
                  <span className="mt-1 block text-[10.5px] font-bold text-[#0E7490]">فتح ←</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;