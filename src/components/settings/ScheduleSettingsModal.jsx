import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { FaClock, FaSave, FaTimes, FaMapMarkerAlt, FaUserTie, FaCheck } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const ScheduleSettingsModal = ({ show, onClose }) => {
  const { clinicPath } = useClinic();
  
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [schedule, setSchedule] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. جلب الفروع
  useEffect(() => {
    if (!clinicPath || !show) return;
    const branchesRef = ref(database, clinicPath('branches'));
    const unsub = onValue(branchesRef, (snap) => {
      const val = snap.val();
      const list = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : [];
      setBranches(list);
      if (list.length > 0 && !selectedBranch) {
        setSelectedBranch(list[0].id);
      }
    });
    return () => unsub();
  }, [clinicPath, show]);

  // 2. جلب الموظفين حسب الفرع
  useEffect(() => {
    if (!clinicPath || !show || !selectedBranch) return;
    const usersRef = ref(database, clinicPath('users'));
    const unsub = onValue(usersRef, (snap) => {
      const val = snap.val();
      const list = val ? Object.entries(val)
        .map(([id, item]) => ({ id, ...item }))
        .filter(u => u.role !== 'admin' && u.branch === selectedBranch) : [];
      
      setStaffList(list);
      if (list.length > 0) setSelectedStaffId(list[0].id);
      else setSelectedStaffId('');
    });
    return () => unsub();
  }, [clinicPath, show, selectedBranch]);

  // 3. جلب جدول الموظفة
  useEffect(() => {
    if (!clinicPath || !selectedStaffId || !selectedBranch) return;
    setLoading(true);
    
    const scheduleKey = `${selectedBranch}_${selectedStaffId}`;
    const scheduleRef = ref(database, clinicPath(`scheduleSettings/${scheduleKey}`));
    
    const unsub = onValue(scheduleRef, (snap) => {
      setSchedule(snap.val() || {});
      setLoading(false);
    });
    return () => unsub();
  }, [clinicPath, selectedStaffId, selectedBranch]);

  const handleToggleDay = (dayIdx) => {
    setSchedule(prev => ({
      ...prev,
      [`day_${dayIdx}`]: {
        ...prev[`day_${dayIdx}`],
        active: !prev[`day_${dayIdx}`]?.active,
        start: prev[`day_${dayIdx}`]?.start || 9,
        end: prev[`day_${dayIdx}`]?.end || 17,
      }
    }));
  };

  const handleTimeChange = (dayIdx, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [`day_${dayIdx}`]: { ...prev[`day_${dayIdx}`], [field]: Number(value) }
    }));
  };

  const handleSave = async () => {
    if (!clinicPath || !selectedStaffId) return;
    setIsSaving(true);
    try {
      const scheduleKey = `${selectedBranch}_${selectedStaffId}`;
      await set(ref(database, clinicPath(`scheduleSettings/${scheduleKey}`)), schedule);
      toast.success('تم حفظ جدول الموظفة بنجاح!');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FaClock className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-lg">إعدادات دوام الموظفين</h3>
              <p className="text-xs text-blue-100">حدد الفرع والموظفة لضبط الجدول</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><FaTimes /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 bg-gray-50 border-b space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><FaMapMarkerAlt /> اختر الفرع</label>
              {branches.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {branches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => setSelectedBranch(branch.id)}
                      className={`p-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                        selectedBranch === branch.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                          : 'border-gray-200 bg-white text-gray-500 hover:border-blue-200'
                      }`}
                    >
                      {selectedBranch === branch.id && <FaCheck className="text-blue-500" />}
                      {branch.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-rose-500 text-sm font-bold">الرجاء إضافة فروع أولاً.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><FaUserTie /> اختر الموظفة</label>
              {staffList.length > 0 ? (
                <select 
                  value={selectedStaffId} 
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full p-3.5 border-2 border-blue-100 rounded-xl focus:border-blue-400 outline-none font-bold text-gray-800 bg-white shadow-sm"
                >
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name} (قسم: {staff.category})</option>
                  ))}
                </select>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200">
                  ⚠️ لا يوجد موظفات مسجلات في هذا الفرع. أضفهن من صفحة "الموظفين" أولاً.
                </div>
              )}
            </div>
          </div>

          {staffList.length > 0 && (
            <div className="p-6 space-y-4">
              {loading ? (
                <div className="text-center py-10 text-gray-500">جاري تحميل الجدول...</div>
              ) : (
                DAYS.map((day, idx) => {
                  const dayData = schedule[`day_${idx}`] || { active: false, start: 9, end: 17 };
                  return (
                    <div key={idx} className={`border-2 rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${dayData.active ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                      
                      <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                        <div className="relative">
                          <input type="checkbox" checked={dayData.active} onChange={() => handleToggleDay(idx)} className="sr-only" />
                          <div className={`w-11 h-6 rounded-full transition-colors ${dayData.active ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <div className={`absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${dayData.active ? '-translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className={`font-bold ${dayData.active ? 'text-blue-800' : 'text-gray-500'}`}>{day}</span>
                      </label>

                      {dayData.active ? (
                        <div className="flex-1 flex gap-3 items-center">
                          <div className="flex-1">
                            <select value={dayData.start} onChange={(e) => handleTimeChange(idx, 'start', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none">
                              {Array.from({length: 24}).map((_, h) => <option key={h} value={h}>{h}:00</option>)}
                            </select>
                          </div>
                          <span className="text-gray-400 font-bold">إلى</span>
                          <div className="flex-1">
                            <select value={dayData.end} onChange={(e) => handleTimeChange(idx, 'end', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none">
                              {Array.from({length: 24}).map((_, h) => <option key={h} value={h}>{h}:00</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-sm text-gray-400 md:text-left text-center">يوم إجازة (غير مفعل)</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition">إغلاق</button>
          <button onClick={handleSave} disabled={isSaving || staffList.length === 0} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700 transition disabled:opacity-50">
            <FaSave /> {isSaving ? 'جاري الحفظ...' : 'حفظ الجدول'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSettingsModal;