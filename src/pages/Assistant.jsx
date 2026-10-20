import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { mergeAptSettings } from '../utils/appointmentOps';
import { mergeSettings } from '../utils/winback';

const Assistant = () => {
  const { clinicInfo, clinicPath } = useClinic();
  const [inbox, setInbox] = useState([]);
  const [aptSet, setAptSet] = useState(null);
  const [wbSet, setWbSet] = useState(null);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('winbackInbox')), (s) => {
        setInbox(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
      }),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setAptSet(s.val())),
      onValue(ref(database, clinicPath('winbackSettings')), (s) => setWbSet(s.val())),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const apt = useMemo(() => mergeAptSettings(aptSet), [aptSet]);
  const wb = useMemo(() => mergeSettings(wbSet), [wbSet]);
  const wa = clinicInfo?.whatsapp || clinicInfo?.phone || '';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#22c9a0] font-semibold">inbox</p>
        <h1 className="font-product text-3xl">المساعد الذكي</h1>
        <p className="text-sm text-stone-500 mt-1">واتساب العيادة، نوافذ الرد الهادئ، ومحادثات الاسترجاع المسجّلة.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">واتساب</p>
          <p className="font-product text-2xl mt-1" dir="ltr">{wa || 'غير مربوط'}</p>
          <Link to="/settings?tab=store" className="text-xs text-[#4d7cff] font-bold">تعديل الرقم من الإعدادات</Link>
        </div>
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">ساعات الهدوء</p>
          <p className="font-product text-2xl mt-1">{apt.quietStart}:00 – {apt.quietEnd}:00</p>
          <Link to="/ops" className="text-xs text-[#4d7cff] font-bold">قواعد المواعيد</Link>
        </div>
        <div className="saas-card p-5">
          <p className="text-[11px] text-stone-400">حد التواصل / شهر</p>
          <p className="font-product text-2xl mt-1">{wb.contactCapPerMonth ?? '—'}</p>
          <Link to="/winback" className="text-xs text-[#4d7cff] font-bold">إعدادات الحملات</Link>
        </div>
      </div>

      <div className="saas-card p-5">
        <h2 className="font-product text-xl mb-3">المحادثات المسجّلة</h2>
        {inbox.length === 0 && <p className="text-sm text-stone-500">لا وارد بعد — يظهر هنا ما يُسجَّل من استرجاع العميلات.</p>}
        <div className="space-y-2">
          {inbox.slice(0, 20).map((row) => (
            <div key={row.id} className="rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] p-3 text-sm">
              <p className="font-bold">{row.name || row.phone || 'محادثة'}</p>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{row.body || row.message || row.preview || 'بدون نص'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Assistant;
