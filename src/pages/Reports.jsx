import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { Download } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { statusRates } from '../utils/appointmentOps';
import { buildClinicReport, deltaText } from '../utils/clinicReport';
import { filesReportHtml, numbersReportHtml, openReportPdf } from '../utils/reportPrint';

const STATUS = {
  review: 'مراجعة',
  active: 'نشطة',
  paused: 'متوقفة مؤقتاً',
  stopped: 'متوقفة',
};

const card = 'rounded-lg border border-[#E4EAEE] bg-white';
const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]';
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-bold text-[#047857]';
const chipRose = 'rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[10px] font-bold text-[#B91C1C]';
const chipGold = 'rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#B45309]';
const chipSky = 'rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[10px] font-bold text-[#0369A1]';
const chipMuted = 'rounded-full border border-[#E4EAEE] bg-[#F4F7F8] px-2.5 py-0.5 text-[10px] font-bold text-[#64748B]';

const Reports = () => {
  const { clinicPath, clinicInfo } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [offers, setOffers] = useState([]);
  const [groupOffers, setGroupOffers] = useState([]);
  const [blog, setBlog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [optOuts, setOptOuts] = useState({});
  const [ready, setReady] = useState(false);
  const [openClient, setOpenClient] = useState(null);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const read = (path, setter) => onValue(ref(database, clinicPath(path)), (s) => {
      const val = s.val();
      setter(val ? Object.entries(val).map(([id, v]) => ({ id, ...(typeof v === 'object' && v ? v : { value: v }) })) : []);
      if (path === 'customers') setReady(true);
    });
    const u = [
      read('appointments', setAppointments),
      read('customers', setCustomers),
      read('services', setServices),
      read('winbackCampaigns', setCampaigns),
      read('winbackMessages', setMessages),
      read('winbackOffers', setOffers),
      read('groupOffers', setGroupOffers),
      read('blog', setBlog),
      read('orders', setOrders),
      onValue(ref(database, clinicPath('winbackSettings')), (s) => setSettings(s.val())),
      onValue(ref(database, clinicPath('winbackOptOuts')), (s) => setOptOuts(s.val() || {})),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const report = useMemo(
    () => buildClinicReport({
      appointments, customers, services, settings, messages, optOuts, campaigns, offers, groupOffers, blog, orders,
    }),
    [appointments, customers, services, settings, messages, optOuts, campaigns, offers, groupOffers, blog, orders],
  );
  const rates = statusRates(appointments);
  const clinicName = clinicInfo?.name || 'العيادة';

  const download = (kind) => {
    const ok = kind === 'files'
      ? openReportPdf({ title: 'ملفات العميلات وجلسات الختم', clinicName, html: filesReportHtml(report.files) })
      : openReportPdf({ title: 'تقرير الحجوزات والتسويق', clinicName, html: numbersReportHtml(report) });
    if (!ok) toast.error('تعذّر تجهيز ملف الطباعة. أعيدي المحاولة واختاري حفظ كـ PDF.');
  };

  const downloadClient = (client) => {
    const ok = openReportPdf({
      title: `ملف ${client.name}`,
      clinicName,
      html: filesReportHtml([client]),
    });
    if (!ok) toast.error('تعذّر تجهيز ملف الطباعة. أعيدي المحاولة واختاري حفظ كـ PDF.');
  };

  if (!ready) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4EAEE] border-t-[#059669]" /></div>;
  }

  const { health, today, campaigns: camp, marketing, returns, files } = report;
  const w = health.windows;

  const kpis = [
    { label: 'حجوزات الفترة', value: String(health.curr.total), note: deltaText(health.deltas.book), accent: '#059669' },
    {
      label: 'حضور',
      value: health.curr.attendRate == null ? '—' : `${health.curr.attendRate}%`,
      note: `السابق ${health.prev.attendRate == null ? '—' : `${health.prev.attendRate}%`}`,
      accent: '#0FA3A3',
    },
    { label: 'مواعيد اليوم', value: String(today.total), note: `${today.pending} معلّق · ${today.cancelled} ملغى`, accent: '#B45309' },
    { label: 'العميلات', value: String(customers.length), note: `رجعن ${returns.cameBack.length} · ما رجعن ${returns.stayedAway.length}`, accent: '#64748B' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الإعدادات</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">التقارير والتحليلات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">
            من {w.thisStart} إلى {w.thisEnd} مقابل {w.prevStart} إلى {w.prevEnd}. التنزيل يفتح الطباعة ثم حفظ PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => download('numbers')} className={primary}>
            <Download size={16} /> تقرير الأرقام
          </button>
          <button type="button" onClick={() => download('files')} className={ghost}>
            <Download size={16} /> ملفات العميلات
          </button>
        </div>
      </header>

      <section aria-label="مؤشرات التقارير" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={['px-5 py-4', i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '', i > 1 ? 'border-t border-[#E4EAEE] lg:border-t-0' : '', i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : ''].join(' ')}
          >
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

      <section className={`${card} p-4`}>
        <h2 className="text-[15px] font-bold">كيف تغيّرت الحجوزات</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">نفس عدد الأيام من بداية الشهر حتى اليوم، مقابل الشهر السابق.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#E4EAEE]">
          <table className="min-w-[520px] w-full text-[13px]">
            <thead className="bg-[#F8FBFC] text-[11px] font-bold text-[#64748B]">
              <tr>
                <th className="p-3 text-right">البند</th>
                <th className="p-3 text-right">هذه الفترة</th>
                <th className="p-3 text-right">الفترة السابقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAEE]">
              {[
                ['الحجوزات', health.curr.total, health.prev.total],
                ['حضور', health.curr.attended, health.prev.attended],
                ['غياب', health.curr.noshow, health.prev.noshow],
                ['إلغاء', health.curr.cancelled, health.prev.cancelled],
                ['معلّق', health.curr.pending, health.prev.pending],
                ['مؤكد', health.curr.confirmed, health.prev.confirmed],
              ].map(([label, now, prev]) => (
                <tr key={label}>
                  <td className="p-3 font-bold">{label}</td>
                  <td className="p-3 tabular-nums">{now}</td>
                  <td className="p-3 tabular-nums text-[#64748B]">{prev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={chipMint}>حضر {rates.attended}</span>
          <span className={chipRose}>غاب {rates.noshow}</span>
          <span className={chipGold}>أُلغي {rates.cancelled}</span>
          <span className={chipSky}>معلّق {rates.pending}</span>
          <span className={chipMuted}>مؤكد {rates.confirmed}</span>
        </div>
      </section>

      <section className={`${card} p-4`}>
        <h2 className="text-[15px] font-bold">الحجوزات مع الحملات</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">
          مربوط بحملة {camp.linked} · بلا حملة {camp.plain}. قبل/بعد = خلال 30 يوماً من الإطلاق.
        </p>
        {camp.rows.length === 0 && <p className="mt-4 text-[13px] text-[#94A3B8]">لا حملات مسجّلة.</p>}
        <div className="mt-3 space-y-2">
          {camp.rows.map((r) => (
            <article key={r.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-4 py-3 ps-5 text-[13px]">
              <span className="absolute inset-y-0 start-0 w-[3px] bg-[#059669]" />
              <p className="font-bold">
                {r.name}{' '}
                <span className={r.status === 'active' ? chipMint : chipMuted}>{STATUS[r.status] || r.status}</span>
              </p>
              <p className="mt-1 text-[12px] text-[#64748B]">
                مستهدفات {r.targets} · حجوزات الحملة {r.bookings} · حضور {r.attended} · رسائل {r.sent} · فشل {r.failed} · رد {r.replied}
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">
                {r.before30 == null
                  ? 'الحملة لم تُطلق بعد، فما في مقارنة قبل وبعد.'
                  : `قبل الإطلاق ${r.before30} حجز · بعده ${r.after30} حجز`}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} p-4`}>
        <h2 className="text-[15px] font-bold">التسويق</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="حملات" value={`${marketing.campaigns} · نشطة ${marketing.active}`} />
          <Fact label="رسائل" value={`${marketing.sent} وصلت · ${marketing.failed} فشلت · ${marketing.read} قُرئت`} />
          <Fact label="عروض" value={`${marketing.approvedOffers} معتمد من ${marketing.offers}`} />
          <Fact label="عروض جماعية" value={`${marketing.openGroups} مفتوحة من ${marketing.groupOffers}`} />
          <Fact label="المدونة" value={`${marketing.blog} مقال`} />
          <Fact label="طلبات المنتجات" value={`${marketing.orders}`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <NameList title="عميلات رجعن" hint="زرن أكثر من مرة، وآخر زيارة ضمن مدة العيادة أو موعد قادم." rows={returns.cameBack} empty="ما في عميلات رجعن ضمن المدة." />
        <NameList title="عميلات ما رجعن" hint="تجاوزن مدة الانقطاع وما عندهن موعد قادم." rows={returns.stayedAway} away empty="ما في منقطعات حسب مدة العيادة." />
      </section>

      <section className={`${card} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold">ملفات العميلات وجلسات الختم</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">ملف PDF لكل عميلة مع الجلسات الموقّعة.</p>
          </div>
          <button type="button" onClick={() => download('files')} className={primary}>
            <Download size={16} /> تنزيل الكل
          </button>
        </div>
        {files.length === 0 && <p className="mt-6 text-center text-[13px] text-[#94A3B8]">لا ملفات بعد.</p>}
        <div className="mt-4 space-y-2">
          {files.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-lg border border-[#E4EAEE] bg-white">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpenClient(openClient === c.id ? null : c.id)} className="min-w-0 flex-1 py-1 text-right">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="text-[11px] text-[#64748B]" dir="ltr">{c.phone || '—'} · {c.stamps.length} ختم</span>
                </button>
                <button type="button" onClick={() => downloadClient(c)} className={`${ghost} shrink-0`}>
                  <Download size={14} /> PDF
                </button>
              </div>
              {openClient === c.id && (
                <div className="space-y-3 border-t border-[#EDF1F4] px-4 pb-4 pt-3 text-[13px]">
                  {c.doNotContact && <p className={`inline-flex ${chipRose}`}>طلبت عدم التواصل</p>}
                  {c.medical.length === 0 && <p className="text-[12px] text-[#94A3B8]">لا معلومات طبية مسجّلة</p>}
                  {c.medical.map(([k, v]) => <p key={k}><span className="font-bold">{k}: </span>{v}</p>)}
                  {c.stamps.length === 0 && <p className="text-[12px] text-[#94A3B8]">لا جلسات مختومة</p>}
                  {c.stamps.map((s) => (
                    <div key={s.id} className="rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] p-3">
                      <p className="font-bold">{s.services.map((svc) => (svc.zones ? `${svc.title} (${svc.zones})` : svc.title)).join('، ')}</p>
                      <p className="mt-1 text-[11px] text-[#64748B]">
                        {s.recordedAt ? new Date(s.recordedAt).toLocaleString('ar') : '—'} · {s.recordedBy || '—'}
                      </p>
                      {s.note && <p className="mt-2 text-[12px]">{s.note}</p>}
                      {String(s.signature || '').startsWith('data:image') && (
                        <img src={s.signature} alt="توقيع الجلسة" className="mt-2 h-12 rounded-lg border border-[#E4EAEE] bg-white" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

function Fact({ label, value }) {
  return (
    <div className="rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-4 py-3">
      <p className="text-[11px] font-bold text-[#64748B]">{label}</p>
      <p className="mt-1 text-[13px] font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}

function NameList({ title, hint, rows, empty, away }) {
  return (
    <div className={`${card} p-4`}>
      <h2 className="text-[15px] font-bold">{title}</h2>
      <p className="mt-1 text-[12px] text-[#64748B]">{hint}</p>
      {rows.length === 0 && <p className="mt-4 text-[13px] text-[#94A3B8]">{empty}</p>}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {rows.map((j) => (
          <li key={j.phoneKey} className="flex justify-between gap-2 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px]">
            <span className="font-bold">{j.displayName}</span>
            <span className={`text-[11px] font-bold tabular-nums ${away ? 'text-[#B91C1C]' : 'text-[#047857]'}`}>
              {away ? `${j.daysSince} يوم` : `${j.visitCount} زيارات`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Reports;