import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { recoveredRevenue, statusRates, mergeAptSettings, winbackReturnRate } from '../utils/appointmentOps';
import { clinicHealth } from '../utils/clinicInsights';

const Reports = () => {
  const { clinicPath } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settingsRaw, setSettingsRaw] = useState(null);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('appointments')), (s) => setAppointments(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('customers')), (s) => setCustomers(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setSettingsRaw(s.val())),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const settings = useMemo(() => mergeAptSettings(settingsRaw), [settingsRaw]);
  const health = useMemo(() => clinicHealth({ appointments, customers }), [appointments, customers]);
  const rates = statusRates(appointments);
  const rec = recoveredRevenue(appointments, settings);
  const wb = winbackReturnRate(appointments);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#4d7cff] font-semibold">analytics</p>
        <h1 className="font-product text-3xl">التقارير والتحليلات</h1>
        <p className="text-sm text-stone-500 mt-1">مقارنة أول الشهر حتى اليوم مع نفس الأيام من الشهر الماضي.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">حجوزات الفترة</p>
          <p className="font-product text-3xl">{health.curr.total}</p>
          <p className="text-xs text-stone-500">السابق {health.prev.total}</p>
        </div>
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">إيراد الفترة</p>
          <p className="font-product text-3xl">{health.curr.revenue.toLocaleString('ar')}</p>
          <p className="text-xs text-stone-500">السابق {health.prev.revenue.toLocaleString('ar')}</p>
        </div>
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">حضور (حضر÷حضر+غاب)</p>
          <p className="font-product text-3xl">{health.curr.attendRate == null ? '—' : `${health.curr.attendRate}%`}</p>
        </div>
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">تحويل استرجاع</p>
          <p className="font-product text-3xl">{wb.tagged ? `${wb.rate}%` : '—'}</p>
          <p className="text-xs text-stone-500">{wb.returned} من {wb.tagged} بوسم حملة</p>
        </div>
      </div>
      <div className="saas-card p-5">
        <h2 className="font-product text-xl mb-2">كل السجل</h2>
        <p className="text-sm text-stone-500">حضر {rates.attended} · غاب {rates.noshow} · أُلغي {rates.cancelled} · معلّق {rates.pending} · مؤكد {rates.confirmed}</p>
        <p className="text-sm mt-2">إيراد مستعاد من الشواغر: {rec.actual.toLocaleString('ar')} (صافي {rec.net.toLocaleString('ar')} بعد تكلفة الرسائل المسجّلة)</p>
      </div>
    </div>
  );
};

export default Reports;
