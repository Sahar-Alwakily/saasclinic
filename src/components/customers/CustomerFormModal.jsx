import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import SignatureCanvas from './SignatureCanvas';

const field = 'w-full rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const pillActive = 'flex-1 rounded-full border border-[#C6EEEE] bg-[#ECFEFF] px-2 py-2 text-[11.5px] font-bold text-[#0E7490]';
const pillIdle = 'flex-1 rounded-full border border-[#E4EAEE] bg-white px-2 py-2 text-[11.5px] font-bold text-[#334155]';
const primary = 'w-full rounded-lg bg-[#059669] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#047857]';
const labelCls = 'mb-1 block text-[11px] font-bold text-[#64748B]';

const emptyMedical = {
  allergies: '',
  chronicDiseases: '',
  currentMedications: '',
  previousSurgeries: '',
  notes: '',
  isPregnant: false,
  isBreastfeeding: false,
};

const CustomerFormModal = ({
  show,
  onClose,
  onSubmit,
  initial,
  title = 'عميلة',
  startTab = 'profile',
  medicalOnly = false,
}) => {
  const [tab, setTab] = useState(startTab);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '',
    idNumber: '',
    gender: 'female',
    medicalInfo: emptyMedical,
    adsStamp: null,
  });

  useEffect(() => {
    if (!show) return;
    setTab(medicalOnly ? 'medical' : startTab);
    setForm({
      firstName: initial?.firstName || '',
      lastName: initial?.lastName || '',
      phone: initial?.phone || '',
      birthDate: initial?.birthDate || '',
      idNumber: initial?.idNumber || '',
      gender: initial?.gender || 'female',
      medicalInfo: { ...emptyMedical, ...(initial?.medicalInfo || {}) },
      adsStamp: initial?.adsStamp || null,
    });
  }, [show, initial, medicalOnly, startTab]);

  if (!show) return null;

  const med = form.medicalInfo || emptyMedical;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" dir="rtl" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#E4EAEE] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#E4EAEE] px-5 py-4">
          <div>
            <p className="text-[11px] font-bold text-[#94A3B8]">سجل العميلات</p>
            <h3 className="text-[16px] font-extrabold text-[#0F172A]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#E4EAEE] text-[#64748B] hover:border-[#0FA3A3]"
            aria-label="إغلاق"
          >
            <FaTimes className="text-[11px]" />
          </button>
        </div>

        {!medicalOnly && (
          <div className="flex gap-1.5 border-b border-[#E4EAEE] bg-[#F8FBFC] px-4 py-2">
            {[['profile', 'البيانات'], ['medical', 'المعلومات الطبية'], ['ads', 'ختم الإعلانات']].map(([id, tabLabel]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? pillActive : pillIdle}>
                {tabLabel}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 overflow-y-auto p-5">
          {tab === 'profile' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>
                  الاسم الأول *
                  <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={field} placeholder="الاسم" />
                </label>
                <label className={labelCls}>
                  اسم العائلة
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={field} placeholder="العائلة" />
                </label>
              </div>
              <label className={labelCls}>
                الهاتف *
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} placeholder="05..." dir="ltr" />
              </label>
              <label className={labelCls}>
                رقم الهوية
                <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} className={field} dir="ltr" />
              </label>
              <label className={labelCls}>
                تاريخ الميلاد
                <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={field} />
              </label>
              <label className={labelCls}>
                الجنس
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={field}>
                  <option value="female">أنثى</option>
                  <option value="male">ذكر</option>
                </select>
              </label>
            </>
          )}

          {tab === 'medical' && (
            <>
              {[
                ['allergies', 'الحساسية'],
                ['chronicDiseases', 'الأمراض المزمنة'],
                ['currentMedications', 'الأدوية الحالية'],
                ['previousSurgeries', 'عمليات سابقة'],
                ['notes', 'ملاحظات طبية'],
              ].map(([key, lab]) => (
                <label key={key} className={labelCls}>
                  {lab}
                  <textarea
                    value={med[key]}
                    onChange={(e) => setForm({ ...form, medicalInfo: { ...med, [key]: e.target.value } })}
                    className={`${field} min-h-[72px] resize-y`}
                    rows={2}
                  />
                </label>
              ))}
              {form.gender === 'female' && (
                <div className="space-y-2 rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] p-3 text-[13px]">
                  <label className="flex items-center gap-2 font-bold text-[#334155]">
                    <input type="checkbox" checked={!!med.isPregnant} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, isPregnant: e.target.checked } })} />
                    حامل
                  </label>
                  <label className="flex items-center gap-2 font-bold text-[#334155]">
                    <input type="checkbox" checked={!!med.isBreastfeeding} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, isBreastfeeding: e.target.checked } })} />
                    مرضعة
                  </label>
                </div>
              )}
            </>
          )}

          {tab === 'ads' && (
            <div>
              <p className="mb-2 text-[12px] text-[#64748B]">توقيع الموافقة على الإعلانات (اختياري)</p>
              <SignatureCanvas
                height={180}
                initialValue={form.adsStamp?.signature || null}
                onChange={(sig) => setForm({
                  ...form,
                  adsStamp: sig ? { signature: sig, stampedBy: 'العيادة', stampedAt: Date.now() } : null,
                })}
              />
            </div>
          )}

          <button type="submit" className={primary}>حفظ الملف</button>
        </div>
      </form>
    </div>
  );
};

export default CustomerFormModal;