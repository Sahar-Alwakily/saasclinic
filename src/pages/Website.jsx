import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { siteStatus } from '../utils/clinicInsights';
import { toast, ToastContainer } from 'react-toastify';

const Website = () => {
  const { clinicId, clinicInfo, clinicPath } = useClinic();
  const [services, setServices] = useState([]);
  const [blog, setBlog] = useState([]);

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u1 = onValue(ref(database, clinicPath('services')), (s) => {
      setServices(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u2 = onValue(ref(database, clinicPath('blog')), (s) => {
      setBlog(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    return () => { u1(); u2(); };
  }, [clinicPath]);

  const site = siteStatus({ clinicInfo, clinicId, services, blog });

  return (
    <div className="space-y-6">
      <ToastContainer position="top-left" rtl />
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#4d7cff] font-semibold">site ops</p>
        <h1 className="font-product text-3xl">موقع العيادة</h1>
        <p className="text-sm text-stone-500 mt-1">التصميم، النشر، الدومين، SEO، وأداء صفحات الخدمات من بياناتكِ المخزّنة.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">حالة النشر</p>
          <p className="font-product text-2xl mt-1">{site.published ? 'منشور' : 'ناقص'}</p>
          <p className="text-xs text-stone-500 mt-1">{site.ready}/{site.total} عناصر جاهزة</p>
        </div>
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">التصميم</p>
          <p className="font-product text-2xl mt-1">{site.theme}</p>
          <Link to="/settings?tab=store" className="text-xs text-[#4d7cff] font-bold">تعديل الثيم</Link>
        </div>
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">الدومين</p>
          <p className="text-xs mt-2 break-all" dir="ltr">{site.url || '—'}</p>
          <p className="text-[11px] text-stone-400 mt-2">{site.domainNote}</p>
        </div>
        <div className="saas-card p-4">
          <p className="text-[11px] text-stone-400">SEO</p>
          <p className="text-xs mt-2">{clinicInfo?.seoTitle ? clinicInfo.seoTitle : 'لا عنوان SEO'}</p>
          <Link to="/settings?tab=store" className="text-xs text-[#4d7cff] font-bold">تحرير الوصف</Link>
        </div>
      </div>

      <div className="saas-card p-5">
        <div className="flex justify-between gap-3 flex-wrap">
          <h2 className="font-product text-xl">جاهزية الصفحة</h2>
          {site.url && (
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(site.url); toast.info('تم نسخ الرابط'); }}
              className="text-xs px-3 py-1.5 rounded-full bg-[#4d7cff] text-white"
            >
              نسخ رابط الحجز
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
          {site.checks.map((c) => (
            <div key={c.id} className="rounded-xl px-3 py-2 text-sm bg-[#f3efe6] dark:bg-[#1e1b28]">
              <span className={c.ok ? 'text-[#0f766e]' : 'text-[#c2410c]'}>{c.ok ? 'جاهز' : 'ناقص'}</span>
              <span className="mr-2">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="saas-card p-5">
        <div className="flex justify-between items-center">
          <h2 className="font-product text-xl">صفحات الخدمات</h2>
          <Link to="/services" className="text-xs font-bold text-[#4d7cff]">إدارة الخدمات</Link>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          المدونة {site.blogCount} مقال · القسم {site.showBlog ? 'ظاهر' : 'مخفي'} · الجلسات {site.showServices ? 'ظاهرة' : 'مخفية'}
        </p>
        <div className="mt-4 divide-y divide-[#e4ddd0] dark:divide-white/10">
          {site.services.length === 0 && <p className="text-sm text-stone-500">لا خدمات بعد.</p>}
          {site.services.map((s) => (
            <div key={s.id} className="py-3 flex justify-between gap-3 text-sm">
              <div>
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-stone-500">
                  {s.hasDesc ? 'فيها وصف' : 'بدون وصف'} · {s.duration ? `${s.duration} د` : 'بدون مدة'} · {s.price ? `${s.price}` : 'بدون سعر'}
                </p>
              </div>
              {clinicId && (
                <a href={`/book/${clinicId}/service/${s.id}`} target="_blank" rel="noreferrer" className="text-xs text-[#4d7cff]">الصفحة العامة</a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Website;
