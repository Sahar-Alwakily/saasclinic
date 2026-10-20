import React, { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { SERVICE_CATEGORIES } from '../../constants/clinicCare';

const AddServiceModal = ({ show, onClose, onAdded }) => {
  const { clinicPath } = useClinic();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('laser');
  const [during, setDuring] = useState(['']);
  const [after, setAfter] = useState(['']);
  const [saving, setSaving] = useState(false);

  if (!show) return null;

  const save = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('اسم الخدمة مطلوب');
    setSaving(true);
    try {
      const r = push(ref(database, clinicPath('services')));
      await set(r, { title: title.trim(), category, createdAt: Date.now() });
      const d = during.map((x) => x.trim()).filter(Boolean);
      const a = after.map((x) => x.trim()).filter(Boolean);
      if (d.length) await set(ref(database, clinicPath(`treatments/customInstructions/${title.trim()}/during`)), d);
      if (a.length) await set(ref(database, clinicPath(`treatments/customInstructions/${title.trim()}/after`)), a);
      toast.success('أُضيفت الخدمة');
      onAdded?.();
      setTitle('');
      setDuring(['']);
      setAfter(['']);
      onClose();
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const List = ({ rows, setRows, label }) => (
    <div>
      <p className="text-sm font-bold mb-1">{label}</p>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input value={row} onChange={(e) => setRows(rows.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1 p-2 border rounded-xl dark:bg-slate-700" />
          <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-rose-500"><FaTrash /></button>
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, ''])} className="text-xs text-violet-600 font-bold flex items-center gap-1"><FaPlus /> سطر</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[75] bg-black/50 flex items-center justify-center p-4" dir="rtl">
      <form onSubmit={save} className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
        <div className="flex justify-between">
          <h3 className="font-bold">إضافة خدمة جديدة</h3>
          <button type="button" onClick={onClose}><FaTimes /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم الخدمة *" className="w-full p-2.5 border rounded-xl dark:bg-slate-700" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-700">
          {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <List rows={during} setRows={setDuring} label="تعليمات أثناء العلاج" />
        <List rows={after} setRows={setAfter} label="تعليمات بعد العلاج" />
        <button disabled={saving} className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-bold">{saving ? 'جاري الحفظ...' : 'حفظ الخدمة'}</button>
      </form>
    </div>
  );
};

export default AddServiceModal;
