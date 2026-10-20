import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../APIFirebase/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { getPlan } from '../config/plans';

const RegisterClinic = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    clinicName: '', ownerName: '', email: '', password: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) return setError('كلمة المرور لازم 6 أحرف على الأقل');
    if (!form.clinicName.trim() || !form.ownerName.trim()) return setError('اسم العيادة والمالك مطلوبان');

    setLoading(true);

    try {
      // 1. إنشاء مستخدم Auth
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const uid = cred.user.uid;

      // 2. تجهيز البيانات
      const clinicId = `clinic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const trialEndsAt = now + getPlan('trial').durationDays * 24 * 60 * 60 * 1000;

      // 3. معلومات العيادة
      await set(ref(database, `clinics/${clinicId}/info`), {
        name: form.clinicName.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.email.trim(),
        phone: form.phone.trim(),
        plan: 'trial',
        createdAt: now,
        trialEndsAt,
        isActive: true,
      });

      // 4. المستخدم كأدمن داخل العيادة
      await set(ref(database, `clinics/${clinicId}/users/${uid}`), {
        email: form.email.trim(), name: form.ownerName.trim(), role: 'admin', createdAt: now,
      });

      // 5. ربط المستخدم بالعيادة (meta)
      await set(ref(database, `meta/users/${uid}`), {
        clinicId, role: 'admin', email: form.email.trim(),
      });

      // 6. فهرس العيادات
      await set(ref(database, `meta/clinics/${clinicId}`), {
        name: form.clinicName.trim(), ownerEmail: form.email.trim(), plan: 'trial', createdAt: now, isActive: true,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'هذا الإيميل مستخدم مسبقاً' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-600 text-white flex items-center justify-center text-3xl shadow-lg mb-3">🩺</div>
          <h1 className="text-2xl font-bold text-gray-800">أنشئ عيادتك</h1>
          <p className="text-sm text-gray-500 mt-1">14 يوم مجاني — بدون بطاقة</p>
        </div>

        {error && <div className="bg-rose-50 text-rose-700 text-sm p-3 rounded-xl mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="اسم العيادة" onChange={update('clinicName')} required className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" />
          <input type="text" placeholder="اسم المالك" onChange={update('ownerName')} required className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" />
          <input type="tel" placeholder="رقم الهاتف" onChange={update('phone')} className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" />
          <input type="email" placeholder="الإيميل" onChange={update('email')} required className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" dir="ltr" />
          <input type="password" placeholder="كلمة المرور" onChange={update('password')} required className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" dir="ltr" />
          
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition disabled:opacity-60">
            {loading ? 'جاري الإنشاء...' : 'أنشئ العيادة'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">عندك حساب؟ <Link to="/login" className="text-violet-600 font-semibold hover:underline">سجّل دخول</Link></p>
      </div>
    </div>
  );
};

export default RegisterClinic;