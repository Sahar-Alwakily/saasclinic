import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { FaSave, FaMapMarkerAlt, FaUserTie, FaCheck } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { parseHolidayDates, formatHourLabel } from '../../utils/scheduleSlots';
import { Link } from 'react-router-dom';
import TeamNav from '../team/TeamNav';
import TeamStatStrip from '../team/TeamStatStrip';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const panel = 'rounded-xl border border-[#E4EAEE] bg-white';
const field = 'h-8 w-full rounded-lg border border-[#E4EAEE] bg-white px-2 text-[11.5px] font-bold tabular-nums text-[#334155] outline-none focus:border-[#0FA3A3]';
const chip = (on) => `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
  on
    ? 'border-[#C6EEEE] bg-[#ECFEFF] text-[#0E7490]'
    : 'border-[#E4EAEE] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#334155]'
}`;

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
      <p className="text-[11.5px] font-bold text-[#334155]">{label}</p>
      {hint && <p className="text-[10px] text-[#94A3B8]">{hint}</p>}
      <div className="flex gap-2">
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-[#E4EAEE] bg-white px-2.5 text-[12px] text-[#334155] outline-none focus:border-[#0FA3A3]"
          dir="ltr"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-[#E4EAEE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]"
        >
          إضافة
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((ymd) => (
          <button
            key={ymd}
            type="button"
            onClick={() => remove(ymd)}
            className="rounded-full border border-[#F3E2C2] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#B45309] transition-colors hover:border-[#B45309]"
            dir="ltr"
          >
            {ymd} ×
          </button>
        ))}
        {!list.length && <p className="text-[10.5px] text-[#94A3B8]">لا تواريخ بعد</p>}
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

  const handleTimeChange = (dayIdx, fieldName, value) => {
    setSchedule(prev => ({
      ...prev,
      [`day_${dayIdx}`]: { ...prev[`day_${dayIdx}`], [fieldName]: Number(value) }
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
    } catch {
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
      <TeamStatStrip
        items={[
          { label: 'موظفات الفرع', value: staffList.length, note: 'حسب الفرع المحدد', accent: '#059669' },
          { label: 'أيام دوامها', value: activeDays, note: selectedStaff?.name || 'اختاري موظفة', accent: '#0FA3A3' },
          { label: 'عطل الموظفة', value: staffHolidays, note: 'إجازات فردية', accent: '#B45309' },
          { label: 'عطلة العيادة', value: clinicHolidayCount, note: 'إغلاق شامل للفريق', accent: '#DC2626' },
        ]}
      />

      <section className={`${panel} space-y-4 p-4`}>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold text-[#64748B]"><FaMapMarkerAlt className="text-[9px]" /> الفرع</p>
          {branches.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {branches.map((branch) => {
                const active = selectedBranch === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedBranch(branch.id)}
                    className={chip(active)}
                  >
                    {active ? <FaCheck className="text-[9px]" /> : null}
                    {branch.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-[#F7D3D3] bg-[#FEF2F2] px-3 py-2 text-[11.5px] font-bold text-[#DC2626]">
              أضيفي فرعاً أولاً من قسم «الفروع».
            </p>
          )}
        </div>
        <div className="border-t border-[#EDF1F4] pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold text-[#64748B]"><FaUserTie className="text-[9px]" /> الموظفة</p>
          {staffList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {staffList.map((staff) => {
                const active = selectedStaffId === staff.id;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={chip(active)}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold ${
                      active ? 'bg-white text-[#0E7490]' : 'bg-[#F4F7F8] text-[#475569]'
                    }`}>
                      {(staff.name || 'م').trim().charAt(0)}
                    </span>
                    {staff.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#F3E2C2] bg-[#FFFBEB] px-3 py-2 text-[11.5px] text-[#B45309]">
              لا موظفات في هذا الفرع.
              <Link to="/staff" className="font-bold text-[#B45309] underline underline-offset-2">أضيفيهن من الموظفات</Link>.
            </div>
          )}
        </div>
      </section>

      <section className={`${panel} space-y-3 p-4`}>
        <HolidayDatesEditor
          label="عطلة شاملة للعيادة"
          hint="تاريخ واحد يُغلق الحجز لكل الموظفات دفعة واحدة."
          dates={clinicHolidays}
          onChange={setClinicHolidays}
        />
        <button
          type="button"
          onClick={saveClinicHolidays}
          disabled={savingClinic}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9EEE0] bg-[#ECFDF5] px-3 py-1.5 text-[11.5px] font-bold text-[#047857] transition-colors hover:border-[#059669] disabled:opacity-50"
        >
          {savingClinic ? 'جاري الحفظ...' : 'حفظ عطلة العيادة'}
        </button>
      </section>

      {staffList.length > 0 && (
        <section className={`${panel} space-y-3 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEE] pb-3">
            <div>
              <h2 className="text-[13.5px] font-extrabold text-[#0F172A]">أسبوع {selectedStaff?.name || 'الموظفة'}</h2>
              <p className="mt-0.5 text-[10.5px] text-[#94A3B8]">فعّلي اليوم ثم حددي من أي ساعة إلى أي ساعة.</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#047857] disabled:opacity-50"
            >
              <FaSave className="text-[10px]" /> {isSaving ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </button>
          </div>

          <HolidayDatesEditor
            label="عطل هذه الموظفة"
            hint="إجازة لهذه الموظفة فقط — الحجز يُغلق لها في هذه الأيام."
            dates={schedule.holidays}
            onChange={(holidays) => setSchedule((prev) => ({ ...prev, holidays }))}
          />

          {loading ? (
            <p className="py-8 text-center text-[11.5px] text-[#94A3B8]">جاري تحميل الجدول...</p>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, idx) => {
                const dayData = schedule[`day_${idx}`] || { active: false, start: 9, end: 17 };
                return (
                  <div
                    key={idx}
                    className={`flex flex-col justify-between gap-3 rounded-lg border px-3 py-2.5 md:flex-row md:items-center ${
                      dayData.active ? 'border-[#C9EEE0] bg-[#F6FEFB]' : 'border-[#E4EAEE] bg-white'
                    }`}
                  >
                    <label className="flex min-w-[8.5rem] cursor-pointer items-center gap-2.5">
                      <input type="checkbox" checked={!!dayData.active} onChange={() => handleToggleDay(idx)} className="sr-only" />
                      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${dayData.active ? 'bg-[#059669]' : 'bg-[#CBD5E1]'}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${dayData.active ? 'left-0.5' : 'right-0.5'}`} />
                      </span>
                      <span className={`text-[12px] font-bold ${dayData.active ? 'text-[#047857]' : 'text-[#64748B]'}`}>{day}</span>
                    </label>
                    {dayData.active ? (
                      <div className="flex flex-1 items-center gap-2">
                        <select value={dayData.start} onChange={(e) => handleTimeChange(idx, 'start', e.target.value)} className={field}>
                          {hourOptions()}
                        </select>
                        <span className="text-[10.5px] font-bold text-[#94A3B8]">إلى</span>
                        <select value={dayData.end} onChange={(e) => handleTimeChange(idx, 'end', e.target.value)} className={field}>
                          {hourOptions()}
                        </select>
                      </div>
                    ) : (
                      <p className="flex-1 text-[11.5px] text-[#94A3B8]">إجازة</p>
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
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E4EAEE] bg-white px-4 py-2 text-[12px] font-bold text-[#334155] transition-colors hover:border-[#0FA3A3] hover:text-[#0E7490]">
            إغلاق
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="mx-auto max-w-[1360px] space-y-5 text-[#0F172A]" dir="rtl">
        <ToastContainer position="top-left" rtl />
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[#94A3B8]">الفريق</p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight">الدوام والعطل</h1>
            <p className="mt-1 text-[12.5px] text-[#64748B]">أيام وساعات كل موظفة، عطلها، وعطلة العيادة للكل.</p>
          </div>
          <TeamNav />
        </header>
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E4EAEE] bg-[#F4F7F8]">
        {body}
      </div>
    </div>
  );
};

export default ScheduleSettingsModal;
