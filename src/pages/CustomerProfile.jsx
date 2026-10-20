import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { 
  FaArrowRight, FaPhone, FaBirthdayCake, FaSyringe, 
  FaPlus, FaTimes
} from 'react-icons/fa';
import moment from 'moment';
import 'moment/locale/ar';
moment.locale('ar');

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clinicPath } = useClinic();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sessions");
  
  // Modals state
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    if (!id || !clinicPath) return;
    const customerRef = ref(database, `${clinicPath('customers')}/${id}`);
    const unsub = onValue(customerRef, (snap) => {
      setCustomer(snap.exists() ? { id, ...snap.val() } : null);
      setLoading(false);
    });
    return () => unsub();
  }, [id, clinicPath]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;
  if (!customer) return <div className="text-center py-20 text-gray-500">العميلة غير موجودة</div>;

  const sortedSessions = [...(customer.sessions || [])].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  // إضافة جلسة (مع إنشاء علاج تلقائي)
  const handleAddSession = async (sessionData) => {
    try {
      const now = new Date().toISOString();
      const serviceName = sessionData.serviceTitle || 'علاج عام';

      // 1. تجهيز الجلسة الجديدة
      const newSession = {
        id: Date.now().toString(),
        ...sessionData,
        recordedAt: now
      };

      // 2. تحديث مصفوفة الجلسات
      const newSessions = [...(customer.sessions || []), newSession];

      // 3. تجهيز العلاجات
      const treatments = customer.treatments || {};
      let treatmentId = Object.keys(treatments).find(
        (tid) => treatments[tid].serviceName === serviceName
      );

      const updates = {
        sessions: newSessions
      };

      if (treatmentId) {
        // إذا العلاج موجود، نضيف الجلسة لسجله
        const existingTreatment = treatments[treatmentId];
        updates[`treatments/${treatmentId}/sessions`] = [
          ...(existingTreatment.sessions || []),
          {
            sessionNumber: (existingTreatment.sessions?.length || 0) + 1,
            date: now.split('T')[0],
            time: new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            notes: sessionData.note || '',
            recordedAt: now
          }
        ];
        updates[`treatments/${treatmentId}/updatedAt`] = now;
      } else {
        // إذا ما في علاج، ننشئ واحد جديد
        const newTreatmentId = `t_${Date.now()}`;
        updates[`treatments/${newTreatmentId}`] = {
          serviceName: serviceName,
          category: sessionData.category || 'beauty',
          currentPhase: 'during', // يبدأ بـ "أثناء العلاج"
          phaseStartedAt: now,
          sessions: [
            {
              sessionNumber: 1,
              date: now.split('T')[0],
              time: new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              notes: sessionData.note || '',
              recordedAt: now
            }
          ],
          createdAt: now,
          status: 'active'
        };
      }

      // 4. الحفظ في الفايربايس
      await update(ref(database, clinicPath(`customers/${id}`)), updates);
      
      toast.success('تم تسجيل الجلسة والعلاج بنجاح!');
      setShowSessionModal(false);
    } catch (e) { 
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ'); 
    }
  };

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl mx-auto">
      <ToastContainer position="top-left" rtl />
      
      {/* زر الرجوع */}
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors">
        <FaArrowRight /> العودة لملفات العملاء
      </button>

      {/* الهيدر */}
      <div className="bg-gradient-to-l from-pink-500 to-rose-400 text-white rounded-3xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-3xl font-bold backdrop-blur">
            {(customer.firstName || "?")[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">{customer.firstName} {customer.lastName}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1" dir="ltr"><FaPhone /> {customer.phone}</span>
              {customer.birthDate && <span className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1"><FaBirthdayCake /> {customer.birthDate}</span>}
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !customer.doNotContact;
                await update(ref(database, clinicPath(`customers/${id}`)), { doNotContact: next, winbackOptOut: next, optOutAt: next ? Date.now() : null });
                toast.success(next ? 'لن تُرسل حملات استرجاع لهذه العميلة' : 'أُعيد السماح بالتواصل التنظيمي');
              }}
              className="mt-3 text-xs bg-white/20 rounded-full px-3 py-1"
            >
              {customer.doNotContact || customer.winbackOptOut ? 'مسموح بالتواصل التنظيمي' : 'عدم التواصل / انسحاب من الحملات'}
            </button>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex border-b border-gray-100 bg-white dark:bg-slate-800 rounded-t-2xl px-2">
        <button onClick={() => setActiveTab("sessions")} className={`flex-1 py-4 font-bold ${activeTab === "sessions" ? "text-pink-600 border-b-2 border-pink-500" : "text-gray-400"}`}>سجل الجلسات</button>
        <button onClick={() => setActiveTab("medical")} className={`flex-1 py-4 font-bold ${activeTab === "medical" ? "text-pink-600 border-b-2 border-pink-500" : "text-gray-400"}`}>المعلومات الطبية</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-b-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 min-h-[300px]">
        {activeTab === "sessions" && (
          <div>
            <button onClick={() => setShowSessionModal(true)} className="w-full bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold mb-6 hover:bg-pink-100 dark:hover:bg-pink-900/40 transition">
              <FaPlus /> تسجيل جلسة جديدة
            </button>
            
            {sortedSessions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">لا توجد جلسات مسجلة بعد</div>
            ) : (
              <div className="space-y-3">
                {sortedSessions.map(session => (
                  <div key={session.id} className="p-4 border border-pink-100 dark:border-slate-700 bg-pink-50/50 dark:bg-slate-700/50 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-200 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 flex items-center justify-center"><FaSyringe /></div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{session.serviceTitle || 'جلسة عامة'}</p>
                      <p className="text-xs text-gray-500">{moment(session.recordedAt).format('dddd، D MMMM YYYY — HH:mm')}</p>
                      {session.note && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 bg-white dark:bg-slate-800 p-1 rounded">📝 {session.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "medical" && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">الحساسية</p>
              <p className="text-sm font-medium dark:text-white">{customer.medicalInfo?.allergies || 'لا يوجد'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">الأمراض المزمنة</p>
              <p className="text-sm font-medium dark:text-white">{customer.medicalInfo?.chronicDiseases || 'لا يوجد'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal إضافة جلسة */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md" dir="rtl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg dark:text-white">تسجيل جلسة جديدة</h3>
              <button onClick={() => setShowSessionModal(false)} className="text-gray-400 hover:text-rose-500"><FaTimes /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              handleAddSession({
                serviceTitle: form.serviceTitle.value,
                note: form.note.value,
                recordedBy: 'الطبيبة'
              });
            }}>
              <div className="space-y-4">
                <input name="serviceTitle" placeholder="اسم الخدمة (مثال: جلسة ليزر)" required className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none focus:border-pink-400 dark:text-white" />
                <textarea name="note" placeholder="ملاحظات الجلسة" className="w-full p-3 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl outline-none focus:border-pink-400 dark:text-white" rows="3" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowSessionModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl">إلغاء</button>
                  <button type="submit" className="flex-1 py-2 bg-pink-500 text-white rounded-xl font-bold">حفظ</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;