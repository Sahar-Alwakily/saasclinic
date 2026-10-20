import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { FaTimes, FaPen, FaTrash, FaChevronDown } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { SERVICE_CATEGORIES } from '../../constants/clinicCare';

const EditInstructionsModal = ({ show, onClose, serviceName, phase, initial, onSaved }) => {
  const { clinicPath } = useClinic();
  const [rows, setRows] = useState(initial || ['']);
  useEffect(() => { setRows(initial?.length ? initial : ['']); }, [initial, show]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-md space-y-3">
        <h4 className="font-bold">تعديل تعليمات {phase === 'during' ? 'أثناء' : 'بعد'} · {serviceName}</h4>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input value={r} onChange={(e) => setRows(rows.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1 p-2 border rounded-xl dark:bg-slate-700" />
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-rose-500"><FaTrash /></button>
          </div>
        ))}
        <button type="button" className="text-xs font-bold text-violet-600" onClick={() => setRows([...rows, ''])}>+ سطر</button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-xl">إلغاء</button>
          <button
            type="button"
            className="flex-1 py-2 bg-violet-600 text-white rounded-xl font-bold"
            onClick={async () => {
              const arr = rows.map((x) => x.trim()).filter(Boolean);
              await set(ref(database, clinicPath(`treatments/customInstructions/${serviceName}/${phase}`)), arr);
              toast.success('حُفظت التعليمات');
              onSaved?.();
              onClose();
            }}
          >حفظ</button>
        </div>
      </div>
    </div>
  );
};

const InstructionsList = ({ show, onClose }) => {
  const { clinicPath } = useClinic();
  const [services, setServices] = useState([]);
  const [instructions, setInstructions] = useState({});
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    if (!show || !clinicPath) return undefined;
    const u1 = onValue(ref(database, clinicPath('services')), (s) => {
      setServices(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u2 = onValue(ref(database, clinicPath('treatments/customInstructions')), (s) => setInstructions(s.val() || {}));
    return () => { u1(); u2(); };
  }, [show, clinicPath]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (term && !String(s.title || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [services, cat, q]);

  if (!show) return null;

  const del = async (s) => {
    if (!window.confirm(`حذف الخدمة «${s.title}» وتعليماتها؟`)) return;
    try {
      await remove(ref(database, clinicPath(`services/${s.id}`)));
      if (s.title) await remove(ref(database, clinicPath(`treatments/customInstructions/${s.title}`)));
      toast.success('حُذفت الخدمة');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#f3efe6] dark:bg-slate-900 overflow-y-auto" dir="rtl">
      <div className="sticky top-0 bg-white dark:bg-slate-800 border-b p-4 flex justify-between items-center">
        <h2 className="font-bold text-lg">تعليمات الخدمات</h2>
        <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"><FaTimes /></button>
      </div>
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="w-full p-3 rounded-xl border dark:bg-slate-800" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => setCat('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${cat === 'all' ? 'bg-violet-600 text-white' : 'bg-white'}`}>الكل</button>
          {SERVICE_CATEGORIES.map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${cat === c.id ? 'bg-violet-600 text-white' : 'bg-white'}`}>{c.name}</button>
          ))}
        </div>
        {list.map((s) => {
          const ins = instructions[s.title] || {};
          const open = openId === s.id;
          return (
            <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setOpenId(open ? null : s.id)} className="w-full text-right p-4 flex justify-between items-center">
                <span className="font-bold dark:text-white">{s.title}</span>
                <FaChevronDown className={`text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-3 text-sm">
                  {['during', 'after'].map((ph) => (
                    <div key={ph} className="rounded-xl bg-stone-50 dark:bg-slate-700/50 p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold">{ph === 'during' ? 'أثناء العلاج' : 'بعد العلاج'}</span>
                        <button type="button" className="text-violet-600" onClick={() => setEdit({ serviceName: s.title, phase: ph, initial: ins[ph] || [] })}><FaPen /></button>
                      </div>
                      {(ins[ph] || []).length ? (ins[ph] || []).map((line, i) => <p key={i}>• {line}</p>) : <p className="text-stone-400">لا تعليمات</p>}
                    </div>
                  ))}
                  <button type="button" onClick={() => del(s)} className="text-rose-500 text-xs font-bold">حذف الخدمة</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <EditInstructionsModal
        show={!!edit}
        onClose={() => setEdit(null)}
        serviceName={edit?.serviceName}
        phase={edit?.phase}
        initial={edit?.initial}
      />
    </div>
  );
};

export default InstructionsList;
