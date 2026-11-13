import React, { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { siteStatus } from '../utils/clinicInsights';
import { SITE_POLICIES, policyText } from '../utils/sitePolicies';
import { toast, ToastContainer } from 'react-toastify';
import { FaImage, FaPen, FaPlus, FaTimes, FaTrash, FaExternalLinkAlt, FaCopy, FaDesktop } from 'react-icons/fa';

const field = 'w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200';
const emptyPost = { title: '', content: '', imageUrl: '' };

function PoliciesEditor({ clinicInfo, aptSettings, editing, form, saving, isAdmin, onEdit, onCancel, onChange, onSave }) {
  if (!editing) {
    return (
      <section className="saas-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-[#111827]">سياسات الصفحة العامة</h2>
            <p className="text-sm text-[#8a9199] mt-1">تظهر للعميلة أسفل الموقع، وتوافق عليها قبل تأكيد الحجز.</p>
          </div>
          {isAdmin && (
            <button type="button" onClick={onEdit} className="nura-chip nura-chip-lilac">
              <FaPen className="text-[11px]" /> تعديل السياسات
            </button>
          )}
        </div>
        <dl className="mt-4 space-y-4">
          {SITE_POLICIES.map((item) => {
            const saved = String(clinicInfo?.[item.key] || '').trim();
            const shown = policyText(clinicInfo, aptSettings, item);
            return (
              <div key={item.id}>
                <dt className="text-xs text-[#8a9199]">{item.label}</dt>
                <dd className="text-sm text-[#111827] mt-1 whitespace-pre-wrap">{shown || '—'}</dd>
                {!saved && shown && (
                  <p className="text-[11px] text-[#b45309] mt-1">هذا النص من قواعد المواعيد. احفظيه هنا ليصير من الموقع.</p>
                )}
              </div>
            );
          })}
        </dl>
      </section>
    );
  }

  return (
    <section className="saas-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-[#111827]">تعديل السياسات</h2>
        <button type="button" onClick={onCancel} className="nura-chip nura-chip-rose">
          <FaTimes className="text-[11px]" /> إلغاء
        </button>
      </div>
      {SITE_POLICIES.map((item) => (
        <label key={item.id} className="block">
          <span className="block text-sm font-bold text-[#111827] mb-1">{item.label}</span>
          <textarea
            rows={4}
            value={form[item.key] || ''}
            onChange={(e) => onChange(item.key, e.target.value)}
            className={`${field} resize-none`}
            placeholder={item.placeholder}
          />
        </label>
      ))}
      <button type="button" onClick={onSave} disabled={saving || !isAdmin} className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold disabled:opacity-60">
        {saving ? 'جاري الحفظ...' : 'حفظ السياسات'}
      </button>
    </section>
  );
}

const Website = () => {
  const { clinicId, clinicInfo, clinicPath, isAdmin } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = requestedTab === 'blog' || requestedTab === 'policies' ? requestedTab : 'info';
  const [services, setServices] = useState([]);
  const [blog, setBlog] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [blogModal, setBlogModal] = useState(false);
  const [blogForm, setBlogForm] = useState(emptyPost);
  const [editingPost, setEditingPost] = useState(null);
  const [aptSettings, setAptSettings] = useState(null);
  const [editingPolicies, setEditingPolicies] = useState(false);
  const [policyForm, setPolicyForm] = useState({});

  useEffect(() => {
    if (!clinicPath) return undefined;
    const u1 = onValue(ref(database, clinicPath('services')), (s) => {
      setServices(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u2 = onValue(ref(database, clinicPath('blog')), (s) => {
      setBlog(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u3 = onValue(ref(database, clinicPath('products')), (s) => {
      setProducts(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u4 = onValue(ref(database, clinicPath('appointmentSettings')), (s) => setAptSettings(s.val()));
    return () => { u1(); u2(); u3(); u4(); };
  }, [clinicPath]);

  const site = siteStatus({ clinicInfo, clinicId, services, blog });
  const showProducts = clinicInfo?.showProducts !== false;
  const showBlog = clinicInfo?.showBlog !== false;
  const goTab = (id) => setSearchParams(id === 'info' ? {} : { tab: id });

  const patchInfo = async (partial) => {
    if (!isAdmin || !clinicPath) {
      toast.error('التعديل لمالكة العيادة');
      return false;
    }
    setSaving(true);
    try {
      await update(ref(database, clinicPath('info')), partial);
      toast.success('حُفظ');
      return true;
    } catch {
      toast.error('تعذّر الحفظ');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openPost = (item) => {
    setEditingPost(item?.id || null);
    setBlogForm(item ? {
      title: item.title || '',
      content: item.content || '',
      imageUrl: item.imageUrl || '',
    } : emptyPost);
    setBlogModal(true);
  };

  const savePost = async (e) => {
    e.preventDefault();
    if (!isAdmin || !clinicPath) return;
    if (!blogForm.title.trim() || !blogForm.content.trim()) return toast.error('العنوان والمحتوى مطلوبان');
    const payload = {
      title: blogForm.title.trim(),
      content: blogForm.content.trim(),
      imageUrl: blogForm.imageUrl.trim(),
    };
    try {
      if (editingPost) {
        await update(ref(database, clinicPath(`blog/${editingPost}`)), { ...payload, updatedAt: Date.now() });
      } else {
        const row = push(ref(database, clinicPath('blog')));
        await set(row, { ...payload, createdAt: Date.now() });
      }
      toast.success(editingPost ? 'حُدّث المقال' : 'نُشر المقال');
      setBlogModal(false);
      setEditingPost(null);
      setBlogForm(emptyPost);
    } catch {
      toast.error('تعذّر الحفظ');
    }
  };

  const deletePost = async (id) => {
    if (!isAdmin || !window.confirm('حذف هذا المقال؟')) return;
    try {
      await remove(ref(database, clinicPath(`blog/${id}`)));
      toast.success('حُذف');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const copyUrl = () => {
    if (!site.url) return;
    navigator.clipboard.writeText(site.url);
    toast.success('تم نسخ الرابط');
  };

  if (requestedTab === 'products') return <Navigate to="/products" replace />;

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">موقع العيادة</h1>
          <p className="text-sm text-[#8a9199] mt-1">جاهزية الصفحة العامة، وسياسات العميلات، والمدونة. التصميم من إدارة المنصة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {site.url && (
            <button type="button" onClick={copyUrl} className="nura-chip nura-chip-sky">
              <FaCopy className="text-[11px]" /> نسخ الرابط
            </button>
          )}
          <a
            href={site.url || `/book/${clinicId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#10b981] text-white px-4 py-2.5 rounded-2xl text-sm font-bold"
          >
            <FaExternalLinkAlt className="text-[11px]" /> فتح الموقع
          </a>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button type="button" onClick={() => goTab('info')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'info' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>معلومات الموقع</button>
        <button type="button" onClick={() => goTab('policies')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'policies' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>السياسات</button>
        <button type="button" onClick={() => goTab('blog')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'blog' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>المدونة ({blog.length})</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">حالة النشر</p>
          <p className="stat-num text-[28px] leading-none mt-2">{site.published ? 'منشور' : 'ناقص'}</p>
          <p className="text-xs text-[#6b7280] mt-2">{site.ready}/{site.total} عناصر جاهزة</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">التصميم</p>
          <p className="stat-num text-[22px] leading-none mt-2">{site.theme}</p>
          <p className="text-xs text-[#6b7280] mt-2">من إدارة المنصة</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">المنتجات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{showProducts ? 'ظاهرة' : 'مخفية'}</p>
          <p className="text-xs text-[#6b7280] mt-2">{products.length} منتج</p>
        </div>
        <div className="saas-card stat-card-lilac p-4">
          <p className="text-xs text-[#6d28d9]">المدونة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{showBlog ? 'ظاهرة' : 'مخفية'}</p>
          <p className="text-xs text-[#6b7280] mt-2">{blog.length} مقال</p>
        </div>
      </div>

      {tab === 'info' && (
        <>
          <section className="saas-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#111827]">{clinicInfo?.name || 'اسم العيادة'}</h2>
                <p className="text-xs text-[#8a9199] mt-1 break-all" dir="ltr">{site.url || '—'}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clinicInfo?.whatsapp && <span className="nura-chip nura-chip-mint" dir="ltr">{clinicInfo.whatsapp}</span>}
                {clinicInfo?.phone && clinicInfo.phone !== clinicInfo.whatsapp && (
                  <span className="nura-chip nura-chip-sky" dir="ltr">{clinicInfo.phone}</span>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
              {site.checks.map((c) => (
                <div key={c.id} className={`rounded-2xl px-3 py-2.5 text-sm border ${c.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <span className={`nura-chip ${c.ok ? 'nura-chip-mint' : 'nura-chip-rose'}`}>{c.ok ? 'جاهز' : 'ناقص'}</span>
                  <span className="mr-2 text-[#111827]">{c.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/products" className="saas-card p-5 hover:border-emerald-200">
              <p className="font-bold text-[#111827]">المنتجات والطلبيات</p>
              <p className="text-xs text-[#8a9199] mt-1">الكتالوج وطلبات المتجر — منفصل عن الجلسات</p>
              <span className="nura-chip nura-chip-gold mt-3">{products.length} منتج</span>
            </Link>
            <Link to="/services" className="saas-card p-5 hover:border-emerald-200">
              <p className="font-bold text-[#111827]">جلسات الموقع</p>
              <p className="text-xs text-[#8a9199] mt-1">صفحات الخدمات العامة تُدار من قسم الخدمات</p>
              <span className="nura-chip nura-chip-sky mt-3">{services.length} خدمة</span>
            </Link>
          </div>

          <section className="saas-card p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-[#111827]">صفحات الخدمات</h2>
              <Link to="/services" className="text-xs font-bold text-emerald-700">إدارة الخدمات</Link>
            </div>
            {site.services.length === 0 ? (
              <p className="text-sm text-[#8a9199] py-6 text-center">لا خدمات بعد.</p>
            ) : (
              <div className="space-y-2">
                {site.services.map((s) => (
                  <div key={s.id} className="rounded-2xl bg-[#f8faf9] border border-[#e4eee8] px-4 py-3 flex justify-between gap-3 items-center">
                    <div>
                      <p className="font-bold text-[#111827]">{s.name}</p>
                      <p className="text-xs text-[#8a9199] mt-0.5">
                        {s.hasDesc ? 'فيها وصف' : 'بدون وصف'}{s.duration ? ` · ${s.duration}` : ''}
                      </p>
                    </div>
                    {clinicId && (
                      <a href={`/book/${clinicId}/service/${s.id}`} target="_blank" rel="noreferrer" className="nura-chip nura-chip-mint">الصفحة العامة</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'policies' && (
        <PoliciesEditor
          clinicInfo={clinicInfo}
          aptSettings={aptSettings}
          editing={editingPolicies}
          form={policyForm}
          saving={saving}
          isAdmin={isAdmin}
          onEdit={() => {
            const next = {};
            SITE_POLICIES.forEach((item) => { next[item.key] = policyText(clinicInfo, aptSettings, item); });
            setPolicyForm(next);
            setEditingPolicies(true);
          }}
          onCancel={() => setEditingPolicies(false)}
          onChange={(key, value) => setPolicyForm((prev) => ({ ...prev, [key]: value }))}
          onSave={async () => {
            const payload = {};
            SITE_POLICIES.forEach((item) => { payload[item.key] = String(policyForm[item.key] || '').trim(); });
            const ok = await patchInfo(payload);
            if (ok) setEditingPolicies(false);
          }}
        />
      )}

      {tab === 'blog' && (
        <div className="space-y-4">
          <div className="saas-card p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-[#111827]">إظهار المدونة على الموقع</p>
              <p className="text-xs text-[#8a9199] mt-1">{showBlog ? 'المدونة ظاهرة على صفحة الحجز' : 'المدونة مخفية. المقالات تبقى محفوظة'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showBlog}
              disabled={saving || !isAdmin}
              onClick={() => patchInfo({ showBlog: !showBlog })}
              className={`shrink-0 w-12 h-7 rounded-full ${showBlog ? 'bg-[#10b981]' : 'bg-stone-300'}`}
            >
              <span className={`block w-6 h-6 bg-white rounded-full shadow mt-0.5 transition ${showBlog ? 'mr-0.5' : 'mr-5'}`} />
            </button>
          </div>

          <div className="flex justify-between items-center gap-3">
            <h2 className="font-bold text-[#111827]">المقالات</h2>
            {isAdmin && (
              <button type="button" onClick={() => openPost()} className="flex items-center gap-2 bg-[#10b981] text-white px-4 py-2.5 rounded-2xl text-sm font-bold">
                <FaPlus /> مقال جديد
              </button>
            )}
          </div>

          {blog.length === 0 ? (
            <div className="saas-card text-center py-16">
              <h3 className="text-lg font-bold text-[#111827] mb-2">لا مقالات بعد</h3>
              <p className="text-sm text-[#8a9199]">أضيفي مقال إذا بدكِ مدونة على الموقع. مش إجباري.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {blog.map((p) => (
                <article key={p.id} className="saas-card p-4 flex flex-col">
                  <div className="h-36 rounded-2xl bg-[#f8faf9] border border-[#e4eee8] mb-3 overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <FaImage className="text-3xl text-emerald-300" />}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#111827]">{p.title}</p>
                      <p className="text-xs text-[#8a9199] mt-1 line-clamp-2">{p.content}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => openPost(p)} className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center"><FaPen className="text-xs" /></button>
                      <button type="button" onClick={() => deletePost(p.id)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center"><FaTrash className="text-xs" /></button>
                    </div>
                  </div>
                  {p.createdAt && (
                    <p className="text-[11px] text-[#8a9199] mt-3">{new Date(p.createdAt).toLocaleDateString('ar-IL')}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      <div className="lg:sticky lg:top-6 h-fit">
        <div className="flex items-center gap-2 mb-3">
          <FaDesktop className="text-emerald-600" />
          <h2 className="font-bold text-[#111827]">الصفحة المنشورة</h2>
        </div>
        <div className="saas-card overflow-hidden">
          <div className="bg-[#f8faf9] px-4 py-2.5 border-b border-[#e4eee8] text-[10px] text-[#8a9199] text-center truncate" dir="ltr">
            {site.url || '—'}
          </div>
          {clinicId && (
            <iframe src={`/book/${clinicId}`} title="الصفحة المنشورة" className="w-full h-[min(70vh,500px)] border-0 bg-[#f8faf9]" />
          )}
        </div>
      </div>
      </div>

      {blogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={savePost} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden" dir="rtl">
            <div className="bg-[#10b981] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingPost ? 'تعديل مقال' : 'مقال جديد'}</h3>
              <button type="button" onClick={() => setBlogModal(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaTimes /></button>
            </div>
            <div className="p-5 space-y-3">
              <input required value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} className={field} placeholder="عنوان المقال" />
              <input type="url" value={blogForm.imageUrl} onChange={(e) => setBlogForm({ ...blogForm, imageUrl: e.target.value })} className={field} placeholder="رابط صورة (اختياري)" dir="ltr" />
              <textarea required rows={6} value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} className={`${field} resize-none`} placeholder="نص المقال" />
              <button type="submit" className="w-full py-3 rounded-xl bg-[#10b981] text-white font-bold">حفظ المقال</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Website;
