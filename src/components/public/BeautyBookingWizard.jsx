import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaArrowLeft, FaArrowRight, FaCalendarAlt, FaCheck, FaChevronLeft, FaChevronRight,
  FaClock, FaMapMarkerAlt, FaPhone, FaSpa, FaStar, FaTimes, FaUser,
} from 'react-icons/fa';
import { withAlpha } from '../themes/themeUtils';
import { toYmd } from '../../utils/scheduleSlots';

const STEPS = [
  { id: 1, label: 'المدينة', icon: FaMapMarkerAlt },
  { id: 2, label: 'الجلسة', icon: FaSpa },
  { id: 3, label: 'التاريخ', icon: FaCalendarAlt },
  { id: 4, label: 'الوقت', icon: FaClock },
  { id: 5, label: 'التأكيد', icon: FaCheck },
];

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const ARABIC_MONTHS_SHORT = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_DAYS_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function formatArabicDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return `${ARABIC_DAYS[d.getDay()]} ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const pageVariants = {
  initial: (direction) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -40 : 40, transition: { duration: 0.2 } }),
};

function CustomCalendar({ selectedDate, onSelect, primaryColor }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [weekStart, setWeekStart] = useState(() => {
    const base = selectedDate ? new Date(selectedDate) : new Date(today);
    base.setHours(0, 0, 0, 0);
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - base.getDay());
    return sunday;
  });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  }), [weekStart]);

  const thisWeek = useMemo(() => {
    const s = new Date(today);
    s.setDate(today.getDate() - today.getDay());
    return s;
  }, [today]);
  const canGoPrev = weekStart > thisWeek;
  const canGoNext = (() => {
    const max = new Date(today);
    max.setDate(today.getDate() + 60);
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    return next <= max;
  })();

  const weekLabel = useMemo(() => {
    const s = weekDays[0];
    const e = weekDays[6];
    const sm = ARABIC_MONTHS[s.getMonth()];
    const em = ARABIC_MONTHS[e.getMonth()];
    if (s.getMonth() === e.getMonth()) return `${s.getDate()} - ${e.getDate()} ${sm} ${s.getFullYear()}`;
    return `${s.getDate()} ${sm} - ${e.getDate()} ${em}`;
  }, [weekDays]);

  const isSelected = (date) => selectedDate
    && date.getFullYear() === selectedDate.getFullYear()
    && date.getMonth() === selectedDate.getMonth()
    && date.getDate() === selectedDate.getDate();
  const isToday = (date) => date.getTime() === today.getTime();
  const disabled = (date) => date < today;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: `linear-gradient(to bottom right, ${withAlpha(primaryColor, 0.08)}, ${withAlpha(primaryColor, 0.16)})`, borderColor: withAlpha(primaryColor, 0.12) }}>
      <div className="flex items-center justify-between mb-4 px-1">
        <button type="button" onClick={() => { if (!canGoPrev) return; const d = new Date(weekStart); d.setDate(weekStart.getDate() - 7); setWeekStart(d); }} disabled={!canGoPrev} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: canGoPrev ? primaryColor : '#d1d5db' }} aria-label="السابق">
          <FaChevronRight className="text-xs" />
        </button>
        <h3 className="text-sm font-bold text-gray-800">{weekLabel}</h3>
        <button type="button" onClick={() => { if (!canGoNext) return; const d = new Date(weekStart); d.setDate(weekStart.getDate() + 7); setWeekStart(d); }} disabled={!canGoNext} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: canGoNext ? primaryColor : '#d1d5db' }} aria-label="التالي">
          <FaChevronLeft className="text-xs" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((date) => {
          const off = disabled(date);
          const selected = isSelected(date);
          const todayCell = isToday(date);
          return (
            <div key={date.toISOString()} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold" style={{ color: selected || todayCell ? primaryColor : '#9ca3af' }}>{ARABIC_DAYS_SHORT[date.getDay()]}</span>
              <button
                type="button"
                disabled={off}
                onClick={() => !off && onSelect(date)}
                className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center relative"
                style={selected
                  ? { background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})`, color: '#fff', boxShadow: `0 8px 18px ${withAlpha(primaryColor, 0.28)}` }
                  : off
                    ? { backgroundColor: 'rgba(255,255,255,0.4)', color: '#d1d5db' }
                    : { backgroundColor: '#fff', color: '#1f2937', border: `1px solid ${withAlpha(primaryColor, 0.18)}` }}
              >
                <span className="text-base font-bold">{date.getDate()}</span>
                <span className="text-[9px] font-medium mt-0.5" style={{ color: selected ? 'rgba(255,255,255,0.9)' : primaryColor }}>{ARABIC_MONTHS_SHORT[date.getMonth()]}</span>
                {todayCell && !selected && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />}
              </button>
            </div>
          );
        })}
      </div>
      {canGoPrev && (
        <button type="button" onClick={() => setWeekStart(thisWeek)} className="mt-4 w-full text-center text-xs font-medium py-2 rounded-xl" style={{ color: primaryColor }}>
          ← العودة للأسبوع الحالي
        </button>
      )}
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle, primaryColor }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-sm" style={{ background: `linear-gradient(to bottom right, ${withAlpha(primaryColor, 0.16)}, ${withAlpha(primaryColor, 0.28)})`, color: primaryColor }}>
        <Icon className="text-xl" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs md:text-sm text-gray-500 mt-1.5">{subtitle}</p>}
    </div>
  );
}

function SummaryRow({ label, value, primaryColor, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold" style={{ color: highlight ? primaryColor : '#1f2937' }}>{value || '—'}</span>
    </div>
  );
}

export default function BeautyBookingWizard({
  clinicName,
  primaryColor,
  places = [],
  services = [],
  bookingData,
  setBookingData,
  bookingStep,
  setBookingStep,
  slotInfo,
  applyServiceToBooking,
  resolvedSpecialistId,
  onSubmit,
  onClose,
  isSuccess,
  policies = [],
  policyOk,
  setPolicyOk,
  autoConfirm,
  manageLink,
}) {
  const [direction, setDirection] = useState(1);
  const selectedDate = bookingData.date ? new Date(`${bookingData.date}T12:00:00`) : null;
  const selectedService = services.find((s) => s.id === bookingData.serviceId);
  const pageBg = '#EFF6FF';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const canGoNext = () => {
    if (bookingStep === 1) return Boolean(bookingData.branchId);
    if (bookingStep === 2) return Boolean(bookingData.serviceId);
    if (bookingStep === 3) return Boolean(bookingData.date);
    if (bookingStep === 4) return Boolean(bookingData.time);
    return false;
  };

  const goNext = () => {
    if (!canGoNext() || bookingStep >= 5) return;
    setDirection(1);
    setBookingStep(bookingStep + 1);
  };
  const goPrev = () => {
    if (bookingStep <= 1) return;
    setDirection(-1);
    setBookingStep(bookingStep - 1);
  };

  const pickPlace = (place) => {
    setBookingData({
      ...bookingData,
      branchId: place.id,
      branchName: place.name,
      date: '',
      time: '',
    });
  };

  const pickService = (service) => {
    setBookingData(applyServiceToBooking({ ...bookingData, date: '', time: '' }, service.id));
  };

  const shell = (children) => createPortal(
    <div
      className="fixed inset-0 overflow-y-auto min-h-screen py-8 px-4"
      dir="rtl"
      style={{ zIndex: 9999, backgroundColor: pageBg, isolation: 'isolate' }}
    >
      {children}
    </div>,
    document.body,
  );

  if (isSuccess) {
    return shell(
      <>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl shadow-xl p-10 border" style={{ borderColor: withAlpha(primaryColor, 0.12) }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: withAlpha(primaryColor, 0.15), color: primaryColor }}>
              <FaCheck className="text-3xl" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">تم الحجز</h2>
            <p className="text-gray-500 mb-6">
              {autoConfirm ? 'موعدك مؤكَّد حسب سياسة العيادة.' : 'طلبك وصل للعيادة وسيتم تأكيده.'}
              {bookingData.branchName ? ` في ${bookingData.branchName}` : ''}
            </p>
            {manageLink && <a href={manageLink} className="block mb-4 text-sm font-bold underline" style={{ color: primaryColor }}>إدارة الموعد</a>}
            <button type="button" onClick={onClose} className="text-white px-8 py-3 rounded-2xl font-bold" style={{ background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }}>
              العودة للعيادة
            </button>
          </div>
        </div>
      </>
    );
  }

  return shell(
    <div className="max-w-2xl mx-auto">
        <div className="flex justify-start mb-4">
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white shadow-sm text-gray-400 flex items-center justify-center" aria-label="إغلاق">
            <FaTimes />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full text-white mb-4 shadow-lg" style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})`, boxShadow: `0 10px 24px ${withAlpha(primaryColor, 0.28)}` }}>
            <FaStar className="text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">حجز موعدك</h1>
          <p className="text-sm text-gray-500">{clinicName ? `خطوات بسيطة لحجز موعدك في ${clinicName}` : 'خطوات بسيطة لحجز موعدك في العيادة'}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between px-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCompleted = bookingStep > s.id;
              const isActive = bookingStep === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                      style={isCompleted
                        ? { background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})`, color: '#fff' }
                        : isActive
                          ? { backgroundColor: '#fff', color: primaryColor, boxShadow: `0 0 0 4px ${withAlpha(primaryColor, 0.16)}` }
                          : { backgroundColor: '#fff', color: '#9ca3af', border: '1px solid #e5e7eb' }}
                    >
                      {isCompleted ? <FaCheck className="text-xs" /> : <Icon className="text-sm" />}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: isActive ? primaryColor : isCompleted ? '#6b7280' : '#9ca3af' }}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-[2px] mx-1 sm:mx-2 rounded-full overflow-hidden bg-gray-200 relative">
                      <div className="absolute inset-y-0 right-0" style={{ width: bookingStep > s.id ? '100%' : '0%', background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border overflow-hidden" style={{ borderColor: withAlpha(primaryColor, 0.1), boxShadow: `0 20px 40px ${withAlpha(primaryColor, 0.12)}` }}>
          <AnimatePresence mode="wait" custom={direction}>
            {bookingStep === 1 && (
              <motion.div key="s1" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 md:p-8">
                <StepHeader icon={FaMapMarkerAlt} title="أين تريدين الحجز؟" subtitle="اختاري الفرع الأقرب لكِ" primaryColor={primaryColor} />
                {places.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-10">لا يوجد فرع ظاهر للحجز حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {places.map((place) => {
                      const selected = bookingData.branchId === place.id;
                      return (
                        <motion.button
                          key={place.id}
                          type="button"
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => pickPlace(place)}
                          className="group relative p-5 rounded-2xl border-2 text-right w-full overflow-hidden"
                          style={selected
                            ? { borderColor: 'transparent', background: `linear-gradient(to bottom right, ${withAlpha(primaryColor, 0.12)}, ${withAlpha(primaryColor, 0.22)})`, boxShadow: `0 10px 24px ${withAlpha(primaryColor, 0.18)}`, outline: `2px solid ${withAlpha(primaryColor, 0.35)}` }
                            : { borderColor: '#f3f4f6', backgroundColor: '#fff' }}
                        >
                          {selected && (
                            <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                              <FaCheck className="text-[10px]" />
                            </span>
                          )}
                          <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center" style={{ background: selected ? `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` : withAlpha(primaryColor, 0.12), color: selected ? '#fff' : primaryColor }}>
                            <FaMapMarkerAlt />
                          </div>
                          <h3 className="text-base font-bold text-gray-800 mb-1">{place.name}</h3>
                          <p className="text-xs text-gray-500">{place.address || place.phone || 'فرع للحجز'}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {bookingStep === 2 && (
              <motion.div key="s2" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 md:p-8">
                <StepHeader icon={FaSpa} title="اختاري الجلسة" subtitle={bookingData.branchName ? `الجلسات في ${bookingData.branchName}` : 'الجلسات المتاحة'} primaryColor={primaryColor} />
                {services.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-10">لا توجد جلسات ظاهرة للحجز حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {services.map((service) => {
                      const selected = bookingData.serviceId === service.id;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => pickService(service)}
                          className="relative p-5 rounded-2xl border-2 text-right"
                          style={selected
                            ? { borderColor: 'transparent', backgroundColor: withAlpha(primaryColor, 0.1), boxShadow: `0 0 0 2px ${withAlpha(primaryColor, 0.22)}` }
                            : { borderColor: '#f3f4f6' }}
                        >
                          {selected && (
                            <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                              <FaCheck className="text-[10px]" />
                            </span>
                          )}
                          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-3" style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.8)})` }}>
                            <FaSpa className="text-xl" />
                          </div>
                          <h3 className="text-base font-bold text-gray-800 mb-1">{service.title || service.name}</h3>
                          {service.duration && <p className="text-xs text-gray-500">{service.duration}</p>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {bookingStep === 3 && (
              <motion.div key="s3" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 md:p-8">
                <StepHeader icon={FaCalendarAlt} title="اختاري التاريخ" subtitle="اختاري يوماً من التقويم الأسبوعي" primaryColor={primaryColor} />
                <div className="mt-6">
                  <CustomCalendar
                    selectedDate={selectedDate}
                    primaryColor={primaryColor}
                    onSelect={(date) => setBookingData({ ...bookingData, date: toYmd(date), time: '' })}
                  />
                </div>
                {selectedDate && (
                  <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-2xl" style={{ backgroundColor: withAlpha(primaryColor, 0.1), color: primaryColor }}>
                    <FaCheck className="text-xs" />
                    <p className="text-sm font-medium">{formatArabicDate(selectedDate)}</p>
                  </div>
                )}
              </motion.div>
            )}

            {bookingStep === 4 && (
              <motion.div key="s4" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 md:p-8">
                <StepHeader icon={FaClock} title="اختاري الوقت" subtitle={`${selectedService?.title || selectedService?.name || 'الجلسة'} • ${formatArabicDate(selectedDate)}`} primaryColor={primaryColor} />
                <div className="mt-6">
                  {slotInfo?.closed && <p className="text-center text-sm text-gray-500 py-8">{slotInfo.dayName ? `مغلق يوم ${slotInfo.dayName}` : 'هذا اليوم مغلق'}</p>}
                  {slotInfo?.missing && <p className="text-center text-sm text-gray-500 py-8">لم يُضبط جدول الدوام لهذا الفرع بعد.</p>}
                  {!slotInfo?.closed && !slotInfo?.missing && (slotInfo?.slots || []).length === 0 && (
                    <div className="text-center py-10 text-gray-500 rounded-2xl border border-dashed" style={{ backgroundColor: withAlpha(primaryColor, 0.06), borderColor: withAlpha(primaryColor, 0.18) }}>
                      <FaClock className="text-2xl mx-auto mb-2" style={{ color: withAlpha(primaryColor, 0.4) }} />
                      <p className="text-sm">لا توجد أوقات متاحة</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(slotInfo?.slots || []).map((time) => {
                      const selected = bookingData.time === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setBookingData({ ...bookingData, time, specialistId: resolvedSpecialistId || bookingData.specialistId })}
                          className="py-2.5 px-2 rounded-xl text-xs sm:text-sm font-medium"
                          style={selected
                            ? { background: `linear-gradient(to bottom right, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})`, color: '#fff' }
                            : { backgroundColor: withAlpha(primaryColor, 0.1), color: primaryColor, border: `1px solid ${withAlpha(primaryColor, 0.18)}` }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {bookingStep === 5 && (
              <motion.div key="s5" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 md:p-8">
                <StepHeader icon={FaUser} title="بيانات الحجز" subtitle="أدخلي معلوماتك لتأكيد الموعد" primaryColor={primaryColor} />
                <div className="mt-6 mb-6 rounded-2xl p-5 border" style={{ background: `linear-gradient(to bottom right, ${withAlpha(primaryColor, 0.08)}, ${withAlpha(primaryColor, 0.16)})`, borderColor: withAlpha(primaryColor, 0.14) }}>
                  <div className="flex items-center gap-2 mb-4">
                    <FaCheck style={{ color: primaryColor }} className="text-sm" />
                    <h4 className="text-sm font-bold text-gray-800">ملخّص الحجز</h4>
                  </div>
                  <div className="space-y-2.5">
                    <SummaryRow label="الفرع" value={bookingData.branchName} primaryColor={primaryColor} />
                    <SummaryRow label="الجلسة" value={selectedService?.title || selectedService?.name} primaryColor={primaryColor} />
                    <SummaryRow label="التاريخ" value={formatArabicDate(bookingData.date)} primaryColor={primaryColor} />
                    <SummaryRow label="الوقت" value={bookingData.time} primaryColor={primaryColor} highlight />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <FaUser className="text-xs" style={{ color: primaryColor }} /> الاسم الكامل
                </label>
                <input
                  type="text"
                  value={bookingData.name}
                  onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                  className="w-full py-3.5 px-4 rounded-2xl border-2 border-gray-200 outline-none text-gray-800 mb-4"
                  placeholder="مثال: أميرة محمد"
                />
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <FaPhone className="text-xs" style={{ color: primaryColor }} /> رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={bookingData.phone}
                  onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                  className="w-full py-3.5 px-4 rounded-2xl border-2 border-gray-200 outline-none text-gray-800"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
                {policies.length > 0 && (
                  <label className="flex items-start gap-2 text-xs text-gray-500 mt-4">
                    <input type="checkbox" checked={policyOk} onChange={(e) => setPolicyOk(e.target.checked)} className="mt-1" />
                    <span className="space-y-1">
                      {policies.map((item) => (
                        <span key={item.id} className="block"><b>{item.label}:</b> {item.text}</span>
                      ))}
                    </span>
                  </label>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 md:p-8 pt-0">
            <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={goPrev}
                disabled={bookingStep === 1}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-sm bg-gray-100 disabled:text-gray-300 text-gray-600"
              >
                <FaArrowRight className="text-xs" /> السابق
              </button>
              {bookingStep < 5 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext()}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl font-medium text-sm text-white disabled:bg-gray-100 disabled:text-gray-300"
                  style={canGoNext() ? { background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` } : undefined}
                >
                  التالي <FaArrowLeft className="text-xs" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!bookingData.name || !bookingData.phone || !bookingData.branchId || (policies.length > 0 && !policyOk)}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl font-medium text-sm text-white disabled:bg-gray-100 disabled:text-gray-300"
                  style={bookingData.name && bookingData.phone ? { background: `linear-gradient(to left, ${primaryColor}, ${withAlpha(primaryColor, 0.85)})` } : undefined}
                >
                  <FaCheck /> تأكيد الحجز
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">جميع المواعيد حسب جدول العيادة</p>
      </div>
  );
}
