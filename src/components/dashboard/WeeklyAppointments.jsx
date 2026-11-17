import React, { useMemo } from 'react';
import { FaCalendarAlt, FaChevronLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = {
  laser: { name: 'ليزر', color: 'bg-rose-400' },
  vitamins: { name: 'فيتامينات', color: 'bg-pink-400' },
  cosmetica: { name: 'كوزمتكا', color: 'bg-fuchsia-400' },
  beauty: { name: 'تجميل', color: 'bg-purple-400' },
};

const WeeklyAppointments = ({ appointments = [], services = [] }) => {
  const navigate = useNavigate();

  const serviceToCategory = useMemo(() => {
    const map = {};
    services.forEach((s) => { if (s.title) map[s.title] = s.category || 'general'; });
    return map;
  }, [services]);

  const weeklyData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dayAppointments = appointments.filter((apt) => {
        if (!apt.date) return false;
        if (apt.status === 'cancelled') return false;
        if (!['pending', 'confirmed'].includes(apt.status)) return false;
        const aptDate = new Date(`${apt.date}T00:00:00`);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === date.getTime();
      });

      const categoryCounts = { laser: 0, vitamins: 0, cosmetica: 0, beauty: 0 };
      dayAppointments.forEach((apt) => {
        const cat = apt.category || serviceToCategory[apt.service] || 'general';
        if (cat in categoryCounts) categoryCounts[cat]++;
      });

      days.push({
        date, label: i === 0 ? 'اليوم' : i === 1 ? 'غدًا' : date.toLocaleDateString('ar-IL', { weekday: 'long' }),
        shortDate: date.toLocaleDateString('ar-IL', { day: 'numeric', month: 'short' }),
        total: dayAppointments.length, categories: categoryCounts,
        isWeekend: date.getDay() === 5 || date.getDay() === 6,
      });
    }
    return days;
  }, [appointments, serviceToCategory]);

  const maxCount = Math.max(...weeklyData.map((d) => d.total), 1);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#eef2f1] text-[#172B3A] flex items-center justify-center">
            <FaCalendarAlt />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">الحجوزات القادمة</h3>
            <p className="text-xs text-gray-400">نظرة على الأسبوع القادم</p>
          </div>
        </div>
        <button onClick={() => navigate('/appointments')} className="flex items-center gap-1 text-xs text-[#172B3A] hover:text-[#122330] transition-colors">
          عرض الكل <FaChevronLeft className="text-[10px]" />
        </button>
      </div>

      <div className="space-y-2">
        {weeklyData.map((day, idx) => (
          <div key={idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${day.isWeekend ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'}`}>
            <div className="w-16 flex-shrink-0">
              <p className={`text-sm font-medium ${idx === 0 ? 'text-[#172B3A]' : 'text-gray-700'}`}>{day.label}</p>
              <p className="text-[10px] text-gray-400">{day.shortDate}</p>
            </div>
            <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-[#172B3A] rounded-md transition-all" style={{ width: `${(day.total / maxCount) * 100}%`, minWidth: day.total > 0 ? '2rem' : '0' }} />
              {day.total > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">{day.total} حجز</span>
                </div>
              )}
              {day.total === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-gray-400">لا توجد حجوزات</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyAppointments;