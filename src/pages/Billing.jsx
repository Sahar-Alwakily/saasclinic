import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { mergeAptSettings } from '../utils/appointmentOps';
import { clinicHealth } from '../utils/clinicInsights';
import { paidPlans, PLANS, hasCap } from '../config/plans';

const Billing = () => {
  const { clinicPath, clinicId, clinicInfo, plan, isAdmin } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settingsRaw, setSettingsRaw] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('appointments')), (s) => setAppointments(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('orders')), (s) => setOrders(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setSettingsRaw(s.val())),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const settings = useMemo(() => mergeAptSettings(settingsRaw), [settingsRaw]);
  const health = useMemo(() => clinicHealth({ appointments, customers: [] }), [appointments]);
  const deposits = appointments.filter((a) => a.depositPaid);

  const activate = async (id) => {
    if (!isAdmin || !clinicId) return;
    const next = PLANS[id];
    if (!next) return;
    if (!window.confirm(`تفعيل باقة «${next.name}» على هذه العيادة؟ الدفع غير مربوط؛ الأقسام ستُفتح أو تُقفل فوراً حسب الباقة.`)) return;
    setSaving(true);
    try {
      await update(ref(database, clinicPath('info')), { plan: id, planActivatedAt: Date.now() });
      await update(ref(database, `meta/clinics/${clinicId}`), { plan: id });
      toast.success(`باقة ${next.name} مفعّلة`);
    } catch {
      toast.error('تعذّر حفظ الباقة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#f0b429] font-semibold">money</p>
        <h1 className="font-product text-3xl">المدفوعات والاشتراكات</h1>
        <p className="text-sm text-stone-500 mt-1">الباقة الحالية تقفل وتفتح أقسام الكونسول. بوابة الدفع غير مربوطة بعد.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">إيراد المواعيد هذا الشهر</p>
          <p className="font-product text-3xl">{health.curr.revenue.toLocaleString('ar')}</p>
        </div>
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">طلبات المنتجات</p>
          <p className="font-product text-3xl">{orders.length}</p>
          {hasCap(clinicInfo, 'marketing')
            ? <Link to="/orders" className="text-xs text-[#4d7cff] font-bold">سجل الطلبات</Link>
            : <p className="text-xs text-stone-400">من باقة عيادة</p>}
        </div>
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">عربون مسجّل على موعد</p>
          <p className="font-product text-3xl">{deposits.length}</p>
        </div>
      </div>
      <div className="saas-card p-5 space-y-2">
        <h2 className="font-product text-xl">سياسة العربون</h2>
        <p className="text-sm">{settings.depositPolicyEnabled ? 'مفعّلة' : 'غير مفعّلة'} — {settings.depositNote}</p>
        {hasCap(clinicInfo, 'ops')
          ? <Link to="/ops" className="text-xs font-bold text-[#4d7cff]">تعديل القواعد</Link>
          : <p className="text-xs text-stone-400">قواعد العربون من باقة عيادة</p>}
      </div>

      <div className="saas-card p-5 space-y-4">
        <div>
          <h2 className="font-product text-xl">اشتراك نورا</h2>
          <p className="text-sm text-stone-500 mt-1">الآن: <b>{plan?.name}</b>. التجربة {PLANS.trial.durationDays} يوماً بكل الأقسام. بعدها تثبتين باقة من هنا.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {paidPlans().map((p) => {
            const active = plan?.id === p.id;
            return (
              <div key={p.id} className={`rounded-2xl p-4 border ${active ? 'border-[#4d7cff] bg-[#4d7cff]/10' : 'border-[#e4ddd0]'}`}>
                <p className="font-product text-lg">{p.name}</p>
                <p className="text-sm text-stone-500">{p.price.toLocaleString('ar')} {p.currency}/شهر</p>
                <ul className="text-xs text-stone-500 mt-2 space-y-1">
                  {p.features.slice(0, 4).map((f) => <li key={f}>• {f}</li>)}
                </ul>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={saving || active}
                    onClick={() => activate(p.id)}
                    className="mt-3 w-full py-2 rounded-xl text-sm font-bold bg-[#14121c] text-white disabled:opacity-40"
                  >
                    {active ? 'مفعّلة' : 'تفعيل'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <Link to="/#pricing" className="text-xs font-bold text-[#4d7cff]">تفاصيل الباقات على صفحة نورا</Link>
      </div>
    </div>
  );
};

export default Billing;
