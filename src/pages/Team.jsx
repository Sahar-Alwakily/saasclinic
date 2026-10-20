import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';

const Team = () => {
  const { clinicPath } = useClinic();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [schedules, setSchedules] = useState({});

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u = [
      onValue(ref(database, clinicPath('users')), (s) => {
        const list = s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [];
        setStaff(list.filter((x) => x.role !== 'admin'));
      }),
      onValue(ref(database, clinicPath('branches')), (s) => setBranches(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [])),
      onValue(ref(database, clinicPath('scheduleSettings')), (s) => setSchedules(s.val() || {})),
    ];
    return () => u.forEach((fn) => fn());
  }, [clinicPath]);

  const schedKeys = Object.keys(schedules);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#a78bfa] font-semibold">org</p>
        <h1 className="font-product text-3xl">الفريق والفروع</h1>
        <p className="text-sm text-stone-500 mt-1">الموظفات، الصلاحيات، وجداول العمل المرتبطة بالفروع.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/staff" className="saas-card p-6 hover:shadow-md">
          <p className="text-[11px] text-stone-400">الموظفات</p>
          <p className="font-product text-4xl mt-1">{staff.length}</p>
          <p className="text-xs text-stone-500 mt-2">الصلاحيات تُضبط عند إضافة الموظفة (قسم / فرع).</p>
        </Link>
        <Link to="/branches" className="saas-card p-6 hover:shadow-md">
          <p className="text-[11px] text-stone-400">الفروع والجداول</p>
          <p className="font-product text-4xl mt-1">{branches.length}</p>
          <p className="text-xs text-stone-500 mt-2">{schedKeys.length} جدول دوام محفوظ</p>
        </Link>
      </div>
    </div>
  );
};

export default Team;
