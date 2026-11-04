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
        className="relative w-10 h-10 rounded-full bg-white border border-[#ebeef2] text-[#6b7280] flex items-center justify-center dark:bg-[#152029] dark:border-[#2A3944] dark:text-[#E8EEEA]"
        aria-label="تنبيهات"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} />
        {notes.length > 0 && (
          <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-[#10b981] text-white text-[10px] font-bold flex items-center justify-center">
            {notes.length > 9 ? '9+' : notes.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-12 end-0 z-40 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-[#e4eee8] bg-white shadow-lg dark:bg-[#152029] dark:border-[#2A3944]">
          <div className="px-4 py-3 border-b border-[#e4eee8] dark:border-[#2A3944]">
            <p className="font-bold text-sm text-[#111827] dark:text-white">التنبيهات</p>
            <p className="text-xs text-[#8a9199] mt-0.5">{notes.length ? `${notes.length} بند يحتاج متابعة` : 'ما في شي معلّق'}</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {notes.length === 0 && <p className="text-sm text-[#8a9199] px-2 py-4 text-center">كل شي هادي هلق.</p>}
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => go(note.to)}
                className="w-full text-right rounded-xl px-3 py-2.5 hover:bg-[#f8faf9] dark:hover:bg-[#101920]"
              >
                <span className="block text-sm font-bold text-[#111827] dark:text-white">{note.title}</span>
                {note.detail && <span className="block text-xs text-[#8a9199] mt-0.5 line-clamp-2">{note.detail}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
