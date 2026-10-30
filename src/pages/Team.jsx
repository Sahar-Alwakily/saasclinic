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
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827]">الفريق والفروع</h1>
        <p className="text-sm text-[#8a9199] mt-1">الموظفات، الفروع، وجداول العمل المرتبطة بالحجوزات.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Link to="/staff" className="saas-card stat-card-mint p-5">
          <p className="text-xs text-[#047857]">الموظفات</p>
          <p className="stat-num text-[34px] leading-none mt-2">{staff.length}</p>
          <p className="text-xs text-[#6b7280] mt-3">الصلاحيات تُضبط عند الإضافة (قسم / فرع).</p>
        </Link>
        <Link to="/branches" className="saas-card stat-card-sky p-5">
          <p className="text-xs text-[#0369a1]">الفروع</p>
          <p className="stat-num text-[34px] leading-none mt-2">{branches.length}</p>
          <p className="text-xs text-[#6b7280] mt-3">عناوين وأرقام الفروع.</p>
        </Link>
        <Link to="/appointments/schedule" className="saas-card stat-card-gold p-5">
          <p className="text-xs text-[#b45309]">دوام الموظفين</p>
          <p className="stat-num text-[34px] leading-none mt-2">{schedKeys.length}</p>
          <p className="text-xs text-[#6b7280] mt-3">الجداول من المواعيد.</p>
        </Link>
      </div>
    </div>
  );
};

export default Team;
