import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue, runTransaction } from 'firebase/database';
import { database } from '../APIFirebase/firebase';

function phoneKey(phone) {
  return String(phone || '').replace(/\D/g, '');
}

const GroupOffer = () => {
  const { clinicId, offerId } = useParams();
  const [clinic, setClinic] = useState(null);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!clinicId || !offerId) return undefined;
    const u1 = onValue(ref(database, `clinics/${clinicId}/info`), (s) => setClinic(s.val()));
    const u2 = onValue(ref(database, `clinics/${clinicId}/groupOffers/${offerId}`), (s) => {
      setOffer(s.exists() ? s.val() : null);
      setLoading(false);
    });
    return () => { u1(); u2(); };
  }, [clinicId, offerId]);

  const accept = async (e) => {
    e.preventDefault();
    const key = phoneKey(phone);
    if (!name.trim() || key.length < 8) {
      setMsg('الاسم ورقم هاتف صحيح مطلوبان.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const tx = await runTransaction(ref(database, `clinics/${clinicId}/groupOffers/${offerId}/accepts/${key}`), (cur) => {
        if (cur) return;
        return { name: name.trim(), phone: key, at: Date.now() };
      });
      if (!tx.committed) setMsg('هذا الرقم سجّل موافقته من قبل.');
      else setMsg('سُجّلت الموافقة.');
      setPhone('');
    } catch {
      setMsg('تعذّر تسجيل الموافقة. حاولي بعد نشر قواعد قاعدة البيانات.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-[#8a9199]">جاري التحميل...</div>;
  if (!offer) return <div className="min-h-screen flex items-center justify-center bg-white text-[#8a9199]">العرض غير موجود.</div>;

  const count = Object.keys(offer.accepts || {}).length;
  const goal = Number(offer.goal) || 10;
  const open = count >= goal;
  const discount = offer.discountType === 'percent' ? `${offer.value}%` : offer.value;

  return (
    <div dir="rtl" className="min-h-screen bg-white text-[#14171c] flex items-center justify-center p-4">
      <div className="w-full max-w-md saas-card p-6">
        <p className="text-xs text-[#8a9199]">{clinic?.name || 'العيادة'}</p>
        <h1 className="text-xl font-bold text-[#111827] mt-1">{offer.title}</h1>
        <p className="text-sm text-[#6b7280] mt-2">خصم {discount}. العرض يُفتح بعد {goal} موافقات.</p>
        <p className={`nura-chip mt-4 ${open ? 'nura-chip-mint' : 'nura-chip-gold'}`}>
          {open ? 'العرض مفتوح' : `${count} من ${goal}`}
        </p>
        {open ? (
          <p className="text-sm text-[#047857] mt-4">اكتمل العدد. يمكن للعيادة استخدام العرض الآن.</p>
        ) : (
          <form onSubmit={accept} className="space-y-3 mt-5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className="w-full p-2.5 border border-[#e4eee8] rounded-2xl text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف" dir="ltr" className="w-full p-2.5 border border-[#e4eee8] rounded-2xl text-sm" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-2xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-60">
              {busy ? 'جاري التسجيل...' : 'أوافق على العرض'}
            </button>
          </form>
        )}
        {msg && <p className="text-sm mt-3 text-[#374151]" role="status">{msg}</p>}
      </div>
    </div>
  );
};

export default GroupOffer;
