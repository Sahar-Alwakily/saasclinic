import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import OverviewCards from '../components/marketing/OverviewCards';
import GroupOffersSection from '../components/marketing/GroupOffersSection';
import BloggerTracking from '../components/marketing/BloggerTracking';
import SmartTargeting from '../components/marketing/SmartTargeting';
import AbTesting from '../components/marketing/AbTesting';

const DEFAULT_A = 'مرحبا، عندك خصم على جلستك الجاية. احجزي من الرابط لما يناسبك.';
const DEFAULT_B = 'اشتقنالك. رجعي هالأسبوع، وفي خصم جاهز إلك على الموعد.';

const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]';
const chipRose = 'rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-bold text-[#B91C1C]';
const chipSky = 'rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-1 text-[11px] font-bold text-[#0369A1]';

const Marketing = () => {
  const { clinicPath, clinicId } = useClinic();
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [offers, setOffers] = useState([]);
  const [blog, setBlog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [groupOffers, setGroupOffers] = useState([]);
  const [draft, setDraft] = useState({ title: '', discountType: 'percent', value: 15, goal: 10 });
  const [saving, setSaving] = useState(false);
  const [smartTargeting, setSmartTargeting] = useState(false);
  const [templateA, setTemplateA] = useState(DEFAULT_A);
  const [templateB, setTemplateB] = useState(DEFAULT_B);
  const [savingCompare, setSavingCompare] = useState(false);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('winbackCampaigns')), (s) => setCampaigns(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('winbackOffers')), (s) => setOffers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('blog')), (s) => setBlog(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('groupOffers')), (s) => setGroupOffers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('marketingSettings')), (s) => {
        const val = s.val() || {};
        setSmartTargeting(!!val.smartTargeting);
        setTemplateA(val.templateA || DEFAULT_A);
        setTemplateB(val.templateB || DEFAULT_B);
      }),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const failedTotal = useMemo(() => messages.filter((x) => x.status === 'failed').length, [messages]);

  const kpis = [
    { label: 'الحملات', value: String(campaigns.length), note: 'من استرجاع العميلات', accent: '#059669' },
    { label: 'مقالات المدونة', value: String(blog.length), note: 'في موقع العيادة', accent: '#0FA3A3' },
    { label: 'طلبات المنتجات', value: String(orders.length), note: 'مبيعات من الكتالوج', accent: '#B45309' },
  ];

  const createGroupOffer = async (e) => {
    e.preventDefault();
    const title = draft.title.trim();
    const goal = Math.max(2, Number(draft.goal) || 10);
    if (!title) return toast.error('اسم العرض مطلوب');
    if (!clinicPath) return;
    setSaving(true);
    try {
      const node = push(ref(database, clinicPath('groupOffers')));
      await set(node, {
        title,
        discountType: draft.discountType,
        value: Number(draft.value) || 0,
        goal,
        createdAt: Date.now(),
      });
      setDraft({ title: '', discountType: 'percent', value: 15, goal: 10 });
      toast.success('العرض بانتظار الموافقات');
    } catch {
      toast.error('تعذّر حفظ العرض');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (id) => {
    const url = `${window.location.origin}/group/${clinicId}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('نُسخ رابط الموافقة');
    } catch {
      toast.info(url);
    }
  };

  const setTargeting = async (next) => {
    setSmartTargeting(next);
    if (!clinicPath) return;
    try {
      await update(ref(database, clinicPath('marketingSettings')), { smartTargeting: next });
    } catch {
      setSmartTargeting(!next);
      toast.error('تعذّر حفظ الاستهداف');
    }
  };

  const saveCompare = async () => {
    if (!clinicPath) return;
    setSavingCompare(true);
    try {
      await update(ref(database, clinicPath('marketingSettings')), {
        templateA,
        templateB,
      });
      toast.success('حُفظت نسختا الرسالة');
    } catch {
      toast.error('تعذّر حفظ المقارنة');
    } finally {
      setSavingCompare(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header>
        <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">نظرة الحملات</p>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">التسويق</h1>
        <p className="mt-1 text-[12.5px] text-[#64748B]">الحملات، العروض الجماعية، تتبع الشركاء، واختبار رسائل التواصل.</p>
      </header>

      <section aria-label="مؤشرات التسويق" className="grid grid-cols-3 border-y border-[#E4EAEE]">
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

      <OverviewCards campaigns={campaigns.length} blog={blog.length} orders={orders.length} />

      <GroupOffersSection
        draft={draft}
        setDraft={setDraft}
        onSubmit={createGroupOffer}
        saving={saving}
        groupOffers={groupOffers}
        offers={offers}
        onCopy={copyLink}
        onDelete={(id) => remove(ref(database, clinicPath(`groupOffers/${id}`)))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <BloggerTracking />
        <div className="space-y-4">
          <SmartTargeting enabled={smartTargeting} onChange={setTargeting} />
          <AbTesting
            templateA={templateA}
            templateB={templateB}
            onChangeA={setTemplateA}
            onChangeB={setTemplateB}
            onSave={saveCompare}
            saving={savingCompare}
          />
        </div>
      </div>

      <section className="rounded-lg border border-[#E4EAEE] bg-white p-4">
        <h2 className="text-[15px] font-bold">نتائج الحملات</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">ملخص رسائل كل حملة من سجل الاسترجاع.</p>
        {campaigns.length === 0 && <p className="mt-6 text-center text-[12.5px] text-[#94A3B8]">لا حملات بعد.</p>}
        <ul className="mt-4 divide-y divide-[#E4EAEE]">
          {campaigns.map((c) => {
            const rows = messages.filter((x) => x.campaignId === c.id);
            const failed = rows.filter((x) => x.status === 'failed').length;
            return (
              <li key={c.id} className="py-3">
                <p className="font-bold">{c.name || 'حملة'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={chipSky}>رسائل {rows.length}</span>
                  <span className={chipRose}>فشل {failed}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {campaigns.length > 0 && failedTotal > 0 && (
          <p className="mt-3 text-[11px] text-[#94A3B8]">إجمالي رسائل فاشلة عبر كل الحملات: {failedTotal}</p>
        )}
      </section>
    </div>
  );
};

export default Marketing;