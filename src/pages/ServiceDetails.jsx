import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { FaArrowRight, FaCheckCircle, FaClock, FaTag, FaPhone } from 'react-icons/fa';

const ServiceDetails = () => {
  const { clinicId, serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId || !serviceId) return;

    // جلب بيانات العيادة
    const unsubClinic = onValue(ref(database, `clinics/${clinicId}/info`), (snap) => {
      setClinic(snap.val());
    });

    // جلب بيانات الخدمة
    const serviceRef = ref(database, `clinics/${clinicId}/services/${serviceId}`);
    const unsubService = onValue(serviceRef, (snap) => {
      if (snap.exists()) {
        setService({ id: serviceId, ...snap.val() });
      } else {
        setService(null);
      }
      setLoading(false);
    });

    return () => { unsubClinic(); unsubService(); };
  }, [clinicId, serviceId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-pink-500 font-bold">جاري التحميل...</div>;
  if (!clinic) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">العيادة غير موجودة</div>;
  if (!service) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div className="text-5xl mb-4">🔍</div>
    <p className="text-gray-600 font-bold mb-4">الخدمة غير موجودة أو تم حذفها</p>
    <button onClick={() => navigate(`/book/${clinicId}`)} className="text-pink-500 font-bold hover:underline">العودة للعيادة</button>
  </div>;

  const primaryColor = clinic.primaryColor || '#ec4899';
  const bgColor = clinic.bgColor || '#fdf2f8';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-sans pb-20">
      
      {/* الهيدر */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(`/book/${clinicId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition font-bold">
            <FaArrowRight /> العودة للعيادة
          </button>
          {clinic.logoUrl ? (
            <img src={clinic.logoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>C</div>
          )}
        </div>
      </header>

      {/* محتوى الخدمة */}
      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="h-64 md:h-80 w-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
            {service.imageUrl ? (
              <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">💆‍♀️</span>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-extrabold text-gray-800">{service.title}</h1>
              <span className="text-2xl font-bold px-4 py-2 rounded-xl" style={{ backgroundColor: bgColor, color: primaryColor }}>
                {service.price} ₪
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                <FaTag style={{ color: primaryColor }} /> القسم: {service.category}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                <FaClock style={{ color: primaryColor }} /> مدة الجلسة: {service.duration || 'حسب الحالة'}
              </div>
            </div>

            <div className="prose prose-pink max-w-none text-gray-600 leading-relaxed mb-10">
              <h3 className="text-xl font-bold text-gray-800 mb-3">عن هذه الخدمة</h3>
              <p>
                {service.description || 'نقدم لك هذه الخدمة بأعلى معايير الجودة والأمان، باستخدام أحدث التقنيات وبإشراف نخبة من الأخصائيات. نهدف دائماً لإرضائك وإظهار جمالك بأفضل صورة.'}
              </p>
            </div>

            <div className="mb-10">
              <h3 className="text-xl font-bold text-gray-800 mb-4">الأسئلة الشائعة</h3>
              <div className="space-y-3">
                {[
                  { q: 'كم جلسة أحتاج؟', a: 'يختلف عدد الجلسات حسب حالتك، وسيتم تحديد ذلك بدقة بعد الاستشارة الأولى.' },
                  { q: 'هل هناك ألم أو أعراض جانبية؟', a: 'إجراءاتنا آمنة ومريحة، وأي أعراض بسيطة تزول خلال ساعات قليلة.' }
                ].map((faq, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-xl">
                    <p className="font-bold text-gray-800 mb-1">{faq.q}</p>
                    <p className="text-sm text-gray-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-100">
              <div>
                <p className="font-bold text-gray-800 text-lg">جاهزة للبدء؟</p>
                <p className="text-sm text-gray-500">احجزي موعدك الآن وسنتواصل معك للتأكيد.</p>
              </div>
              <button 
                onClick={() => navigate(`/book/${clinicId}`)} 
                className="w-full md:w-auto px-8 py-3 rounded-xl text-white font-bold shadow-md hover:opacity-90 transition"
                style={{ backgroundColor: primaryColor }}
              >
                احجزي هذه الخدمة الآن
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ServiceDetails;