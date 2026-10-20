import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { useAuth } from '../context/AuthContext';
import { FaUsers, FaCalendarAlt, FaMoneyBillWave, FaClock } from 'react-icons/fa';

// استيراد المكونات
import TopCustomers from '../components/dashboard/TopCustomers';
import WeeklyAppointments from '../components/dashboard/WeeklyAppointments';
import SmartAlerts from '../components/dashboard/SmartAlerts';

const Dashboard = () => {
  const { clinicInfo, clinicPath, loadingClinic, userRole } = useClinic();
  const { user } = useAuth();
  
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!clinicPath) return;

    const aptPath = clinicPath('appointments');
    const custPath = clinicPath('customers');
    const servPath = clinicPath('services');

    if (!aptPath || !custPath || !servPath) return;

    // جلب المواعيد مع فلترة حسب القسم لو كانت موظفة
    const unsubApt = onValue(ref(database, aptPath), (snap) => {
      const val = snap.val();
      let allApts = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : [];
      
      // إذا كانت موظفة، اعرض بس مواعيد قسمها
      if (userRole === 'worker' && user?.category) {
        allApts = allApts.filter(apt => apt.category === user.category);
      }
      
      setAppointments(allApts);
    });

    const unsubCust = onValue(ref(database, custPath), (snap) => {
      const val = snap.val();
      setCustomers(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });

    const unsubServ = onValue(ref(database, servPath), (snap) => {
      const val = snap.val();
      setServices(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoadingData(false); 
    });

    return () => {
      unsubApt();
      unsubCust();
      unsubServ();
    };
  }, [clinicPath, userRole, user]);

  if (loadingClinic || loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const todayAppointmentsCount = appointments.filter(
    (a) => a.date && new Date(a.date).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      {/* الترحيب */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          مرحباً بك، {clinicInfo?.ownerName || 'شريكنا العزيز'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {userRole === 'worker' ? 'هذه نظرة على مواعيد قسمك اليوم.' : 'هذه نظرة سريعة على أداء عيادتك اليوم.'}
        </p>
      </div>

      {/* كروت إحصائية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="إجمالي العملاء" 
          value={customers.length} 
          icon={FaUsers} 
          color="bg-pink-500" 
        />
        <StatCard 
          title="حجوزات اليوم" 
          value={todayAppointmentsCount} 
          icon={FaCalendarAlt} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="الخدمات المتاحة" 
          value={services.length} 
          icon={FaMoneyBillWave} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="إجمالي الحجوزات" 
          value={appointments.length} 
          icon={FaClock} 
          color="bg-amber-500" 
        />
      </div>

      {/* التنبيهات الذكية */}
      <SmartAlerts appointments={appointments} customers={customers} />

      {/* الجدول الأسبوعي وأفضل العملاء */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyAppointments appointments={appointments} services={services} />
        <TopCustomers customers={customers} />
      </div>
    </div>
  );
};

// مكون الكرت الإحصائي
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center text-xl shadow-sm ${color}`}>
      <Icon />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">{value}</p>
    </div>
  </div>
);

export default Dashboard;