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
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;
  }

  const { health, today, campaigns: camp, marketing, returns, files } = report;
  const w = health.windows;

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] dark:text-white">التقارير والتحليلات</h1>
          <p className="text-sm text-[#8a9199] mt-1">من {w.thisStart} إلى {w.thisEnd} مقابل {w.prevStart} إلى {w.prevEnd}. التنزيل يفتح الطباعة، واختاري حفظ كـ PDF.</p>
        </div>
        <button type="button" onClick={() => download('numbers')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#10b981] text-white text-sm font-bold">
          <Download size={16} /> تنزيل تقرير الأرقام PDF
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card tone="mint" label="حجوزات الفترة" value={health.curr.total} hint={deltaText(health.deltas.book)} />
        <Card tone="sky" label="حضور" value={health.curr.attendRate == null ? '—' : `${health.curr.attendRate}%`} hint={`السابق ${health.prev.attendRate == null ? '—' : `${health.prev.attendRate}%`}`} />
        <Card tone="gold" label="مواعيد اليوم" value={today.total} hint={`${today.pending} معلّق · ${today.cancelled} ملغى`} />
        <Card tone="lilac" label="العميلات" value={customers.length} hint={`رجعن ${returns.cameBack.length} · ما رجعن ${returns.stayedAway.length}`} />
      </div>

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] dark:text-white mb-1">كيف تغيّرت الحجوزات</h2>
        <p className="text-sm text-[#8a9199] mb-3">نفس عدد الأيام من بداية الشهر حتى اليوم، مقابل الشهر السابق.</p>
        <div className="overflow-x-auto">
          <table className="min-w-[520px]">
            <thead>
              <tr>
                <th>البند</th>
                <th>هذه الفترة</th>
                <th>الفترة السابقة</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['الحجوزات', health.curr.total, health.prev.total],
                ['حضور', health.curr.attended, health.prev.attended],
                ['غياب', health.curr.noshow, health.prev.noshow],
                ['إلغاء', health.curr.cancelled, health.prev.cancelled],
                ['معلّق', health.curr.pending, health.prev.pending],
                ['مؤكد', health.curr.confirmed, health.prev.confirmed],
              ].map(([label, now, prev]) => (
                <tr key={label}>
                  <td className="font-bold">{label}</td>
                  <td>{now}</td>
                  <td>{prev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="nura-chip nura-chip-mint">حضر {rates.attended}</span>
          <span className="nura-chip nura-chip-rose">غاب {rates.noshow}</span>
          <span className="nura-chip nura-chip-gold">أُلغي {rates.cancelled}</span>
          <span className="nura-chip nura-chip-sky">معلّق {rates.pending}</span>
          <span className="nura-chip nura-chip-lilac">مؤكد {rates.confirmed}</span>
        </div>
      </section>

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] dark:text-white mb-1">الحجوزات مع الحملات</h2>
        <p className="text-sm text-[#8a9199] mb-3">مربوط بحملة {camp.linked} · بلا حملة {camp.plain}. قبل/بعد = حجوزات أُنشئت خلال 30 يوماً من الإطلاق.</p>
        {camp.rows.length === 0 && <p className="text-sm text-[#8a9199]">لا حملات مسجّلة.</p>}
        <div className="space-y-2">
          {camp.rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#e4eee8] bg-[#f8faf9] px-4 py-3 text-sm">
              <p className="font-bold text-[#111827] dark:text-white">{r.name} <span className="text-xs font-normal text-[#8a9199]">{STATUS[r.status] || r.status}</span></p>
              <p className="text-xs text-[#6b7280] mt-1">مستهدفات {r.targets} · حجوزات الحملة {r.bookings} · حضور {r.attended} · رسائل وصلت {r.sent} · فشل {r.failed} · رد {r.replied}</p>
              <p className="text-xs mt-1">{r.before30 == null ? 'الحملة لم تُطلق بعد، فما في مقارنة قبل وبعد.' : `قبل الإطلاق ${r.before30} حجز · بعده ${r.after30} حجز`}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] dark:text-white mb-3">التسويق</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          <Fact label="حملات" value={`${marketing.campaigns} · نشطة ${marketing.active}`} />
          <Fact label="رسائل" value={`${marketing.sent} وصلت · ${marketing.failed} فشلت · ${marketing.read} قُرئت`} />
          <Fact label="عروض" value={`${marketing.approvedOffers} معتمد من ${marketing.offers}`} />
          <Fact label="عروض جماعية" value={`${marketing.openGroups} مفتوحة من ${marketing.groupOffers}`} />
          <Fact label="المدونة" value={`${marketing.blog} مقال`} />
          <Fact label="طلبات المنتجات" value={`${marketing.orders}`} />
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <NameList title="عميلات رجعن" hint="زرن أكثر من مرة، وآخر زيارة لسا ضمن مدة العيادة أو عندهن موعد قادم." rows={returns.cameBack} empty="ما في عميلات رجعن ضمن المدة." />
        <NameList title="عميلات ما رجعن" hint="تجاوزن مدة الانقطاع وما عندهن موعد قادم." rows={returns.stayedAway} away empty="ما في منقطعات حسب مدة العيادة." />
      </section>

      <section className="saas-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-[#111827] dark:text-white">ملفات العميلات وجلسات الختم</h2>
            <p className="text-sm text-[#8a9199] mt-1">كل عميلة إلها ملف PDF فيه معلوماتها وكل جلسة مع ختم التوقيع.</p>
          </div>
          <button type="button" onClick={() => download('files')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#111827] text-white text-sm font-bold">
            <Download size={16} /> تنزيل الملفات PDF
          </button>
        </div>
        {files.length === 0 && <p className="text-sm text-[#8a9199]">لا ملفات بعد.</p>}
        <div className="space-y-2">
          {files.map((c) => (
            <article key={c.id} className="rounded-2xl border border-[#e4eee8] bg-[#f8faf9]">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpenClient(openClient === c.id ? null : c.id)} className="flex-1 min-w-0 text-right py-1">
                  <span className="font-bold text-[#111827] dark:text-white block truncate">{c.name}</span>
                  <span className="text-xs text-[#8a9199]" dir="ltr">{c.phone || '—'} · {c.stamps.length} ختم</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadClient(c)}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#10b981] text-white text-xs font-bold"
                >
                  <Download size={14} /> PDF
                </button>
              </div>
              {openClient === c.id && (
                <div className="px-4 pb-4 space-y-3 text-sm">
                  {c.doNotContact && <p className="text-rose-600 text-xs font-bold">طلبت عدم التواصل</p>}
                  {c.medical.length === 0 && <p className="text-xs text-[#8a9199]">لا معلومات طبية مسجّلة</p>}
                  {c.medical.map(([k, v]) => <p key={k}><span className="font-bold">{k}: </span>{v}</p>)}
                  {c.stamps.length === 0 && <p className="text-xs text-[#8a9199]">لا جلسات مختومة</p>}
                  {c.stamps.map((s) => (
                    <div key={s.id} className="rounded-xl bg-white border border-[#e4eee8] p-3">
                      <p className="font-bold">{s.services.map((svc) => svc.zones ? `${svc.title} (${svc.zones})` : svc.title).join('، ')}</p>
                      <p className="text-xs text-[#8a9199] mt-1">{s.recordedAt ? new Date(s.recordedAt).toLocaleString('ar') : '—'} · {s.recordedBy || '—'}</p>
                      {s.note && <p className="text-xs mt-2">{s.note}</p>}
                      {String(s.signature || '').startsWith('data:image') && <img src={s.signature} alt="توقيع الجلسة" className="mt-2 h-12 bg-white rounded-lg border border-[#e4eee8]" />}
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

function Card({ tone, label, value, hint }) {
  const card = { mint: 'stat-card-mint', sky: 'stat-card-sky', gold: 'stat-card-gold', lilac: 'stat-card-lilac' }[tone];
  return (
    <div className={`saas-card ${card} p-4`}>
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className="stat-num text-[28px] leading-none mt-2">{value}</p>
      <p className="text-xs text-[#8a9199] mt-2">{hint}</p>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#f8faf9] border border-[#e4eee8] px-4 py-3">
      <p className="text-xs text-[#8a9199]">{label}</p>
      <p className="font-bold text-[#111827] dark:text-white mt-1">{value}</p>
    </div>
  );
}

function NameList({ title, hint, rows, empty, away }) {
  return (
    <div className="saas-card p-5">
      <h2 className="font-bold text-[#111827] dark:text-white">{title}</h2>
      <p className="text-sm text-[#8a9199] mt-1 mb-3">{hint}</p>
      {rows.length === 0 && <p className="text-sm text-[#8a9199]">{empty}</p>}
      <ul className="space-y-2 max-h-80 overflow-y-auto">
        {rows.map((j) => (
          <li key={j.phoneKey} className="flex justify-between gap-2 text-sm rounded-xl bg-[#f8faf9] border border-[#e4eee8] px-3 py-2">
            <span className="font-bold">{j.displayName}</span>
            <span className={`text-xs ${away ? 'text-rose-600' : 'text-emerald-700'}`}>{away ? `${j.daysSince} يوم` : `${j.visitCount} زيارات`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Reports;
