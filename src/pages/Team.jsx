import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { parseHolidayDates } from '../utils/scheduleSlots';
import TeamNav from '../components/team/TeamNav';
import TeamStatStrip from '../components/team/TeamStatStrip';
import { FaUserTie, FaMapMarkerAlt, FaClock, FaChevronLeft } from 'react-icons/fa';

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

  const scheduleCount = Object.keys(schedules).filter((key) => key !== '_clinicHolidays').length;
  const holidays = parseHolidayDates(schedules._clinicHolidays?.holidays).length;

  const cards = [
    {
      to: '/staff',
      label: 'الموظفات',
      value: staff.length,
      hint: 'الحساب والقسم والفرع لكل موظفة.',
      cta: 'إدارة الفريق',
      accent: '#059669',
      icon: FaUserTie,
    },
    {
      to: '/appointments/schedule',
      label: 'الدوام والعطل',
      value: scheduleCount,
      hint: 'أيام وساعات العمل الأسبوعية حسب الفرع.',
      cta: 'تعديل الدوام',
      accent: '#0FA3A3',
      icon: FaClock,
    },
    {
      to: '/branches',
      label: 'الفروع',
      value: branches.length,
      hint: 'العناوين والأرقام المرتبطة بالحجوزات.',
      cta: 'إدارة الفروع',
      accent: '#0E7490',
      icon: FaMapMarkerAlt,
    },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">إعدادات العيادة</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">الفريق والفروع</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">الموظفات، جداول الدوام، والعطل — كل ما يرتبط بحجوزات العيادة.</p>
        </div>
        <TeamNav />
      </header>

      <TeamStatStrip
        items={[
          { label: 'الموظفات', value: staff.length, note: 'حسابات فريق نشطة', accent: '#059669' },
          { label: 'جداول دوام', value: scheduleCount, note: 'جدول أسبوعي محفوظ', accent: '#0FA3A3' },
          { label: 'الفروع', value: branches.length, note: 'فروع مرتبطة بالحجوزات', accent: '#0E7490' },
          { label: 'عطل العيادة', value: holidays, note: 'أيام إغلاق شاملة', accent: '#B45309' },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="group relative overflow-hidden rounded-xl border border-[#E4EAEE] bg-white p-4 transition-colors hover:border-[#C6EEEE]"
            >
              <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: card.accent }} />
              <div className="flex items-start justify-between gap-3 ps-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F4F7F8]" style={{ color: card.accent }}>
                      <Icon className="text-[11px]" />
                    </span>
                    <p className="text-[12.5px] font-bold text-[#334155]">{card.label}</p>
                  </div>
                  <p className="mt-2.5 text-[32px] font-light leading-none tabular-nums tracking-tight" style={{ color: card.accent }}>
                    {card.value}
                  </p>
                  <p className="mt-2 text-[10.5px] text-[#94A3B8]">{card.hint}</p>
                </div>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#E4EAEE] text-[#94A3B8] transition-colors group-hover:border-[#0FA3A3] group-hover:text-[#0E7490]">
                  <FaChevronLeft className="text-[9px]" />
                </span>
              </div>
              <p className="mt-3 border-t border-[#EDF1F4] ps-1.5 pt-2 text-[10.5px] font-bold text-[#0E7490]">{card.cta}</p>
            </Link>
          );
        })}
      </div>

      <section className="rounded-xl border border-[#E4EAEE] bg-white px-5 py-4">
        <h2 className="text-[13px] font-extrabold">كيف يرتبط الدوام بالحجوزات؟</h2>
        <div className="mt-2 grid gap-2.5 text-[11.5px] text-[#64748B] md:grid-cols-3">
          <p><span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#059669]" /> أيام الدوام وساعاته تحدّد المواعيد القابلة للحجز لكل موظفة.</p>
          <p><span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#0FA3A3]" /> عطلة الموظفة تغلق حجزها في ذلك اليوم فقط.</p>
          <p><span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#B45309]" /> عطلة العيادة تغلق الحجز لكل الفريق في نفس اليوم.</p>
        </div>
      </section>
    </div>
  );
};

export default Team;
