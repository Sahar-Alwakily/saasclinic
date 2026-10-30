import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import SignatureCanvas from './SignatureCanvas';

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
  }, [show, initial]);

  if (!show) return null;

  const med = form.medicalInfo || emptyMedical;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" dir="rtl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        <div className="bg-[#10b981] p-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/20"><FaTimes className="mx-auto" /></button>
        </div>
        {!medicalOnly && (
          <div className="flex gap-1.5 p-3 bg-[#f8faf9]">
            {[['profile', 'البيانات'], ['medical', 'المعلومات الطبية'], ['ads', 'ختم الإعلانات']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`flex-1 py-2 text-xs font-bold rounded-full ${tab === id ? 'bg-[#10b981] text-white' : 'bg-white text-emerald-800 border border-[#e4eee8]'}`}>{label}</button>
            ))}
          </div>
        )}
        <div className="p-5 space-y-3">
          {tab === 'profile' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="الاسم الأول *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" />
                <input placeholder="اسم العائلة" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" />
              </div>
              <input required placeholder="الهاتف *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" dir="ltr" />
              <input placeholder="رقم الهوية" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" dir="ltr" />
              <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" />
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200">
                <option value="female">أنثى</option>
                <option value="male">ذكر</option>
              </select>
            </>
          )}
          {tab === 'medical' && (
            <>
              <textarea placeholder="الحساسية" value={med.allergies} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, allergies: e.target.value } })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" rows={2} />
              <textarea placeholder="الأمراض المزمنة" value={med.chronicDiseases} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, chronicDiseases: e.target.value } })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" rows={2} />
              <textarea placeholder="الأدوية الحالية" value={med.currentMedications} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, currentMedications: e.target.value } })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" rows={2} />
              <textarea placeholder="عمليات سابقة" value={med.previousSurgeries} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, previousSurgeries: e.target.value } })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" rows={2} />
              <textarea placeholder="ملاحظات طبية" value={med.notes} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, notes: e.target.value } })} className="w-full p-2.5 border border-[#e4eee8] bg-[#f8faf9] rounded-xl outline-none focus:ring-2 focus:ring-emerald-200" rows={2} />
              {form.gender === 'female' && (
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!med.isPregnant} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, isPregnant: e.target.checked } })} /> حامل</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!med.isBreastfeeding} onChange={(e) => setForm({ ...form, medicalInfo: { ...med, isBreastfeeding: e.target.checked } })} /> مرضعة</label>
                </div>
              )}
            </>
          )}
          {tab === 'ads' && (
            <div>
              <p className="text-sm text-stone-500 mb-2">توقيع الموافقة على الإعلانات (اختياري)</p>
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
          <button type="submit" className="w-full bg-[#10b981] text-white py-3 rounded-xl font-bold">حفظ</button>
        </div>
      </form>
    </div>
  );
};

export default CustomerFormModal;
