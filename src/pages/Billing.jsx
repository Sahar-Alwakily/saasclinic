import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, update, push, set } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { mergeAptSettings } from '../utils/appointmentOps';
import { paidPlans, PLANS, hasCap } from '../config/plans';

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

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">المدفوعات والاشتراكات</h1>
        <p className="text-sm text-[#8a9199] mt-1">الباقة الحالية تقفل وتفتح أقسام الكونسول. بوابة الدفع غير مربوطة بعد.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">الباقة</p>
          <p className="stat-num text-[22px] leading-none mt-2">{plan?.name || '—'}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">مبيعات المنتجات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{productSales.toLocaleString('ar')} ₪</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">طلبات المنتجات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{orders.length}</p>
          {hasCap(clinicInfo, 'marketing')
            ? <Link to="/products?tab=orders" className="text-xs font-bold text-emerald-700 mt-2 inline-block">سجل الطلبات</Link>
            : <p className="text-xs text-[#8a9199] mt-2">من باقة عيادة</p>}
        </div>
        <div className="saas-card stat-card-lilac p-4">
          <p className="text-xs text-[#6d28d9]">العربون</p>
          <p className="stat-num text-[18px] leading-none mt-2">{settings.depositPolicyEnabled ? 'مفعّل' : 'غير مفعّل'}</p>
        </div>
      </div>

      <section className="saas-card p-5 space-y-2">
        <h2 className="font-bold text-[#111827]">سياسة العربون</h2>
        <p className="text-sm text-[#6b7280]">{settings.depositPolicyEnabled ? 'مفعّلة' : 'غير مفعّلة'} — {settings.depositNote}</p>
        {hasCap(clinicInfo, 'ops')
          ? <Link to="/appointments/reminders" className="text-xs font-bold text-emerald-700">تعديل القواعد</Link>
          : <p className="text-xs text-[#8a9199]">قواعد العربون من باقة عيادة</p>}
      </section>

      <section className="saas-card p-5 space-y-4">
        <div>
          <h2 className="font-bold text-[#111827]">اشتراك وَرَفَ | WARAFA</h2>
          <p className="text-sm text-[#8a9199] mt-1">الآن: <b className="text-[#111827]">{plan?.name}</b>. التجربة {PLANS.trial.durationDays} يوماً. الترقية تُرسل كطلب ولا تُعلَّم مدفوعة تلقائياً.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {paidPlans().map((p) => {
            const active = plan?.id === p.id;
            const pending = clinicInfo?.pendingPlanRequest === p.id;
            return (
              <article key={p.id} className={`saas-card p-4 ${active ? 'stat-card-mint' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[#111827]">{p.name}</p>
                  {active && <span className="nura-chip nura-chip-mint">الحالية</span>}
                  {pending && !active && <span className="nura-chip nura-chip-gold">طلب مُرسَل</span>}
                </div>
                <p className="text-lg font-bold text-emerald-700 mt-2">{p.price.toLocaleString('ar')} {p.currency}/شهر</p>
                <ul className="text-xs text-[#8a9199] mt-3 space-y-1">
                  {p.features.slice(0, 4).map((f) => <li key={f}>• {f}</li>)}
                </ul>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={saving || active}
                    onClick={() => requestUpgrade(p.id)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold bg-[#10b981] text-white disabled:opacity-40"
                  >
                    {active ? 'الباقة الحالية' : pending ? 'طلب مُرسَل' : 'طلب ترقية'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <Link to="/#pricing" className="text-xs font-bold text-emerald-700">تفاصيل الباقات على صفحة وَرَفَ | WARAFA</Link>
      </section>
    </div>
  );
};

export default Billing;
