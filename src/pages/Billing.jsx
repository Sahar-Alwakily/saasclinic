import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { mergeAptSettings } from '../utils/appointmentOps';
import { clinicHealth } from '../utils/clinicInsights';

const Billing = () => {
  const { clinicPath } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settingsRaw, setSettingsRaw] = useState(null);

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#f0b429] font-semibold">money</p>
        <h1 className="font-product text-3xl">المدفوعات والاشتراكات</h1>
        <p className="text-sm text-stone-500 mt-1">فواتير الطلبات، سياسة العربون، واشتراك المنصة.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">إيراد المواعيد هذا الشهر</p>
          <p className="font-product text-3xl">{health.curr.revenue.toLocaleString('ar')}</p>
        </div>
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">طلبات المنتجات</p>
          <p className="font-product text-3xl">{orders.length}</p>
          <Link to="/orders" className="text-xs text-[#4d7cff] font-bold">سجل الطلبات</Link>
        </div>
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">عربون مسجّل على موعد</p>
          <p className="font-product text-3xl">{deposits.length}</p>
        </div>
      </div>
      <div className="saas-card p-5 space-y-2">
        <h2 className="font-product text-xl">سياسة العربون</h2>
        <p className="text-sm">{settings.depositPolicyEnabled ? 'مفعّلة' : 'غير مفعّلة'} — {settings.depositNote}</p>
        <Link to="/ops" className="text-xs font-bold text-[#4d7cff]">تعديل القواعد</Link>
      </div>
      <div className="saas-card p-5">
        <h2 className="font-product text-xl">اشتراك نورا</h2>
        <p className="text-sm text-stone-500 mt-1">بوابة الدفع غير مربوطة بعد. الحساب يعمل بدون قطع اشتراك حتى تجهيز الفوترة.</p>
      </div>
    </div>
  );
};

export default Billing;
