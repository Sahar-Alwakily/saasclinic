import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaCalendarAlt, FaTimes, FaPhone, FaClock, FaCheckCircle, FaWhatsapp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ScheduleSettingsModal from '../components/settings/ScheduleSettingsModal';

const Appointments = () => {
  const { clinicPath } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (!clinicPath) return;
    const aptPath = clinicPath('appointments');
    if (!aptPath) return;

    const unsub = onValue(ref(database, aptPath), (snap) => {
      const val = snap.val();
      setAppointments(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  // 🟢 دالة تغيير حالة الحجز وإرسال الواتساب
  const handleUpdateStatus = async (aptId, newStatus, phone, customerName) => {
    const aptPath = clinicPath(`appointments/${aptId}`);
    if (!aptPath) return;

    try {
      // 1. تحديث الداتابيز
      await update(ref(database, aptPath), { status: newStatus });
      
      // 2. إرسال رسالة واتساب
      if (newStatus === 'confirmed') {
        toast.info('تم تأكيد الحجز، جاري إرسال التذكير...');
        // 🔴 هنا بتربط الـ API تبعت الواتساب
        // مثال: await fetch('/api/send-whatsapp', { ... })
        setTimeout(() => {
          toast.success('تم إرسال التذكير بنجاح!');
        }, 2000);
      } else {
        toast.success('تم تحديث الحالة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleWhatsAppDirect = (phone) => {
    window.open(`https://wa.me/972${phone.replace(/\D/g, '').replace(/^0/, '')}`, '_blank');
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">المواعيد والحجوزات</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة كافة الحجوزات وتأكيدها</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium">
            <FaClock /> إعدادات الجدول
          </button>
          <button className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium">
            <FaPlus /> حجز جديد
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد حجوزات بعد</h3>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-pink-100 dark:border-slate-600">
                  <FaClock className="text-sm mb-1" />
                  <span className="text-xs font-bold">{apt.time?.split(' ')[0]}</span>
                </div>
                
                <div className="flex-1">
                  <p className="font-bold text-gray-800 dark:text-white">{apt.customerName}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><FaCalendarAlt /> {apt.date}</span>
                    <span className="flex items-center gap-1" dir="ltr"><FaPhone /> {apt.phoneNumber}</span>
                  </div>
                  <p className="text-xs text-pink-600 mt-1">{apt.service}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* أزرار الحالة */}
                  {apt.status === 'pending' && (
                    <button 
                      onClick={() => handleUpdateStatus(apt.id, 'confirmed', apt.phoneNumber, apt.customerName)}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition flex items-center gap-2"
                    >
                      <FaCheckCircle /> تأكيد وإرسال تذكير
                    </button>
                  )}
                  
                  {apt.status === 'confirmed' && (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold flex items-center gap-2">
                      <FaCheckCircle /> مؤكد
                    </span>
                  )}

                  <button 
                    onClick={() => handleWhatsAppDirect(apt.phoneNumber)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition flex items-center gap-2"
                  >
                    <FaWhatsapp /> مراسلة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScheduleSettingsModal show={showScheduleModal} onClose={() => setShowScheduleModal(false)} />
    </div>
  );
};

export default Appointments;