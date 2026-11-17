import React, { useMemo } from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const TopCustomers = ({ customers = [] }) => {
  const navigate = useNavigate();

  const topCustomers = useMemo(() => {
    return customers
      .map((c) => ({ ...c, sessionsCount: (c.sessions || []).length }))
      .sort((a, b) => b.sessionsCount - a.sessionsCount)
      .slice(0, 5);
  }, [customers]);

  if (topCustomers.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold text-[#202A32]">العميلات الأكثر زيارة</h3>
        </div>
        <p className="text-center text-gray-400 text-sm py-6">لا يوجد عملاء بعد</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E5E9EC] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#202A32]">العميلات الأكثر زيارة</h3>
          <p className="text-xs text-[#75818B]">حسب عدد الجلسات المسجّلة</p>
        </div>
        <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-xs text-[#172B3A]">
          كل العملاء <FaChevronLeft className="text-[10px]" />
        </button>
      </div>

      <div className="space-y-2">
        {topCustomers.map((customer, idx) => (
          <div key={customer.id} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all">
            <div className="w-8 h-8 rounded-md bg-[#eef2f1] text-[#172B3A] flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{customer.firstName} {customer.lastName}</p>
              <p className="text-xs text-gray-400 truncate" dir="ltr">{customer.phone}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-lg font-semibold text-[#172B3A]">{customer.sessionsCount}</p>
                <p className="text-[10px] text-gray-400">جلسة</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopCustomers;