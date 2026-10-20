import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue, runTransaction, update, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { claimSlot, slotKey, makeToken, appendHistory, mergeAptSettings } from '../utils/appointmentOps';

const WaitlistOffer = () => {
  const { clinicId, token } = useParams();
  const [offer, setOffer] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [settings, setSettings] = useState(mergeAptSettings(null));
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId || !token) return undefined;
    const unsubs = [
      onValue(ref(database, `clinics/${clinicId}/info`), (s) => setClinic(s.val())),
      onValue(ref(database, `clinics/${clinicId}/appointmentSettings`), (s) => setSettings(mergeAptSettings(s.val()))),
      onValue(ref(database, `clinics/${clinicId}/waitlistOffers/${token}`), (s) => {
        setOffer(s.exists() ? s.val() : null);
        setLoading(false);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicId, token]);

  const accept = async () => {
    if (!offer || offer.status !== 'open') return;
    if (offer.expiresAt && Date.now() > offer.expiresAt) {
      setMsg('انتهت مهلة قبول العرض.');
      return;
    }
    const claimRef = ref(database, `clinics/${clinicId}/vacancyClaims/${offer.vacancyId}`);
    const tx = await runTransaction(claimRef, (cur) => {
      if (cur?.taken) return;
      return { taken: true, by: offer.waitlistId, at: Date.now(), offerToken: token };
    });
    if (!tx.committed) {
      await update(ref(database, `clinics/${clinicId}/waitlistOffers/${token}`), { status: 'lost' });
      setMsg('الموعد امتلأ قبل القبول.');
      return;
    }
    const key = slotKey(offer.branchId, offer.specialistId, offer.date, offer.time);
    const aptId = push(ref(database, `clinics/${clinicId}/appointments`)).key;
    const locked = await claimSlot(database, clinicId, key, aptId);
    if (!locked) {
      setMsg('تعذر تثبيت الموعد — ربما حُجز.');
      return;
    }
    const manageToken = makeToken();
    await update(ref(database, `clinics/${clinicId}/appointments/${aptId}`), {
      customerName: offer.name,
      phoneNumber: offer.phone,
      service: offer.service,
      serviceId: offer.serviceId || '',
      specialistId: offer.specialistId || '',
      branchId: offer.branchId,
      date: offer.date,
      time: offer.time,
      price: offer.price || 0,
      status: settings.autoConfirm ? 'confirmed' : 'pending',
      manageToken,
      filledFromCancelledId: offer.fromAppointmentId || '',
      cancelledSourceAt: offer.cancelledAt || Date.now(),
      createdAt: Date.now(),
      history: appendHistory({}, { action: 'waitlist-accepted', by: 'customer' }),
    });
    await update(ref(database, `clinics/${clinicId}/manageTokens/${manageToken}`), { appointmentId: aptId });
    await update(ref(database, `clinics/${clinicId}/waitlistOffers/${token}`), { status: 'accepted', appointmentId: aptId });
    await update(ref(database, `clinics/${clinicId}/waitlist/${offer.waitlistId}`), { status: 'booked' });
    await update(ref(database, `clinics/${clinicId}/waitlistEvents/${offer.vacancyId}`), { open: false });
    setMsg('تم حجز الموعد لكِ.');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  if (!offer) return <div className="min-h-screen flex items-center justify-center">العرض غير موجود.</div>;

  const expired = offer.expiresAt && Date.now() > offer.expiresAt;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 space-y-3">
        <p className="text-xs text-gray-400">{clinic?.name}</p>
        <h1 className="text-xl font-bold">عرض موعد شاغر</h1>
        <p>{offer.service} — {offer.date} {offer.time}</p>
        {offer.expiresAt && <p className="text-xs text-gray-500">المهلة حتى {new Date(offer.expiresAt).toLocaleString('ar')}</p>}
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        {offer.status === 'open' && !expired && (
          <button onClick={accept} className="w-full py-3 rounded-xl bg-pink-500 text-white font-bold">قبول الموعد</button>
        )}
        {(expired || offer.status !== 'open') && !msg && <p className="text-sm text-gray-500">هذا العرض لم يعد متاحاً.</p>}
      </div>
    </div>
  );
};

export default WaitlistOffer;
