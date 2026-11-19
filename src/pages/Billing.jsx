import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, update, push, set } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { mergeAptSettings } from '../utils/appointmentOps';
import { paidPlans, PLANS, hasCap } from '../config/plans';

const card = 'rounded-lg border border-[#E4EAEE] bg-white';
const primary = 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#047857] disabled:opacity-40';
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]';
const chipMint = 'rounded-full border border-[#C9EEE0] bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-bold text-[#047857]';
const chipGold = 'rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#B45309]';

const Billing = () => {
  const { clinicPath, clinicId, clinicInfo, plan, isAdmin } = useClinic();
  const [orders, setOrders] = useState([]);
  const [settingsRaw, setSettingsRaw] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setSettingsRaw(s.val())),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const settings = useMemo(() => mergeAptSettings(settingsRaw), [settingsRaw]);
  const productSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const requestUpgrade = async (id) => {
    if (!isAdmin || !clinicId) return;
    const next = PLANS[id];
    if (!next) return;
    if (!window.confirm(`إرسال طلب ترقية إلى «${next.name}»؟ بوابة الدفع غير مربوطة — السوبر أدمن يعيّن الباقة بعد التحقق.`)) return;
    setSaving(true);
    try {
      const payload = {
        clinicId,
        clinicName: clinicInfo?.name || '',
        type: 'subscription_upgrade',
        targetPlan: id,
        description: `طلب ترقية إلى باقة ${next.name}`,
        status: 'new',
        priority: 'normal',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const reqRef = push(ref(database, `clinics/${clinicId}/supportRequests`));
      await set(reqRef, payload);
      await set(ref(database, `platform/requests/${reqRef.key}`), payload);
      await update(ref(database, clinicPath('info')), { pendingPlanRequest: id });
      toast.success('أُرسل طلب الترقية إلى وَرَفَ | WARAFA. الاشتراك لن يُعلَّم مدفوعاً قبل التعيين اليدوي.');
    } catch {
      toast.error('تعذّر إرسال الطلب');
    } finally {
      setSaving(false);
    }
  };

  const kpis = [
    { label: 'الباقة', value: plan?.name || '—', note: plan?.id === 'trial' ? `تجربة ${PLANS.trial.durationDays} يوماً` : 'الاشتراك الحالي', accent: '#059669' },
    { label: 'مبيعات المنتجات', value: `${productSales.toLocaleString('ar')} ₪`, note: 'من طلبات غير ملغاة', accent: '#B45309' },
    { label: 'طلبات المنتجات', value: String(orders.length), note: 'في كتالوج العيادة', accent: '#0FA3A3' },
    { label: 'العربون', value: settings.depositPolicyEnabled ? 'مفعّل' : 'غير مفعّل', note: settings.depositNote || 'سياسة الحجز', accent: '#64748B' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الإعدادات</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">المدفوعات والاشتراكات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">الباقة تقفل وتفتح أقسام الكونسول. بوابة الدفع غير مربوطة بعد.</p>
        </div>
        <Link to="/support" className={ghost}>طلبات المنصة</Link>
      </header>

      <section aria-label="مؤشرات المدفوعات" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={['px-5 py-4', i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '', i > 1 ? 'border-t border-[#E4EAEE] lg:border-t-0' : '', i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : ''].join(' ')}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />
              {k.label}
            </p>
            <p className="mt-2 text-[28px] font-light leading-none tracking-tight sm:text-[32px]">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      <section className={`${card} p-4`}>
        <h2 className="text-[15px] font-bold">سياسة العربون</h2>
        <p className="mt-1 text-[13px] text-[#64748B]">
          {settings.depositPolicyEnabled ? 'مفعّلة' : 'غير مفعّلة'} — {settings.depositNote}
        </p>
        {hasCap(clinicInfo, 'ops') ? (
          <Link to="/appointments/reminders" className="mt-2 inline-block text-[12px] font-bold text-[#0E7490] hover:underline">تعديل القواعد</Link>
        ) : (
          <p className="mt-2 text-[12px] text-[#94A3B8]">قواعد العربون من باقة عيادة</p>
        )}
        {hasCap(clinicInfo, 'marketing') && (
          <Link to="/products?tab=orders" className="mt-2 ms-4 inline-block text-[12px] font-bold text-[#0E7490] hover:underline">سجل طلبات المنتجات</Link>
        )}
      </section>

      <section className={`${card} space-y-4 p-4`}>
        <div>
          <h2 className="text-[15px] font-bold">اشتراك وَرَفَ | WARAFA</h2>
          <p className="mt-1 text-[12.5px] text-[#64748B]">
            الآن: <span className="font-bold text-[#0F172A]">{plan?.name}</span>. الترقية تُرسل كطلب ولا تُعلَّم مدفوعة تلقائياً.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {paidPlans().map((p) => {
            const active = plan?.id === p.id;
            const pending = clinicInfo?.pendingPlanRequest === p.id;
            const accent = active ? '#059669' : '#0FA3A3';
            return (
              <article key={p.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white p-4">
                <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
                <div className="flex items-center justify-between gap-2 ps-1">
                  <p className="font-bold text-[#0F172A]">{p.name}</p>
                  {active && <span className={chipMint}>الحالية</span>}
                  {pending && !active && <span className={chipGold}>طلب مُرسَل</span>}
                </div>
                <p className="mt-2 text-[22px] font-light tabular-nums text-[#047857]">
                  {p.price.toLocaleString('ar')} <span className="text-[13px] font-bold">{p.currency}/شهر</span>
                </p>
                <ul className="mt-3 space-y-1 text-[12px] text-[#64748B]">
                  {p.features.slice(0, 4).map((f) => <li key={f}>• {f}</li>)}
                </ul>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={saving || active}
                    onClick={() => requestUpgrade(p.id)}
                    className={`${primary} mt-4`}
                  >
                    {active ? 'الباقة الحالية' : pending ? 'طلب مُرسَل' : 'طلب ترقية'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <Link to="/#pricing" className="inline-block text-[12px] font-bold text-[#0E7490] hover:underline">
          تفاصيل الباقات على صفحة وَرَفَ | WARAFA
        </Link>
      </section>
    </div>
  );
};

export default Billing;