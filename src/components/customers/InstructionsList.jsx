import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
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
        <button type="button" className="text-xs font-bold text-emerald-700" onClick={() => setRows([...rows, ''])}>+ سطر</button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold">إلغاء</button>
          <button
            type="button"
            className="flex-1 py-2 bg-[#10b981] text-white rounded-xl font-bold"
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

const InstructionsList = ({ show = true, onClose, embedded = false }) => {
  const { clinicPath } = useClinic();
  const [services, setServices] = useState([]);
  const [instructions, setInstructions] = useState({});
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    if ((!embedded && !show) || !clinicPath) return undefined;
    const u1 = onValue(ref(database, clinicPath('services')), (s) => {
      setServices(s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
    const u2 = onValue(ref(database, clinicPath('treatments/customInstructions')), (s) => setInstructions(s.val() || {}));
    return () => { u1(); u2(); };
  }, [show, embedded, clinicPath]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (term && !String(s.title || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [services, cat, q]);

  if (!embedded && !show) return null;

  const inner = (
    <div className="space-y-3" dir="rtl">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في الخدمات..." className="w-full p-3 rounded-xl bg-[#f8faf9] border border-[#e4eee8] outline-none text-sm" />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => setCat('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cat === 'all' ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>الكل</button>
        {SERVICE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cat === c.id ? 'bg-[#10b981] text-white' : 'bg-emerald-50 text-emerald-800'}`}>{c.name}</button>
        ))}
      </div>
      {!list.length && <p className="text-sm text-[#8a9199] py-8 text-center">لا خدمات بعد — أضيفي الخدمة من قسم الخدمات.</p>}
      {list.map((s) => {
        const ins = instructions[s.title] || {};
        const open = openId === s.id;
        return (
          <div key={s.id} className="saas-card overflow-hidden">
            <button type="button" onClick={() => setOpenId(open ? null : s.id)} className="w-full text-right p-4 flex justify-between items-center">
              <span className="font-bold text-[#111827]">{s.title}</span>
              <FaChevronDown className={`text-[#8a9199] transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                {['during', 'after'].map((ph) => (
                  <div key={ph} className={`rounded-xl p-3 ${ph === 'during' ? 'bg-sky-50' : 'bg-emerald-50'}`}>
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">{ph === 'during' ? 'أثناء العلاج' : 'بعد العلاج'}</span>
                      <button type="button" className="text-emerald-700" onClick={() => setEdit({ serviceName: s.title, phase: ph, initial: ins[ph] || [] })}><FaPen /></button>
                    </div>
                    {(ins[ph] || []).length ? (ins[ph] || []).map((line, i) => <p key={i}>• {line}</p>) : <p className="text-[#8a9199]">لا تعليمات</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <EditInstructionsModal
        show={!!edit}
        onClose={() => setEdit(null)}
        serviceName={edit?.serviceName}
        phase={edit?.phase}
        initial={edit?.initial}
      />
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="fixed inset-0 z-[70] bg-white overflow-y-auto" dir="rtl">
      <div className="sticky top-0 bg-white border-b border-[#e4eee8] p-4 flex justify-between items-center">
        <h2 className="font-bold text-lg">تعليمات الخدمات</h2>
        <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center"><FaTimes /></button>
      </div>
      <div className="p-4 max-w-3xl mx-auto">{inner}</div>
    </div>
  );
};

export default InstructionsList;
