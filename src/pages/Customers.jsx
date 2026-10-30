import React, { useMemo, useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { FaPlus, FaBirthdayCake, FaTrash, FaPen, FaEye } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import CustomerFormModal from '../components/customers/CustomerFormModal';

const Customers = () => {
  const { clinicPath } = useClinic();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const custPath = clinicPath?.('customers');
    if (!custPath) {
      setLoading(false);
      return undefined;
    }
    const unsub = onValue(ref(database, custPath), (snap) => {
      const val = snap.val();
      setCustomers(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath]);

  const persist = async (form) => {
    if (!form.firstName || !form.phone) {
      toast.error('الاسم الأول ورقم الهاتف مطلوبان');
      return;
    }
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName || '',
      phone: form.phone,
      birthDate: form.birthDate || '',
      idNumber: form.idNumber || '',
      gender: form.gender || 'female',
      medicalInfo: form.medicalInfo || {},
      adsStamp: form.adsStamp || null,
      updatedAt: Date.now(),
    };
    try {
      if (editing?.id) {
        await update(ref(database, clinicPath(`customers/${editing.id}`)), payload);
        toast.success('عُدّل الملف');
      } else {
        const newCustRef = push(ref(database, clinicPath('customers')));
        await set(newCustRef, {
          ...payload,
          createdAt: Date.now(),
          sessions: [],
          treatments: {},
        });
        toast.success('تم إضافة العميلة بنجاح!');
      }
      setShowModal(false);
      setEditing(null);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه العميلة؟')) return;
    try {
      await remove(ref(database, clinicPath(`customers/${id}`)));
      toast.success('تم الحذف بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  });

  const stats = useMemo(() => {
    let withSessions = 0;
    let withTreatments = 0;
    let afterCare = 0;
    customers.forEach((c) => {
      if ((c.sessions || []).length) withSessions += 1;
      const treatObj = c.treatments || {};
      const keys = Object.keys(treatObj);
      if (keys.length) withTreatments += 1;
      afterCare += Object.values(treatObj).filter((t) => t.currentPhase === 'after').length;
    });
    return { withSessions, withTreatments, afterCare };
  }, [customers]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981]" /></div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <ToastContainer position="top-left" rtl />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">العميلات</h1>
          <p className="text-sm text-[#8a9199] mt-1">ملفات العميلات، الجلسات، والعلاجات.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#10b981] text-white px-5 py-2.5 rounded-2xl font-bold"
        >
          <FaPlus /> عميلة جديدة
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-xs text-[#047857]">العميلات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{customers.length}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-xs text-[#0369a1]">لديهن جلسات</p>
          <p className="stat-num text-[28px] leading-none mt-2">{stats.withSessions}</p>
        </div>
        <div className="saas-card stat-card-lilac p-4">
          <p className="text-xs text-[#6d28d9]">علاجات نشطة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{stats.withTreatments}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-xs text-[#b45309]">بعد العلاج</p>
          <p className="stat-num text-[28px] leading-none mt-2">{stats.afterCare}</p>
        </div>
      </div>

      <div className="saas-card p-2">
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-transparent outline-none text-sm"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="saas-card text-center py-16">
          <h3 className="text-lg font-bold text-[#111827] mb-2">لا توجد نتائج</h3>
          <p className="text-sm text-[#8a9199]">لم يتم العثور على عميلات مطابقات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const treatObj = cust.treatments || {};
            const treatCount = Object.keys(treatObj).length;
            const afterCount = Object.values(treatObj).filter((t) => t.currentPhase === 'after').length;
            return (
              <article key={cust.id} className="saas-card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold shrink-0">
                      {cust.firstName?.charAt(0) || '؟'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#111827] truncate">{cust.firstName} {cust.lastName}</h3>
                      <p className="text-xs text-[#8a9199] mt-0.5" dir="ltr">{cust.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditing(cust); setShowModal(true); }}
                      className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center"
                    >
                      <FaPen className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(cust.id, e)}
                      className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  {cust.birthDate && (
                    <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                      <FaBirthdayCake className="text-amber-500 text-xs" />
                      <span>{cust.birthDate}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="nura-chip nura-chip-mint">{cust.sessions?.length || 0} جلسة</span>
                    <span className="nura-chip nura-chip-sky">{treatCount} علاج</span>
                    <span className="nura-chip nura-chip-gold">{afterCount} بعد العلاج</span>
                    <span className={`nura-chip ${cust.adsStamp?.signature ? 'nura-chip-lilac' : 'nura-chip-rose'}`}>
                      {cust.adsStamp?.signature ? 'ختم إعلان' : 'بدون ختم'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/customers/${cust.id}`)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-[#10b981] text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <FaEye /> فتح الملف
                </button>
              </article>
            );
          })}
        </div>
      )}

      <CustomerFormModal
        show={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSubmit={persist}
        initial={editing}
        title={editing ? 'تعديل العميلة' : 'إضافة عميلة جديدة'}
      />
    </div>
  );
};

export default Customers;
