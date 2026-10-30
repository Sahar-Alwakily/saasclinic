import React from 'react';
import { Link } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { CAP_LABELS, minPlanForCap } from '../../config/plans';

export function UpgradePanel({ cap }) {
  const need = minPlanForCap(cap);
  const label = CAP_LABELS[cap] || 'هذه الميزة';
  return (
    <div className="saas-card p-8 max-w-lg mx-auto text-center space-y-3" dir="rtl">
      <p className="text-[11px] tracking-[0.22em] uppercase text-[#172B3A] font-semibold">باقة أعلى</p>
      <h2 className="font-product text-2xl">{label}</h2>
      <p className="text-sm text-stone-500">
        متاحة من باقة <b>{need.name}</b>
        {need.price ? ` (${need.price.toLocaleString('ar')} ${need.currency}/شهر)` : ''}.
      </p>
      <Link to="/billing" className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#172B3A] text-white font-bold">اختيار الباقة</Link>
    </div>
  );
}

export default function PlanGate({ cap, children }) {
  const { hasCap } = useClinic();
  if (!cap || (typeof hasCap === 'function' && hasCap(cap))) return children;
  return <UpgradePanel cap={cap} />;
}
