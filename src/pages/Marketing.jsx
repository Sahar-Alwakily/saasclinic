import React, { useEffect, useState } from 'react';
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
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] dark:text-white">التسويق</h1>
        <p className="text-sm text-[#8a9199] mt-1">الحملات، العروض، وتتبع زيارات الشركاء ومشترياتهم.</p>
      </div>

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

      <BloggerTracking />

      <SmartTargeting enabled={smartTargeting} onChange={setTargeting} />
      <AbTesting
        templateA={templateA}
        templateB={templateB}
        onChangeA={setTemplateA}
        onChangeB={setTemplateB}
        onSave={saveCompare}
        saving={savingCompare}
      />

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] dark:text-white mb-3">نتائج الحملات</h2>
        {campaigns.length === 0 && <p className="text-sm text-[#8a9199]">لا حملات بعد.</p>}
        {campaigns.map((c) => {
          const rows = messages.filter((x) => x.campaignId === c.id);
          const failed = rows.filter((x) => x.status === 'failed').length;
          return (
            <div key={c.id} className="py-3 border-b border-[#e4eee8] last:border-0">
              <p className="font-bold text-[#111827] dark:text-white">{c.name || 'حملة'}</p>
              <div className="flex gap-2 mt-1">
                <span className="nura-chip nura-chip-sky">رسائل {rows.length}</span>
                <span className="nura-chip nura-chip-rose">فشل {failed}</span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default Marketing;
