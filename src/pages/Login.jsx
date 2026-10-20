import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../APIFirebase/firebase';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError('الإيميل أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">تسجيل الدخول</h1>

        {error && <div className="bg-rose-50 text-rose-700 text-sm p-3 rounded-xl mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="الإيميل" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" dir="ltr" />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border rounded-xl outline-none focus:border-violet-400" dir="ltr" />
          
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition disabled:opacity-60">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">ما عندك حساب؟ <Link to="/register" className="text-violet-600 font-semibold hover:underline">أنشئ عيادة</Link></p>
      </div>
    </div>
  );
};

export default Login;