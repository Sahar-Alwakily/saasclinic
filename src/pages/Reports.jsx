import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { statusRates, winbackReturnRate } from '../utils/appointmentOps';
import { clinicHealth } from '../utils/clinicInsights';

const Reports = () => {
  const { clinicPath, hasCap } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('appointments')), (s) => setAppointments(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('customers')), (s) => setCustomers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const health = useMemo(() => clinicHealth({ appointments, customers }), [appointments, customers]);
  const rates = statusRates(appointments);
  const wb = winbackReturnRate(appointments);

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">التقارير والتحليلات</h1>
        <p className="text-sm text-[#8a9199] mt-1">مقارنة أول الشهر حتى اليوم مع نفس الأيام من الشهر الماضي. المبالغ فقط في طلبات المنتجات.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">حجوزات الفترة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{health.curr.total}</p>
          <p className="text-xs text-[#8a9199] mt-2">السابق {health.prev.total}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">حضور</p>
          <p className="stat-num text-[28px] leading-none mt-2">{health.curr.attendRate == null ? '—' : `${health.curr.attendRate}%`}</p>
          <p className="text-xs text-[#8a9199] mt-2">حضر ÷ حضر+غاب</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">العميلات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{customers.length}</p>
        </div>
        {hasCap('winback') && (
          <div className="saas-card stat-card-lilac p-4">
            <p className="text-xs text-[#6d28d9]">تحويل استرجاع</p>
            <p className="stat-num text-[28px] leading-none mt-2">{wb.tagged ? `${wb.rate}%` : '—'}</p>
            <p className="text-xs text-[#8a9199] mt-2">{wb.returned} من {wb.tagged} بوسم حملة</p>
          </div>
        )}
      </div>

      <section className="saas-card p-5">
        <h2 className="font-bold text-[#111827] mb-3">كل السجل</h2>
        <div className="flex flex-wrap gap-2">
          <span className="nura-chip nura-chip-mint">حضر {rates.attended}</span>
          <span className="nura-chip nura-chip-rose">غاب {rates.noshow}</span>
          <span className="nura-chip nura-chip-gold">أُلغي {rates.cancelled}</span>
          <span className="nura-chip nura-chip-sky">معلّق {rates.pending}</span>
          <span className="nura-chip nura-chip-lilac">مؤكد {rates.confirmed}</span>
        </div>
      </section>
    </div>
  );
};

export default Reports;
