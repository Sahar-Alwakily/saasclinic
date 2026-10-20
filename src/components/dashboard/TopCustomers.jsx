import React, { useMemo } from 'react';
import { FaTrophy, FaChevronLeft, FaCrown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const TopCustomers = ({ customers = [] }) => {
  const navigate = useNavigate();

  const topCustomers = useMemo(() => {
    return customers
      .map((c) => {
        const sessions = c.sessions || [];
        const adsStamp = c.adsStamp ? 1 : 0;
        const totalStamps = sessions.length + adsStamp;
        return { ...c, sessionsCount: sessions.length, totalStamps };
      })
      .sort((a, b) => b.sessionsCount - a.sessionsCount)
      .slice(0, 5);
  }, [customers]);

  if (topCustomers.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm">
            <FaTrophy />
          </div>
          <h3 className="font-bold text-gray-800">أفضل العملاء</h3>
        </div>
        <p className="text-center text-gray-400 text-sm py-6">لا يوجد عملاء بعد</p>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const gradients = [
    'from-amber-400 to-yellow-500', 'from-gray-300 to-gray-400', 'from-orange-400 to-amber-500',
    'from-violet-400 to-fuchsia-500', 'from-violet-400 to-fuchsia-500',
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm">
            <FaTrophy />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">أفضل العملاء</h3>
            <p className="text-xs text-gray-400">الأكثر نشاطًا وولاءً</p>
          </div>
        </div>
        <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors">
          كل العملاء <FaChevronLeft className="text-[10px]" />
        </button>
      </div>

      <div className="space-y-2">
        {topCustomers.map((customer, idx) => (
          <div key={customer.id} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[idx]} text-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm`}>
              {idx === 0 ? <FaCrown className="text-base" /> : medals[idx]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{customer.firstName} {customer.lastName}</p>
              <p className="text-xs text-gray-400 truncate" dir="ltr">{customer.phone}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-lg font-bold text-violet-600">{customer.sessionsCount}</p>
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