import React, { useMemo, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { FaExclamationTriangle, FaClock, FaBirthdayCake, FaUserClock, FaChevronLeft, FaBan } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { parseTime, detectUnreliablePhones, findBlockedRecord, NEGATIVE_STREAK_LIMIT } from '../../utils/unreliableDetection';

const SmartAlerts = ({ appointments = [], customers = [] }) => {
  const navigate = useNavigate();
  const { clinicPath } = useClinic();
  const [blockedPhonesObj, setBlockedPhonesObj] = useState({});

  // جلب الأرقام المحجوبة من مسار العيادة
  useEffect(() => {
    if (!clinicPath) return;
    const bpPath = clinicPath('blockedPhones');
    if (!bpPath) return;

    const unsub = onValue(ref(database, bpPath), (snap) => {
      setBlockedPhonesObj(snap.val() || {});
    });
    return () => unsub();
  }, [clinicPath]);

  const alerts = useMemo(() => {
    const list = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. حجوزات بانتظار تأكيد (موعدها لسا ما فات)
    const pendingOld = appointments.filter((apt) => {
      if (apt.status !== 'pending') return false;
      if (!apt.createdAt || !apt.date || !apt.time) return false;
      const aptDate = new Date(`${apt.date}T00:00:00`);
      const [h, m] = parseTime(apt.time);
      aptDate.setHours(h, m, 0, 0);
      if (aptDate <= now) return false;
      const hoursDiff = (now - new Date(apt.createdAt)) / (1000 * 60 * 60);
      return hoursDiff > 24;
    });
    if (pendingOld.length > 0) {
      list.push({
        id: 'pending_old', icon: FaExclamationTriangle, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-400',
        title: `${pendingOld.length} حجز قادم بانتظار تأكيد`, description: 'موعدهم لسا ما فات ومنذ أكثر من 24 ساعة بدون تأكيد',
        action: () => navigate('/appointments'),
      });
    }

    // 2. المواعيد القريبة (خلال ساعة)
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const soonAppointments = appointments.filter((apt) => {
      if (!apt.date || !apt.time) return false;
      if (!['pending', 'confirmed'].includes(apt.status)) return false;
      const aptDate = new Date(`${apt.date}T00:00:00`);
      const [h, m] = parseTime(apt.time);
      aptDate.setHours(h, m, 0, 0);
      return aptDate > now && aptDate <= nextHour;
    });
    if (soonAppointments.length > 0) {
      // نرتب حسب التاريخ والوقت لالتقاط الموعد القادم فعلاً وليس أول عنصر بالقائمة
      const next = [...soonAppointments].sort((a, b) => {
        const da = new Date(`${a.date}T00:00:00`);
        const db = new Date(`${b.date}T00:00:00`);
        if (da.getTime() !== db.getTime()) return da - db;
        const [ha, ma] = parseTime(a.time);
        const [hb, mb] = parseTime(b.time);
        return (ha * 60 + ma) - (hb * 60 + mb);
      })[0];
      list.push({
        id: 'soon', icon: FaClock, color: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-400',
        title: `الموعد القادم بعد قليل`, description: `${next.customerName} — ${next.time} (${next.service})`,
        action: () => navigate('/appointments'),
      });
    }

    // 3. أعياد ميلاد هذا الأسبوع
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const birthdays = customers.filter((c) => {
      if (!c.birthDate) return false;
      const bd = new Date(`${c.birthDate}T00:00:00`);
      const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      if (thisYearBd < today) thisYearBd.setFullYear(now.getFullYear() + 1);
      return thisYearBd >= today && thisYearBd <= next7Days;
    });
    if (birthdays.length > 0) {
      list.push({
        id: 'birthdays', icon: FaBirthdayCake, color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', iconBg: 'bg-pink-400',
        title: `${birthdays.length} عيد ميلاد هذا الأسبوع`, description: birthdays.slice(0, 3).map((c) => `${c.firstName} ${c.lastName}`).join('، '),
        action: () => navigate('/customers'),
      });
    }

    // 4. عملاء خاملون (لم يزوروا منذ 90 يومًا)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const inactiveCustomers = customers.filter((c) => {
      if (!c.adsStamp?.signature) return false;
      const sessions = c.sessions || [];
      if (sessions.length === 0) return false;
      const lastSession = sessions.reduce((latest, s) => {
        const d = new Date(s.recordedAt);
        return d > latest ? d : latest;
      }, new Date(0));
      return lastSession < ninetyDaysAgo;
    });
    if (inactiveCustomers.length > 0) {
      list.push({
        id: 'inactive', icon: FaUserClock, color: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-400',
        title: `${inactiveCustomers.length} عميلة خاملة`, description: 'موافقات على الإعلانات + لم يزوروا منذ 3 أشهر — فرصة تسويقية!',
        action: () => navigate('/customers'),
      });
    }

    // 5. أرقام غير موثوقة — بحاجة للحجب فقط
    const allUnreliable = detectUnreliablePhones(appointments, now);
    const needActionPhones = allUnreliable.filter((u) => !findBlockedRecord(u.phone, blockedPhonesObj));
    if (needActionPhones.length > 0) {
      const preview = needActionPhones.slice(0, 3).map((u) => u.name).join('، ');
      list.push({
        id: 'unreliable', icon: FaBan, color: 'red', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', iconBg: 'bg-rose-500',
        title: `${needActionPhones.length} رقم بحاجة للحجب`,
        description: `عندهن ${NEGATIVE_STREAK_LIMIT}+ مواعيد متتالية (ملغية/إعادة جدولة): ${preview}${needActionPhones.length > 3 ? '...' : ''}`,
        action: () => navigate('/appointments'), // مؤقتاً، بنقدر نعمل صفحة مخصصة بعدين
      });
    }

    return list;
  }, [appointments, customers, navigate, blockedPhonesObj]);

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-400 text-white flex items-center justify-center text-lg">✓</div>
        <div>
          <p className="font-bold text-emerald-700">كل شيء على ما يرام!</p>
          <p className="text-xs text-emerald-600">لا يوجد تنبيهات عاجلة الآن</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-[#A67C2D] rounded-full"></span> التنبيهات الذكية
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <button key={alert.id} onClick={alert.action} className={`${alert.bg} border-2 ${alert.border} rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all text-right`}>
              <div className={`w-12 h-12 rounded-xl ${alert.iconBg} text-white flex items-center justify-center text-lg flex-shrink-0`}><Icon /></div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold ${alert.text} text-sm`}>{alert.title}</p>
                <p className={`text-xs ${alert.text} opacity-80 mt-1 line-clamp-2`}>{alert.description}</p>
              </div>
              <FaChevronLeft className={`${alert.text} opacity-40 text-xs`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SmartAlerts;