import React, { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { siteStatus } from '../utils/clinicInsights';
import { SITE_POLICIES, policyText } from '../utils/sitePolicies';
import { toast, ToastContainer } from 'react-toastify';
import { FaPen, FaTimes, FaTrash, FaCopy } from 'react-icons/fa';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]';
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[13px] font-bold text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]';
const emptyPost = { title: '', content: '', imageUrl: '' };
const THEME_LABEL = { beauty: 'تجميل', elegant: 'أنيق', minimal: 'بسيط' };

function durationLabel(value) {
  const text = String(value || '').trim();
  if (!text) return 'غير محددة';
  if (/دقيقة|ساعة/.test(text)) return text;
  if (/^\d+$/.test(text)) return `${text} دقيقة`;
  return text;
}

function PoliciesEditor({ clinicInfo, aptSettings, editing, form, saving, isAdmin, onEdit, onCancel, onChange, onSave }) {
  if (!editing) {
    return (
      <section className="rounded-xl border border-[#E4EAEE] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-extrabold">سياسات الصفحة العامة</h2>
            <p className="mt-1 text-[12.5px] text-[#64748B]">تظهر للعميلة أسفل الموقع، وتوافق عليها قبل تأكيد الحجز.</p>
          </div>
          {isAdmin && (
            <button type="button" onClick={onEdit} className={ghost}>تعديل السياسات</button>
          )}
        </div>
        <dl className="mt-4 space-y-3">
          {SITE_POLICIES.map((item) => {
            const saved = String(clinicInfo?.[item.key] || '').trim();
            const shown = policyText(clinicInfo, aptSettings, item);
            return (
              <div key={item.id} className="border-t border-[#EDF1F4] pt-3">
                <dt className="text-[11px] font-bold text-[#94A3B8]">{item.label}</dt>
                <dd className={`mt-1 whitespace-pre-wrap text-[13px] ${shown ? 'text-[#0F172A]' : 'font-bold text-[#B45309]'}`}>{shown || 'لا نص محفوظ'}</dd>
                {!saved && shown && (
                  <p className="mt-1 text-[11px] text-[#B45309]">هذا النص من قواعد المواعيد. احفظيه هنا ليصير من الموقع.</p>
                )}
              </div>
            );
          })}
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#E4EAEE] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">تعديل السياسات</h2>
        <button type="button" onClick={onCancel} className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-bold text-[#DC2626]">إلغاء</button>
      </div>
      {SITE_POLICIES.map((item) => (
        <label key={item.id} className="block">
          <span className="mb-1 block text-[12.5px] font-bold text-[#334155]">{item.label}</span>
          <textarea
            rows={4}
            value={form[item.key] || ''}
            onChange={(e) => onChange(item.key, e.target.value)}
            className={`${field} resize-none`}
            placeholder={item.placeholder}
          />
        </label>
      ))}
      <button type="button" onClick={onSave} disabled={saving || !isAdmin} className={`${primary} disabled:opacity-60`}>
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

  const kpis = [
    { label: 'الجاهزية', value: `${site.ready}/${site.total}`, note: site.published ? 'الموقع منشور' : 'النشر ناقص', accent: site.published ? '#059669' : '#B45309' },
    { label: 'التصميم', value: THEME_LABEL[site.theme] || site.theme || 'غير محدد', note: 'من إدارة المنصة', accent: '#0FA3A3' },
    { label: 'المنتجات', value: String(products.length), note: showProducts ? 'ظاهرة على الموقع' : 'مخفية عن الموقع', accent: '#059669' },
    { label: 'المدونة', value: String(blog.length), note: showBlog ? 'ظاهرة على الموقع' : 'مخفية عن الموقع', accent: '#0FA3A3' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الصفحة العامة</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">موقع العيادة</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">جاهزية الصفحة، وسياسات العميلات، والمدونة. التصميم من إدارة المنصة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {site.url && (
            <button type="button" onClick={copyUrl} className={ghost}><FaCopy className="text-[11px]" /> نسخ الرابط</button>
          )}
          <a href={site.url || `/book/${clinicId}`} target="_blank" rel="noreferrer" className={primary}>فتح الموقع</a>
        </div>
      </header>

      <div className="flex gap-1.5">
        <button type="button" onClick={() => goTab('info')} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${tab === 'info' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>معلومات الموقع</button>
        <button type="button" onClick={() => goTab('policies')} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${tab === 'policies' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>السياسات</button>
        <button type="button" onClick={() => goTab('blog')} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${tab === 'blog' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>المدونة {blog.length}</button>
      </div>

      <section aria-label="مؤشرات الموقع" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={['px-5 py-4', i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '', i > 1 ? 'border-t border-[#E4EAEE] lg:border-t-0' : '', i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : ''].join(' ')}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />{k.label}</p>
            <p className="mt-2 text-[28px] font-light leading-none tracking-tight">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">

      {tab === 'info' && (
        <>
          <section className="rounded-xl border border-[#E4EAEE] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-extrabold">{clinicInfo?.name || 'اسم العيادة'}</h2>
                <p className="mt-1 break-all text-[12px] text-[#64748B]" dir="ltr">{site.url || 'لا رابط بعد'}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-2.5 py-1 text-[#0E7490]" dir="ltr">واتساب {clinicInfo?.whatsapp || '—'}</span>
                {clinicInfo?.phone && clinicInfo.phone !== clinicInfo.whatsapp && (
                  <span className="rounded-full border border-[#E4EAEE] bg-[#F4F7F8] px-2.5 py-1 text-[#334155]" dir="ltr">هاتف {clinicInfo.phone}</span>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {site.checks.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2">
                  <span className="text-[12.5px] font-bold">{c.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${c.ok ? 'border-[#C9EEE0] bg-[#ECFDF5] text-[#047857]' : 'border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]'}`}>{c.ok ? 'جاهز' : 'ناقص'}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <Link to="/products" className="rounded-lg border border-[#E4EAEE] bg-white p-4 hover:border-[#0FA3A3]">
              <p className="text-[13px] font-extrabold">المنتجات والطلبيات</p>
              <p className="mt-1 text-[12px] text-[#64748B]">الكتالوج وطلبات المتجر، منفصل عن الجلسات.</p>
              <p className="mt-3 text-[12px]"><span className="text-[#94A3B8]">العدد </span><span className="font-bold">{products.length} منتج</span></p>
            </Link>
            <Link to="/services" className="rounded-lg border border-[#E4EAEE] bg-white p-4 hover:border-[#0FA3A3]">
              <p className="text-[13px] font-extrabold">جلسات الموقع</p>
              <p className="mt-1 text-[12px] text-[#64748B]">صفحات الخدمات العامة تُدار من قسم الخدمات.</p>
              <p className="mt-3 text-[12px]"><span className="text-[#94A3B8]">العدد </span><span className="font-bold">{services.length} خدمة</span></p>
            </Link>
          </div>

          <section className="rounded-xl border border-[#E4EAEE] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">صفحات الخدمات</h2>
              <Link to="/services" className="text-[12px] font-bold text-[#0FA3A3] hover:text-[#059669]">إدارة الخدمات</Link>
            </div>
            {site.services.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#64748B]">لا خدمات بعد.</p>
            ) : (
              <div className="space-y-2">
                {site.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold">{s.name}</p>
                      <p className="mt-1 text-[11.5px] text-[#64748B]">
                        <span className="text-[#94A3B8]">الوصف </span>{s.hasDesc ? 'موجود' : 'بدون وصف'}
                        <span className="mx-1.5 text-[#E4EAEE]">·</span>
                        <span className="text-[#94A3B8]">المدة </span>{durationLabel(s.duration)}
                      </p>
                    </div>
                    {clinicId && (
                      <a href={`/book/${clinicId}/service/${s.id}`} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-[#E4EAEE] bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-[#0E7490] hover:border-[#0FA3A3]">الصفحة العامة</a>
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
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E4EAEE] bg-white px-4 py-3">
            <div>
              <p className="text-[13px] font-bold">إظهار المدونة على الموقع</p>
              <p className="mt-1 text-[12px] text-[#64748B]">{showBlog ? 'المدونة ظاهرة على صفحة الحجز' : 'المدونة مخفية. المقالات تبقى محفوظة'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showBlog}
              disabled={saving || !isAdmin}
              onClick={() => patchInfo({ showBlog: !showBlog })}
              className={`h-7 w-12 shrink-0 rounded-full ${showBlog ? 'bg-[#059669]' : 'bg-[#E4EAEE]'}`}
            >
              <span className={`mt-0.5 block h-6 w-6 rounded-full bg-white shadow transition ${showBlog ? 'mr-0.5' : 'mr-5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-extrabold">المقالات</h2>
            {isAdmin && (
              <button type="button" onClick={() => openPost()} className={primary}>+ مقال جديد</button>
            )}
          </div>

          {blog.length === 0 ? (
            <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-16 text-center">
              <h3 className="text-[15px] font-bold">لا مقالات بعد</h3>
              <p className="mt-1 text-[12.5px] text-[#64748B]">أضيفي مقال إذا بدك مدونة على الموقع. مش إجباري.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {blog.map((p) => (
                <article key={p.id} className="rounded-lg border border-[#E4EAEE] bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14px] font-extrabold">{p.title || 'مقال بلا عنوان'}</h3>
                    {isAdmin && (
                      <div className="flex shrink-0 gap-1.5">
                        <button type="button" onClick={() => openPost(p)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] bg-white text-[#0E7490]" aria-label="تعديل المقال"><FaPen className="text-[11px]" /></button>
                        <button type="button" onClick={() => deletePost(p.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]" aria-label="حذف المقال"><FaTrash className="text-[11px]" /></button>
                      </div>
                    )}
                  </div>
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="mt-3 h-28 w-full rounded-lg border border-[#E4EAEE] object-cover" />}
                  <p className="mt-3 line-clamp-2 text-[12.5px] text-[#64748B]"><span className="text-[#94A3B8]">المقتطف </span>{p.content || 'بدون نص'}</p>
                  <p className="mt-2 text-[11.5px] text-[#64748B]"><span className="text-[#94A3B8]">تاريخ النشر </span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar') : 'غير مؤرخ'}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      <div className="h-fit lg:sticky lg:top-6 lg:col-span-5">
        <h2 className="mb-3 text-[13px] font-extrabold">الصفحة المنشورة</h2>
        <div className="overflow-hidden rounded-xl border border-[#E4EAEE] bg-white">
          <div className="truncate border-b border-[#E4EAEE] bg-[#F8FBFC] px-4 py-2.5 text-center text-[11px] text-[#64748B]" dir="ltr">
            {site.url || 'لا رابط بعد'}
          </div>
          {clinicId && (
            <iframe src={`/book/${clinicId}`} title="الصفحة المنشورة" className="h-[min(70vh,560px)] w-full border-0 bg-[#F4F7F8]" />
          )}
        </div>
      </div>
      </div>

      {blogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={savePost} className="w-full max-w-lg overflow-hidden rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-4">
              <h3 className="text-[16px] font-extrabold">{editingPost ? 'تعديل مقال' : 'مقال جديد'}</h3>
              <button type="button" onClick={() => setBlogModal(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#64748B]" aria-label="إغلاق"><FaTimes className="text-[11px]" /></button>
            </div>
            <div className="space-y-3 p-5">
              <input required value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} className={field} placeholder="عنوان المقال" />
              <input type="url" value={blogForm.imageUrl} onChange={(e) => setBlogForm({ ...blogForm, imageUrl: e.target.value })} className={field} placeholder="رابط صورة (اختياري)" dir="ltr" />
              <textarea required rows={6} value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} className={`${field} resize-none`} placeholder="نص المقال" />
              <button type="submit" className={primary}>حفظ المقال</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Website;
