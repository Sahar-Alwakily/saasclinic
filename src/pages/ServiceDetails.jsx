import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { FaArrowRight, FaClock, FaTag, FaUserMd } from 'react-icons/fa';
import { getPreviewClinic } from '../components/themes/previewData';

const CATEGORY_NAMES = {
  laser: 'ليزر',
  vitamins: 'فيتامينات',
  cosmetica: 'كوزمتكا',
  beauty: 'تجميل',
};

const ServiceDetails = () => {
  const { clinicId, serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [specialist, setSpecialist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId || !serviceId) return;

    const preview = getPreviewClinic(clinicId);
    if (preview) {
      setClinic(preview.clinic);
      const found = preview.services.find((s) => s.id === serviceId);
      setService(found ? { ...found } : null);
      setSpecialist(preview.clinic.doctorName ? { name: preview.clinic.doctorName } : null);
      setLoading(false);
      return undefined;
    }

    const unsubClinic = onValue(ref(database, `clinics/${clinicId}/info`), (snap) => {
      setClinic(snap.val());
    });

    const unsubService = onValue(ref(database, `clinics/${clinicId}/services/${serviceId}`), (snap) => {
      if (snap.exists()) setService({ id: serviceId, ...snap.val() });
      else setService(null);
      setLoading(false);
    });

    return () => { unsubClinic(); unsubService(); };
  }, [clinicId, serviceId]);

  useEffect(() => {
    if (!clinicId || !service?.specialistId) {
      setSpecialist(null);
      return undefined;
    }
    const unsub = onValue(ref(database, `clinics/${clinicId}/users/${service.specialistId}`), (snap) => {
      setSpecialist(snap.exists() ? { id: service.specialistId, ...snap.val() } : null);
    });
    return () => unsub();
  }, [clinicId, service?.specialistId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-pink-500 font-bold">جاري التحميل...</div>;
  if (!clinic) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">العيادة غير موجودة</div>;
  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-600 font-bold mb-4">الخدمة غير موجودة أو تم حذفها</p>
        <button onClick={() => navigate(`/book/${clinicId}`)} className="text-pink-500 font-bold hover:underline">العودة للعيادة</button>
      </div>
    );
  }

  const primaryColor = clinic.primaryColor || '#ec4899';
  const bgColor = clinic.bgColor || '#fdf2f8';
  const faqs = Array.isArray(service.faqs) ? service.faqs.filter((f) => f.q && f.a) : [];
  const specialistName = specialist?.name || service.specialistName;
  const bookHref = `/book/${clinicId}?service=${service.id}&book=1`;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(`/book/${clinicId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition font-bold">
            <FaArrowRight /> العودة للعيادة
          </button>
          {clinic.logoUrl ? (
            <img src={clinic.logoUrl} alt="" className="h-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>
              {(clinic.name || 'C').charAt(0)}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-64 md:h-80 w-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
            {service.imageUrl ? (
              <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover" />
            ) : (
              <p className="text-sm text-gray-400 px-6 text-center">لا توجد صورة معتمدة من العيادة لهذه الجلسة</p>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-extrabold text-gray-800">{service.title}</h1>
              {service.price !== undefined && service.price !== '' && (
                <span className="text-2xl font-bold px-4 py-2 rounded-xl" style={{ backgroundColor: bgColor, color: primaryColor }}>
                  {service.price} ₪
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {service.category && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                  <FaTag style={{ color: primaryColor }} /> {CATEGORY_NAMES[service.category] || service.category}
                </div>
              )}
              {service.duration && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                  <FaClock style={{ color: primaryColor }} /> المدة: {service.duration}
                </div>
              )}
              {specialistName && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                  <FaUserMd style={{ color: primaryColor }} /> تقدّمها: {specialistName}
                </div>
              )}
            </div>

            <div className="text-gray-600 leading-relaxed mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3">عن هذه الخدمة</h2>
              {service.description ? (
                <p className="whitespace-pre-line">{service.description}</p>
              ) : (
                <p className="text-sm text-gray-500">تفاصيل الجلسة تُحدَّد مع العيادة عند الحجز. لم تُضف العيادة وصفاً بعد.</p>
              )}
            </div>

            {faqs.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 mb-4">أسئلة معتمدة من العيادة</h2>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl">
                      <p className="font-bold text-gray-800 mb-1">{faq.q}</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-8">المحتوى من العيادة فقط، ولا يُعد تشخيصاً أو ضمان نتيجة علاجية.</p>

            <div className="bg-gray-50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-100">
              <div>
                <p className="font-bold text-gray-800 text-lg">احجزي هذه الجلسة</p>
                <p className="text-sm text-gray-500">اختاري الفرع ثم الموعد حسب دوام المختصة.</p>
              </div>
              <Link
                to={bookHref}
                className="w-full md:w-auto px-8 py-3 rounded-xl text-white font-bold shadow-md hover:opacity-90 transition text-center"
                style={{ backgroundColor: primaryColor }}
              >
                احجزي الآن
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ServiceDetails;
