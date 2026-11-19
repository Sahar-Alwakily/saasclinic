import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import { FaPen, FaTrash, FaTimes } from 'react-icons/fa';

const emptyProduct = { title: '', category: 'beauty', price: '', imageUrl: '' };
const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#047857]';

const STATUS = {
  pending: { label: 'بانتظار التأكيد', box: 'border-[#F6E4C4] bg-[#FFFBEB] text-[#B45309]', accent: '#B45309' },
  confirmed: { label: 'مؤكد', box: 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]', accent: '#0FA3A3' },
  delivered: { label: 'تم التوصيل', box: 'border-[#C9EEE0] bg-[#ECFDF5] text-[#047857]', accent: '#059669' },
  cancelled: { label: 'ملغي', box: 'border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]', accent: '#DC2626' },
};

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('ar')} شيكل`;
}

const Products = () => {
  const { clinicPath, clinicInfo, isAdmin } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'orders' ? 'orders' : 'catalog';
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!clinicPath) {
      setLoading(false);
      return undefined;
    }
    const u1 = onValue(ref(database, clinicPath('products')), (s) => {
      setProducts(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u2 = onValue(ref(database, clinicPath('orders')), (s) => {
      const list = s.val()
        ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        : [];
      setOrders(list);
      setLoading(false);
    });
    return () => { u1(); u2(); };
  }, [clinicPath]);

  const goTab = (id) => setSearchParams(id === 'catalog' ? {} : { tab: 'orders' });
  const showProducts = clinicInfo?.showProducts !== false;

  const statusOf = (o) => (STATUS[o.status] ? o.status : 'pending');

  const stats = useMemo(() => ({
    pending: orders.filter((o) => (STATUS[o.status] ? o.status : 'pending') === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  }), [orders]);

  const openProduct = (item) => {
    setEditingId(item?.id || null);
    setForm(item ? {
      title: item.title || item.name || '',
      category: item.category || 'beauty',
      price: item.price ?? '',
      imageUrl: item.imageUrl || '',
    } : emptyProduct);
    setModal(true);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin || !clinicPath) return toast.error('التعديل لمالكة العيادة');
    if (!form.title.trim()) return toast.error('اسم المنتج مطلوب');
    if (form.price === '' || Number.isNaN(Number(form.price))) return toast.error('السعر مطلوب');
    const payload = {
      title: form.title.trim(),
      category: form.category,
      price: Number(form.price),
      imageUrl: form.imageUrl.trim(),
    };
    try {
      if (editingId) {
        await update(ref(database, clinicPath(`products/${editingId}`)), { ...payload, updatedAt: Date.now() });
      } else {
        const row = push(ref(database, clinicPath('products')));
        await set(row, { ...payload, createdAt: Date.now() });
      }
      toast.success(editingId ? 'حُدّث المنتج' : 'أُضيف المنتج');
      setModal(false);
      setEditingId(null);
      setForm(emptyProduct);
    } catch {
      toast.error('تعذّر الحفظ');
    }
  };

  const deleteProduct = async (id) => {
    if (!isAdmin || !window.confirm('حذف هذا المنتج؟')) return;
    try {
      await remove(ref(database, clinicPath(`products/${id}`)));
      toast.success('حُذف');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const patchInfo = async (partial) => {
    if (!isAdmin || !clinicPath) return toast.error('التعديل لمالكة العيادة');
    setSaving(true);
    try {
      await update(ref(database, clinicPath('info')), partial);
      toast.success('حُفظ');
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const deliveryStatus = newStatus === 'delivered' ? 'delivered' : newStatus === 'cancelled' ? 'cancelled' : newStatus === 'confirmed' ? 'confirmed' : 'pending';
      const extra = { status: newStatus, deliveryStatus, updatedAt: Date.now() };
      await update(ref(database, clinicPath(`orders/${orderId}`)), extra);
      await update(ref(database, `platform/productOrders/${orderId}`), extra);
      toast.success('تم تحديث حالة الطلب');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const markPaid = async (orderId) => {
    try {
      const extra = { paymentStatus: 'paid', paidAt: Date.now(), updatedAt: Date.now() };
      await update(ref(database, clinicPath(`orders/${orderId}`)), extra);
      await update(ref(database, `platform/productOrders/${orderId}`), extra);
      toast.success('سُجّل الدفع');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const kpis = [
    { label: 'المنتجات', value: String(products.length), note: 'في الكتالوج', accent: '#059669' },
    { label: 'بانتظار التأكيد', value: String(stats.pending), note: 'طلبيات جديدة', accent: '#B45309' },
    { label: 'مؤكدة', value: String(stats.confirmed), note: 'بانتظار التوصيل', accent: '#0FA3A3' },
    { label: 'تم التوصيل', value: String(stats.delivered), note: 'طلبيات مغلقة', accent: '#059669' },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E4EAEE] border-t-[#059669]" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">متجر العيادة</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">المنتجات</h1>
          <p className="mt-1 text-[12.5px] text-[#64748B]">الكتالوج يعرض الاسم والسعر. الطلبيات تعرض الحالة والمجموع.</p>
        </div>
        {tab === 'catalog' && isAdmin && (
          <button type="button" onClick={() => openProduct()} className={primary}>+ منتج جديد</button>
        )}
      </header>

      <div className="flex gap-1.5">
        <button type="button" onClick={() => goTab('catalog')} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${tab === 'catalog' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>الكتالوج {products.length}</button>
        <button type="button" onClick={() => goTab('orders')} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${tab === 'orders' ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]' : 'border-[#E4EAEE] bg-white text-[#334155]'}`}>الطلبيات {orders.length}</button>
      </div>

      <section aria-label="مؤشرات المتجر" className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={['px-5 py-4', i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '', i > 1 ? 'border-t border-[#E4EAEE] lg:border-t-0' : '', i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : ''].join(' ')}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: k.accent }} />{k.label}</p>
            <p className="mt-2 text-[32px] font-light leading-none tabular-nums tracking-tight">{k.value}</p>
            <p className="mt-2 text-[11px] text-[#94A3B8]">{k.note}</p>
            <span className="mt-2 block h-[2px] w-10 rounded-full" style={{ background: k.accent }} />
          </div>
        ))}
      </section>

      {tab === 'catalog' && (
        <>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E4EAEE] bg-white px-4 py-3">
            <div>
              <p className="text-[13px] font-bold">إظهار المنتجات على الموقع</p>
              <p className="mt-1 text-[12px] text-[#64748B]">{showProducts ? 'القسم ظاهر على صفحة الحجز' : 'القسم مخفي. المنتجات والطلبيات تبقى محفوظة'}</p>
              <Link to="/website" className="mt-1 inline-block text-[12px] font-bold text-[#0FA3A3] hover:text-[#059669]">إعدادات الموقع</Link>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showProducts}
              disabled={saving || !isAdmin}
              onClick={() => patchInfo({ showProducts: !showProducts })}
              className={`h-7 w-12 shrink-0 rounded-full ${showProducts ? 'bg-[#059669]' : 'bg-[#E4EAEE]'}`}
            >
              <span className={`mt-0.5 block h-6 w-6 rounded-full bg-white shadow transition ${showProducts ? 'mr-0.5' : 'mr-5'}`} />
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-16 text-center">
              <h3 className="text-[15px] font-bold">لا منتجات بعد</h3>
              <p className="mt-1 text-[12.5px] text-[#64748B]">أضيفي منتج عناية إذا بدك متجر على الموقع.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <article key={p.id} className="rounded-lg border border-[#E4EAEE] bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-extrabold">{p.title || p.name || 'منتج بلا اسم'}</h3>
                    {isAdmin && (
                      <div className="flex shrink-0 gap-1.5">
                        <button type="button" onClick={() => openProduct(p)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] bg-white text-[#0E7490]" aria-label="تعديل المنتج"><FaPen className="text-[11px]" /></button>
                        <button type="button" onClick={() => deleteProduct(p.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] text-[#DC2626]" aria-label="حذف المنتج"><FaTrash className="text-[11px]" /></button>
                      </div>
                    )}
                  </div>
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="mt-3 h-28 w-full rounded-lg border border-[#E4EAEE] object-cover" />}
                  <dl className="mt-3 border-t border-[#EDF1F4] pt-3">
                    <div className="flex items-center justify-between gap-3 text-[12.5px]">
                      <dt className="text-[#94A3B8]">السعر</dt>
                      <dd className={`font-bold ${p.price === '' || p.price == null ? 'text-[#B45309]' : 'text-[#0F172A]'}`}>{p.price === '' || p.price == null ? 'غير مسعّر' : money(p.price)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="rounded-xl border border-[#E4EAEE] bg-white px-4 py-16 text-center">
            <h3 className="text-[15px] font-bold">لا طلبيات بعد</h3>
            <p className="mt-1 text-[12.5px] text-[#64748B]">عندما تطلب عميلة من متجر الموقع، يظهر الطلب هنا.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = statusOf(order);
              const st = STATUS[status] || STATUS.pending;
              const info = order.customerInfo || {};
              const items = Array.isArray(order.items) ? order.items : [];
              const paid = order.paymentStatus === 'paid';
              return (
                <article key={order.id} className="relative overflow-hidden rounded-lg border border-[#E4EAEE] bg-white px-4 py-3">
                  <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: st.accent }} />
                  <div className="flex flex-wrap items-start justify-between gap-3 ps-1.5">
                    <div>
                      <h3 className="text-[15px] font-extrabold">{info.name || 'عميلة'}</h3>
                      <p className="mt-1 text-[12px] text-[#64748B]">
                        <span className="text-[#94A3B8]">الهاتف </span><span dir="ltr">{info.phone || '—'}</span>
                        <span className="mx-1.5 text-[#E4EAEE]">·</span>
                        <span className="text-[#94A3B8]">العنوان </span>{info.address || '—'}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[11px] text-[#94A3B8]">{order.createdAt ? new Date(order.createdAt).toLocaleString('ar') : ''}</p>
                      <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${st.box}`}>{st.label}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${paid ? 'border-[#C9EEE0] bg-[#ECFDF5] text-[#047857]' : 'border-[#E4EAEE] bg-[#F4F7F8] text-[#64748B]'}`}>{paid ? 'مدفوع' : 'غير مدفوع'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-[#EDF1F4] ps-1.5 pt-3">
                    {items.length === 0 && <p className="text-[12.5px] text-[#94A3B8]">لا بنود في الطلب</p>}
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-[12.5px]">
                        <span>{item.title || 'منتج'} <span className="text-[#94A3B8]">×{item.qty || 0}</span></span>
                        <span className="font-bold tabular-nums">{money((Number(item.price) || 0) * (Number(item.qty) || 0))}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 border-t border-[#EDF1F4] pt-2 text-[13px]">
                      <span className="text-[#94A3B8]">المجموع</span>
                      <span className="font-extrabold tabular-nums">{money(order.total)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 ps-1.5">
                    {status === 'pending' && (
                      <button type="button" onClick={() => handleUpdateStatus(order.id, 'confirmed')} className={primary}>تأكيد</button>
                    )}
                    {status === 'confirmed' && (
                      <button type="button" onClick={() => handleUpdateStatus(order.id, 'delivered')} className={primary}>تم التوصيل</button>
                    )}
                    {status !== 'cancelled' && status !== 'delivered' && (
                      <button type="button" onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-2 text-[12.5px] font-bold text-[#DC2626]">إلغاء</button>
                    )}
                    {!paid && status !== 'cancelled' && (
                      <button type="button" onClick={() => markPaid(order.id)} className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-2 text-[12.5px] font-bold text-[#334155] hover:border-[#0FA3A3] hover:text-[#0E7490]">تسجيل الدفع</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveProduct} className="w-full max-w-lg overflow-hidden rounded-xl border border-[#E4EAEE] bg-white" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-4">
              <h3 className="text-[16px] font-extrabold">{editingId ? 'تعديل منتج' : 'منتج جديد'}</h3>
              <button type="button" onClick={() => setModal(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#64748B]" aria-label="إغلاق"><FaTimes className="text-[11px]" /></button>
            </div>
            <div className="space-y-3 p-5">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} placeholder="اسم المنتج" />
              <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={field} placeholder="السعر بالشيكل" dir="ltr" />
              <input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={field} placeholder="رابط صورة (اختياري)" dir="ltr" />
              <button type="submit" className={primary}>حفظ المنتج</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Products;
