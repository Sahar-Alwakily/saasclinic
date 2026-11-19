import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { mergeAptSettings } from '../utils/appointmentOps';
import { mergeSettings } from '../utils/winback';

const Assistant = () => {
  const { clinicInfo, clinicPath } = useClinic();
  const [inbox, setInbox] = useState([]);
  const [aptSet, setAptSet] = useState(null);
  const [wbSet, setWbSet] = useState(null);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('winbackInbox')), (s) => {
        setInbox(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
      }),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setAptSet(s.val())),
      onValue(ref(database, clinicPath('winbackSettings')), (s) => setWbSet(s.val())),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const apt = useMemo(() => mergeAptSettings(aptSet), [aptSet]);
  const wb = useMemo(() => mergeSettings(wbSet), [wbSet]);
  const wa = clinicInfo?.whatsapp || clinicInfo?.phone || '';
  const openInbox = inbox.filter((r) => r.status === 'open' || !r.status).length;

  const kpis = [
    { label: 'محادثات مسجّلة', value: String(inbox.length), note: openInbox ? `${openInbox} مفتوحة` : 'لا وارد مفتوح', accent: '#059669' },
    { label: 'ساعات الهدوء', value: `${apt.quietStart}–${apt.quietEnd}`, note: 'من قواعد المواعيد', accent: '#0FA3A3' },
    { label: 'سقف التواصل', value: wb.contactCapPerMonth != null ? String(wb.contactCapPerMonth) : '—', note: 'رسائل / شهر لكل عميلة', accent: '#B45309' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <header>
        <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الكونسول</p>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">وَرَفَ الذكية</h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-[#64748B]">
          شات الكونسول ثابت أسفل اليسار على كل الشاشات. هذه الصفحة لوارد واتساب المسجّل وساعات الهدوء وحد التواصل.
        </p>
      </header>

      <section aria-label="مؤشرات الورف" className="grid grid-cols-3 border-y border-[#E4EAEE]">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-5 py-4 ${i > 0 ? 'border-s border-[#E4EAEE]' : ''}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
              {k.label}
            </p>
            <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-[#E4EAEE] bg-white p-4">
          <p className="text-[11px] font-bold text-[#64748B]">الواتساب</p>
          <p className="mt-2 text-[22px] font-light tabular-nums" dir="ltr">{wa || 'غير مربوط'}</p>
          <p className="mt-2 text-[11px] text-[#94A3B8]">ربط واتساب من إدارة المنصة</p>
        </article>
        <article className="rounded-lg border border-[#E4EAEE] bg-white p-4">
          <p className="text-[11px] font-bold text-[#64748B]">ساعات الهدوء</p>
          <p className="mt-2 text-[22px] font-light">{apt.quietStart}:00 – {apt.quietEnd}:00</p>
          <Link to="/appointments/reminders" className="mt-2 inline-block text-[11.5px] font-bold text-[#0E7490] hover:underline">قواعد المواعيد</Link>
        </article>
        <article className="rounded-lg border border-[#E4EAEE] bg-white p-4">
          <p className="text-[11px] font-bold text-[#64748B]">حد التواصل / شهر</p>
          <p className="mt-2 text-[22px] font-light tabular-nums">{wb.contactCapPerMonth ?? '—'}</p>
          <Link to="/winback" className="mt-2 inline-block text-[11.5px] font-bold text-[#0E7490] hover:underline">إعدادات الاسترجاع</Link>
        </article>
      </div>

      <section className="rounded-lg border border-[#E4EAEE] bg-white p-4">
        <h2 className="text-[15px] font-bold">المحادثات المسجّلة</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">ما يُسجَّل من استرجاع العميلات وتحويلات الاستقبال.</p>
        {inbox.length === 0 && (
          <p className="mt-6 text-center text-[12.5px] text-[#94A3B8]">لا وارد بعد.</p>
        )}
        <ul className="mt-4 space-y-2">
          {inbox.slice(0, 20).map((row) => (
            <li
              key={row.id}
              className="rounded-lg border-s-[3px] border border-[#E4EAEE] bg-[#F8FBFC] p-3 text-[13px]"
              style={{ borderRightColor: row.status === 'open' ? '#059669' : '#E4EAEE' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold">{row.name || row.phone || 'محادثة'}</p>
                {row.status === 'open' && (
                  <span className="rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10.5px] font-bold text-[#047857]">مفتوحة</span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] text-[#64748B]">{row.body || row.message || row.preview || 'بدون نص'}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Assistant;