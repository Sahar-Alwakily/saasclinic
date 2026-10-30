import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { toast, ToastContainer } from 'react-toastify';
import {
  FaBoxOpen, FaPlus, FaPen, FaTrash, FaTimes, FaPhone, FaMapMarkerAlt,
  FaCheckCircle, FaTimesCircle, FaTruck,
} from 'react-icons/fa';

const emptyProduct = { title: '', category: 'beauty', price: '', imageUrl: '' };
const field = 'w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200';

const STATUS = {
  pending: { label: 'بانتظار التأكيد', chip: 'nura-chip-gold' },
  confirmed: { label: 'مؤكد', chip: 'nura-chip-mint' },
  delivered: { label: 'تم التوصيل', chip: 'nura-chip-sky' },
  cancelled: { label: 'ملغي', chip: 'nura-chip-rose' },
};

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

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">المنتجات</h1>
          <p className="text-sm text-[#8a9199] mt-1">كتالوج المتجر وطلبيات العميلات — منفصل عن جلسات العيادة.</p>
        </div>
        {tab === 'catalog' && isAdmin && (
          <button type="button" onClick={() => openProduct()} className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2.5 rounded-2xl font-bold">
            <FaPlus /> منتج جديد
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        <button type="button" onClick={() => goTab('catalog')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'catalog' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>الكتالوج</button>
        <button type="button" onClick={() => goTab('orders')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'orders' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>الطلبيات ({orders.length})</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">المنتجات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{products.length}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">بانتظار التأكيد</p>
          <p className="stat-num text-[28px] leading-none mt-2">{stats.pending}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">مؤكدة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{stats.confirmed}</p>
        </div>
        <div className="saas-card stat-card-lilac p-4">
          <p className="text-xs text-[#6d28d9]">تم التوصيل</p>
          <p className="stat-num text-[28px] leading-none mt-2">{stats.delivered}</p>
        </div>
      </div>

      {tab === 'catalog' && (
        <>
          <div className="saas-card p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-[#111827]">إظهار المنتجات على الموقع</p>
              <p className="text-xs text-[#8a9199] mt-1">{showProducts ? 'القسم ظاهر على صفحة الحجز' : 'القسم مخفي. المنتجات والطلبيات تبقى محفوظة'}</p>
              <Link to="/website" className="text-xs font-bold text-emerald-700 mt-2 inline-block">إعدادات الموقع</Link>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showProducts}
              disabled={saving || !isAdmin}
              onClick={() => patchInfo({ showProducts: !showProducts })}
              className={`shrink-0 w-12 h-7 rounded-full ${showProducts ? 'bg-[#10b981]' : 'bg-stone-300'}`}
            >
              <span className={`block w-6 h-6 bg-white rounded-full shadow mt-0.5 transition ${showProducts ? 'mr-0.5' : 'mr-5'}`} />
            </button>
          </div>

          {products.length === 0 ? (
            <div className="saas-card text-center py-16">
              <h3 className="text-lg font-bold text-[#111827] mb-2">لا منتجات بعد</h3>
              <p className="text-sm text-[#8a9199]">أضيفي منتج عناية إذا بدكِ متجر على الموقع.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p) => (
                <article key={p.id} className="saas-card p-4 flex flex-col">
                  <div className="h-36 rounded-2xl bg-[#f8faf9] border border-[#e4eee8] mb-3 overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <FaBoxOpen className="text-3xl text-emerald-300" />}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#111827]">{p.title || p.name}</p>
                      <p className="text-lg font-bold text-emerald-700 mt-1">{Number(p.price || 0).toLocaleString('ar')} ₪</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openProduct(p)} className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center"><FaPen className="text-xs" /></button>
                      <button type="button" onClick={() => deleteProduct(p.id)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center"><FaTrash className="text-xs" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="saas-card text-center py-16">
            <h3 className="text-lg font-bold text-[#111827] mb-2">لا طلبيات بعد</h3>
            <p className="text-sm text-[#8a9199]">عندما تطلب عميلة من متجر الموقع، يظهر الطلب هنا.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusOf(order);
              const st = STATUS[status] || STATUS.pending;
              const info = order.customerInfo || {};
              const items = Array.isArray(order.items) ? order.items : [];
              return (
                <article key={order.id} className="saas-card p-5">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-[#e4eee8]">
                    <div>
                      <h3 className="font-bold text-lg text-[#111827]">{info.name || 'عميلة'}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[#8a9199] mt-1">
                        {info.phone && <span className="flex items-center gap-1" dir="ltr"><FaPhone className="text-[11px]" /> {info.phone}</span>}
                        {info.address && <span className="flex items-center gap-1"><FaMapMarkerAlt className="text-[11px]" /> {info.address}</span>}
                      </div>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-xs text-[#8a9199]">{order.createdAt ? new Date(order.createdAt).toLocaleString('ar-IL') : ''}</p>
                      <span className={`nura-chip ${st.chip}`}>{st.label}</span>
                      {order.paymentStatus === 'paid' && <span className="nura-chip nura-chip-mint mr-1">مدفوع</span>}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-[#111827]">{item.title} <span className="text-[#8a9199] text-xs">×{item.qty}</span></span>
                        <span className="font-bold">{(Number(item.price) || 0) * (Number(item.qty) || 0)} ₪</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-[#e4eee8]">
                    <p className="text-lg font-bold text-[#111827]">
                      المجموع: <span className="text-emerald-700">{order.total} ₪</span>
                    </p>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      {status === 'pending' && (
                        <button type="button" onClick={() => handleUpdateStatus(order.id, 'confirmed')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#10b981] text-white rounded-xl text-sm font-bold">
                          <FaCheckCircle /> تأكيد
                        </button>
                      )}
                      {status === 'confirmed' && (
                        <button type="button" onClick={() => handleUpdateStatus(order.id, 'delivered')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold">
                          <FaTruck /> تم التوصيل
                        </button>
                      )}
                      {status !== 'cancelled' && status !== 'delivered' && (
                        <button type="button" onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold">
                          <FaTimesCircle /> إلغاء
                        </button>
                      )}
                      {order.paymentStatus !== 'paid' && status !== 'cancelled' && (
                        <button type="button" onClick={() => markPaid(order.id)} className="flex-1 md:flex-none px-4 py-2 bg-[#111827] text-white rounded-xl text-sm font-bold">
                          تسجيل الدفع
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveProduct} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden" dir="rtl">
            <div className="bg-[#10b981] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingId ? 'تعديل منتج' : 'منتج جديد'}</h3>
              <button type="button" onClick={() => setModal(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaTimes /></button>
            </div>
            <div className="p-5 space-y-3">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} placeholder="اسم المنتج" />
              <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={field} placeholder="السعر ₪" dir="ltr" />
              <input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={field} placeholder="رابط صورة (اختياري)" dir="ltr" />
              <button type="submit" className="w-full py-3 rounded-xl bg-[#10b981] text-white font-bold">حفظ المنتج</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Products;
