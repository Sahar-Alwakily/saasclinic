import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaShoppingBag, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaTruck } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const Orders = () => {
  const { clinicPath } = useClinic();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicPath) return;
    const ordersRef = ref(database, clinicPath('orders'));
    
    const unsub = onValue(ordersRef, (snap) => {
      const val = snap.val();
      const list = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })).sort((a, b) => b.createdAt - a.createdAt) : [];
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await update(ref(database, clinicPath(`orders/${orderId}`)), { status: newStatus });
      toast.success('تم تحديث حالة الطلب');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ToastContainer position="top-left" rtl />

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">الطلبات (المتجر)</h1>
        <p className="text-gray-500 text-sm mt-1">إدارة طلبات المنتجات التي تأتي من واجهة المتجر</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 text-center py-20">
          <div className="text-5xl mb-4">🛒</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد طلبات بعد</h3>
          <p className="text-gray-500 text-sm">عندما يطلب العميل منتجات من الواجهة، ستظهر هنا.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">{order.customerInfo.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1" dir="ltr"><FaPhone /> {order.customerInfo.phone}</span>
                    <span className="flex items-center gap-1"><FaMapMarkerAlt /> {order.customerInfo.address}</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400 mb-1">{new Date(order.createdAt).toLocaleString('ar-IL')}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'delivered' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {order.status === 'pending' ? 'بانتظار التأكيد' : order.status === 'confirmed' ? 'تم التأكيد' : order.status === 'delivered' ? 'تم التوصيل' : 'ملغي'}
                  </span>
                </div>
              </div>

              {/* المنتجات */}
              <div className="space-y-2 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{item.title} <span className="text-gray-400 text-xs">x{item.qty}</span></span>
                    <span className="font-bold text-gray-800 dark:text-white">{item.price * item.qty} ₪</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  المجموع: <span className="text-pink-600">{order.total} ₪</span>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  {order.status === 'pending' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'confirmed')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition">
                      <FaCheckCircle /> تأكيد الطلب
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'delivered')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition">
                      <FaTruck /> تم التوصيل
                    </button>
                  )}
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-100 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-200 transition">
                      <FaTimesCircle /> إلغاء
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;