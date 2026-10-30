import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { FaSave, FaMapMarkerAlt, FaUserTie, FaCheck } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { parseHolidayDates, formatHourLabel } from '../../utils/scheduleSlots';
import { Link } from 'react-router-dom';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function HolidayDatesEditor({ label, hint, dates, onChange }) {
  const [draft, setDraft] = useState('');
  const list = parseHolidayDates(dates);
  const add = () => {
    const ymd = String(draft || '').trim();
    if (!ymd) return;
    if (list.includes(ymd)) return setDraft('');
    onChange([...list, ymd].sort().join(', '));
    setDraft('');
  };
  const remove = (ymd) => onChange(list.filter((d) => d !== ymd).join(', '));
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold">{label}</p>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      <div className="flex gap-2">
        <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 p-2.5 rounded-xl bg-[#f8faf9] border border-[#e4eee8] text-sm" dir="ltr" />
        <button type="button" onClick={add} className="px-4 py-2 rounded-xl bg-[#10b981] text-white text-sm font-bold">إضافة</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((ymd) => (
          <button key={ymd} type="button" onClick={() => remove(ymd)} className="nura-chip nura-chip-gold" dir="ltr">
            {ymd} ×
          </button>
        ))}
        {!list.length && <p className="text-xs text-[#8a9199]">لا تواريخ بعد</p>}
      </div>
    </div>
  );
}

const ScheduleSettingsModal = ({ show = true, onClose, embedded = false }) => {
  const { clinicPath } = useClinic();
  
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [schedule, setSchedule] = useState({});
  const [clinicHolidays, setClinicHolidays] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);

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

  useEffect(() => {
    if (!clinicPath || !show) return undefined;
    return onValue(ref(database, clinicPath('scheduleSettings/_clinicHolidays')), (snap) => {
      setClinicHolidays(snap.val()?.holidays || '');
    });
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
      await set(ref(database, clinicPath(`scheduleSettings/${scheduleKey}`)), {
        ...schedule,
        holidays: parseHolidayDates(schedule.holidays).join(', '),
      });
      toast.success('تم حفظ جدول وعطل الموظفة');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const saveClinicHolidays = async () => {
    if (!clinicPath) return;
    setSavingClinic(true);
    try {
      await set(ref(database, clinicPath('scheduleSettings/_clinicHolidays')), {
        holidays: parseHolidayDates(clinicHolidays).join(', '),
        updatedAt: Date.now(),
      });
      toast.success('حُفظت عطلة العيادة لكل الموظفات');
    } catch {
      toast.error('تعذّر حفظ عطلة العيادة');
    } finally {
      setSavingClinic(false);
    }
  };

  if (!embedded && !show) return null;

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);
  const activeDays = DAYS.filter((_, idx) => schedule[`day_${idx}`]?.active).length;
  const staffHolidays = parseHolidayDates(schedule.holidays).length;
  const clinicHolidayCount = parseHolidayDates(clinicHolidays).length;
  const hourOptions = () => Array.from({ length: 24 }, (_, h) => (
    <option key={h} value={h}>{formatHourLabel(h)}</option>
  ));

  const body = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="saas-card stat-card-mint p-4">
          <p className="text-[12px] text-[#047857]">موظفات الفرع</p>
          <p className="stat-num text-[28px] leading-none mt-2">{staffList.length}</p>
        </div>
        <div className="saas-card stat-card-sky p-4">
          <p className="text-[12px] text-[#0369a1]">أيام دوامها</p>
          <p className="stat-num text-[28px] leading-none mt-2">{activeDays}</p>
        </div>
        <div className="saas-card stat-card-gold p-4">
          <p className="text-[12px] text-[#b45309]">عطل الموظفة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{staffHolidays}</p>
        </div>
        <div className="saas-card stat-card-rose p-4">
          <p className="text-[12px] text-[#be123c]">عطلة العيادة</p>
          <p className="stat-num text-[28px] leading-none mt-2">{clinicHolidayCount}</p>
        </div>
      </div>

      <section className="saas-card p-4 sm:p-5 space-y-4">
        <div>
          <p className="text-xs font-bold text-[#8a9199] mb-2 flex items-center gap-1"><FaMapMarkerAlt /> الفرع</p>
          {branches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setSelectedBranch(branch.id)}
                  className={`px-3 py-2 rounded-2xl text-sm font-bold ${
                    selectedBranch === branch.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {selectedBranch === branch.id ? <FaCheck className="inline ml-1 text-xs" /> : null}
                  {branch.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-rose-600 font-bold">أضيفي فرعاً أولاً من الفريق والفروع.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-[#8a9199] mb-2 flex items-center gap-1"><FaUserTie /> الموظفة</p>
          {staffList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {staffList.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setSelectedStaffId(staff.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold ${
                    selectedStaffId === staff.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                    selectedStaffId === staff.id ? 'bg-white/20' : 'bg-white text-emerald-700'
                  }`}>
                    {(staff.name || 'م').trim().charAt(0)}
                  </span>
                  {staff.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
              لا موظفات في هذا الفرع. <Link to="/staff" className="font-bold underline">أضيفيهن من الموظفات</Link>.
            </div>
          )}
        </div>
      </section>

      <section className="saas-card p-4 sm:p-5 space-y-3">
        <HolidayDatesEditor
          label="عطلة شاملة للعيادة"
          hint="تاريخ واحد يُغلق الحجز لكل الموظفات دفعة واحدة."
          dates={clinicHolidays}
          onChange={setClinicHolidays}
        />
        <button type="button" onClick={saveClinicHolidays} disabled={savingClinic} className="px-4 py-2 rounded-xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-50">
          {savingClinic ? 'جاري الحفظ...' : 'حفظ عطلة العيادة'}
        </button>
      </section>

      {staffList.length > 0 && (
        <section className="saas-card p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-[#111827]">أسبوع {selectedStaff?.name || 'الموظفة'}</h2>
              <p className="text-xs text-[#8a9199] mt-0.5">فعّلي اليوم ثم حددي من أي ساعة إلى أي ساعة.</p>
            </div>
            <button type="button" onClick={handleSave} disabled={isSaving} className="px-4 py-2.5 rounded-xl bg-[#10b981] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              <FaSave /> {isSaving ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </button>
          </div>
          <HolidayDatesEditor
            label="عطل هذه الموظفة"
            hint="إجازة لهذه الموظفة فقط — الحجز يُغلق لها في هذه الأيام."
            dates={schedule.holidays}
            onChange={(holidays) => setSchedule((prev) => ({ ...prev, holidays }))}
          />
          {loading ? (
            <p className="text-center py-8 text-[#8a9199]">جاري تحميل الجدول...</p>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, idx) => {
                const dayData = schedule[`day_${idx}`] || { active: false, start: 9, end: 17 };
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      dayData.active ? 'bg-emerald-50/70 border-emerald-100' : 'bg-[#f8faf9] border-[#e4eee8]'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer min-w-[9rem]">
                      <input type="checkbox" checked={!!dayData.active} onChange={() => handleToggleDay(idx)} className="sr-only" />
                      <span className={`w-11 h-6 rounded-full relative shrink-0 ${dayData.active ? 'bg-[#10b981]' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${dayData.active ? 'left-0.5' : 'right-0.5'}`} />
                      </span>
                      <span className={`font-bold ${dayData.active ? 'text-emerald-800' : 'text-[#8a9199]'}`}>{day}</span>
                    </label>
                    {dayData.active ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <select value={dayData.start} onChange={(e) => handleTimeChange(idx, 'start', e.target.value)} className="flex-1 p-2.5 rounded-xl bg-white border border-emerald-100 text-sm font-bold">
                          {hourOptions()}
                        </select>
                        <span className="text-[#8a9199] text-sm font-bold">إلى</span>
                        <select value={dayData.end} onChange={(e) => handleTimeChange(idx, 'end', e.target.value)} className="flex-1 p-2.5 rounded-xl bg-white border border-emerald-100 text-sm font-bold">
                          {hourOptions()}
                        </select>
                      </div>
                    ) : (
                      <p className="flex-1 text-sm text-[#8a9199]">إجازة</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!embedded && onClose && (
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold">إغلاق</button>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-5" dir="rtl">
        <ToastContainer position="top-left" rtl />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-[#111827]">دوام الموظفين</h1>
            <p className="text-sm text-[#8a9199] mt-1">أيام وساعات كل موظفة، عطلها، وعطلة العيادة للكل.</p>
          </div>
          <Link to="/staff" className="nura-chip nura-chip-mint">الموظفات</Link>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {body}
      </div>
    </div>
  );
};

export default ScheduleSettingsModal;