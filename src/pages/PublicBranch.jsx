import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { FaArrowRight, FaMapMarkerAlt, FaPhone, FaWhatsapp, FaClock } from 'react-icons/fa';
import { getPreviewClinic } from '../components/themes/previewData';

const PublicBranch = () => {
  const { clinicId, branchId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [branch, setBranch] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId || !branchId) return;
    const preview = getPreviewClinic(clinicId);
    if (preview) {
      setClinic(preview.clinic);
      const found = preview.branches.find((b) => b.id === branchId);
      setBranch(found ? { ...found } : null);
      setServices(preview.services);
      setLoading(false);
      return undefined;
    }
    const unsubClinic = onValue(ref(database, `clinics/${clinicId}/info`), (snap) => setClinic(snap.val()));
    const unsubBranch = onValue(ref(database, `clinics/${clinicId}/branches/${branchId}`), (snap) => {
      if (snap.exists()) setBranch({ id: branchId, ...snap.val() });
      else setBranch(null);
      setLoading(false);
    });
    const unsubServ = onValue(ref(database, `clinics/${clinicId}/services`), (snap) => {
      const val = snap.val();
      setServices(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    return () => { unsubClinic(); unsubBranch(); unsubServ(); };
  }, [clinicId, branchId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-pink-500 font-bold">جاري التحميل...</div>;
  if (!clinic) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">العيادة غير موجودة</div>;
  if (!branch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-600 font-bold mb-4">الفرع غير موجود</p>
        <button onClick={() => navigate(`/book/${clinicId}`)} className="text-pink-500 font-bold hover:underline">العودة للعيادة</button>
      </div>
    );
  }

  const primaryColor = clinic.primaryColor || '#ec4899';
  const wa = branch.whatsapp || branch.phone || clinic.phone;
  const waHref = wa ? `https://wa.me/${String(wa).replace(/\D/g, '')}` : '';
  const bookHref = `/book/${clinicId}?branch=${branch.id}&book=1`;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(`/book/${clinicId}`)} className="flex items-center gap-2 text-gray-600 font-bold">
            <FaArrowRight /> العودة للعيادة
          </button>
          <p className="font-bold text-gray-700">{clinic.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-10">
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: primaryColor }}>فرع</p>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-6">{branch.name}</h1>

          <div className="space-y-3 text-gray-600 mb-8">
            {branch.address && (
              <p className="flex items-start gap-3"><FaMapMarkerAlt className="mt-1" style={{ color: primaryColor }} /> {branch.address}</p>
            )}
            {branch.phone && (
              <p className="flex items-center gap-3" dir="ltr"><FaPhone style={{ color: primaryColor }} /> <a href={`tel:${branch.phone}`} className="hover:underline">{branch.phone}</a></p>
            )}
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-emerald-700">
                <FaWhatsapp /> واتساب
              </a>
            )}
            {branch.hours && (
              <p className="flex items-start gap-3"><FaClock className="mt-1" style={{ color: primaryColor }} /> {branch.hours}</p>
            )}
          </div>

          <Link
            to={bookHref}
            className="inline-block px-8 py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            احجزي في هذا الفرع
          </Link>
        </div>

        {services.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-10">
            <h2 className="text-xl font-bold text-gray-800 mb-4">الجلسات</h2>
            <div className="space-y-3">
              {services.map((s) => (
                <Link
                  key={s.id}
                  to={`/book/${clinicId}/service/${s.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-bold text-gray-800">{s.title}</p>
                    {s.duration && <p className="text-xs text-gray-400 mt-1">{s.duration}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicBranch;
