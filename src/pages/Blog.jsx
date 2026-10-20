import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaTrash, FaEdit, FaTimes, FaImage } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const Blog = () => {
  const { clinicPath } = useClinic();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // حالة الفورم
  const [form, setForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
  });

  // جلب المقالات
  useEffect(() => {
    if (!clinicPath) return;
    const blogPath = clinicPath('blog');
    if (!blogPath) return;

    const unsub = onValue(ref(database, blogPath), (snap) => {
      const val = snap.val();
      setPosts(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('الرجاء تعبئة العنوان والمحتوى');

    const blogPath = clinicPath('blog');
    if (!blogPath) return;

    try {
      const newRef = push(ref(database, blogPath));
      await set(newRef, {
        title: form.title,
        content: form.content,
        imageUrl: form.imageUrl || '',
        createdAt: Date.now(),
      });
      toast.success('تم نشر المقال بنجاح!');
      setShowModal(false);
      setForm({ title: '', content: '', imageUrl: '' });
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المقال؟')) return;
    const postPath = clinicPath(`blog/${id}`);
    if (!postPath) return;
    try {
      await remove(ref(database, postPath));
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">المدونة والمقالات</h1>
          <p className="text-gray-500 text-sm mt-1">اكتب نصائح ومقالات لعملائك لتزيد من ثقتهم</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition shadow-sm font-medium">
          <FaPlus /> مقال جديد
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد مقالات بعد</h3>
          <p className="text-gray-500 text-sm">ابدأ بكتابة مقالك الأول، وسيظهر في واجهة المتجر تلقائياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col relative group">
              <button onClick={() => handleDelete(post.id)} className="absolute top-3 left-3 w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 z-10">
                <FaTrash className="text-xs" />
              </button>

              <div className="w-full h-40 bg-gray-50 dark:bg-slate-900 rounded-xl mb-4 overflow-hidden relative">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600 text-4xl">
                    <FaImage />
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{post.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">{post.content}</p>
              
              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleDateString('ar-IL')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة إضافة مقال */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden" dir="rtl">
            <div className="bg-pink-500 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">كتابة مقال جديد</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><FaTimes /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان المقال</label>
                <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none dark:text-white" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط الصورة (URL) - اختياري</label>
                <input type="url" value={form.imageUrl} onChange={(e) => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none text-sm dark:text-white" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">محتوى المقال</label>
                <textarea value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} required rows={6} className="w-full p-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl focus:border-pink-400 outline-none resize-none dark:text-white" placeholder="اكتب نصيحتك أو مقالك هنا..." />
              </div>
              
              <button type="submit" className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition mt-2">نشر المقال</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;