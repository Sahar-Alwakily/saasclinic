import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { LASER_ZONES, SERVICE_CATEGORIES } from '../../constants/clinicCare';
import SignatureCanvas from './SignatureCanvas';

const SessionStampModal = ({ show, onClose, onSave, services = [], defaultRecorder = 'الطبيبة' }) => {
  const [selected, setSelected] = useState({});
  const [zones, setZones] = useState({});
  const [recordedBy, setRecordedBy] = useState(defaultRecorder);
  const [note, setNote] = useState('');
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    setSelected({});
    setZones({});
    setRecordedBy(defaultRecorder);
    setNote('');
    setSignature(null);
    setError('');
  }, [show, defaultRecorder]);

  const grouped = useMemo(() => {
    const map = {};
    SERVICE_CATEGORIES.forEach((c) => { map[c.id] = []; });
    (services || []).forEach((s) => {
      const cat = s.category || 'general';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [services]);

  if (!show) return null;

  const toggleService = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleZone = (serviceId, zoneId) => {
    setZones((prev) => {
      const cur = prev[serviceId] || [];
      return { ...prev, [serviceId]: cur.includes(zoneId) ? cur.filter((z) => z !== zoneId) : [...cur, zoneId] };
    });
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const picked = (services || []).filter((s) => selected[s.id]);
    if (!picked.length) return setError('اختاري خدمة واحدة على الأقل');
    if (!signature) return setError('التوقيع إلزامي');
    if (!recordedBy.trim()) return setError('من سجّل الجلسة مطلوب');
    for (const s of picked) {
      if (s.category === 'laser' && !(zones[s.id] || []).length) {
        return setError(`حددي منطقة ليزر لخدمة ${s.title}`);
      }
    }
    const groupId = `g_${Date.now()}`;
    const now = new Date().toISOString();
    const rows = picked.map((s) => {
      const z = s.category === 'laser' ? (zones[s.id] || []) : [];
      const labels = z.map((id) => LASER_ZONES.find((x) => x.id === id)?.label || id);
      return {
        id: `${Date.now()}_${s.id}_${Math.random().toString(36).slice(2, 8)}`,
        groupId,
        serviceId: s.id,
        serviceTitle: s.title,
        category: s.category || 'general',
        laserZones: z,
        laserZonesLabels: labels,
        note: note.trim(),
        signature,
        recordedBy: recordedBy.trim(),
        recordedAt: now,
        createdAt: now,
      };
    });
    onSave(rows);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <form onSubmit={submit} className="bg-white dark:bg-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg dark:text-white">تسجيل جلسة جديدة (مع توقيع)</h3>
          <button type="button" onClick={onClose} className="text-gray-400"><FaTimes /></button>
        </div>
        {error && <p className="text-sm text-rose-600 bg-rose-50 p-2 rounded-xl">{error}</p>}

        <div className="space-y-3">
          {SERVICE_CATEGORIES.map((cat) => (
            (grouped[cat.id] || []).length > 0 && (
              <div key={cat.id}>
                <p className="text-xs font-bold text-violet-500 mb-2">{cat.name}</p>
                <div className="space-y-2">
                  {(grouped[cat.id] || []).map((s) => (
                    <div key={s.id} className={`rounded-xl border p-3 ${selected[s.id] ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-100 dark:border-slate-700'}`}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggleService(s.id)} className="accent-violet-500" />
                        <span className="font-bold text-sm dark:text-white">{s.title}</span>
                      </label>
                      {selected[s.id] && s.category === 'laser' && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {LASER_ZONES.map((z) => (
                            <button
                              key={z.id}
                              type="button"
                              onClick={() => toggleZone(s.id, z.id)}
                              className={`text-[11px] px-2 py-1 rounded-full border ${(zones[s.id] || []).includes(z.id) ? 'bg-violet-500 text-white border-violet-500' : 'border-gray-200 dark:border-slate-600'}`}
                            >
                              {z.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        <label className="block text-sm font-bold">من سجّل الجلسة
          <input value={recordedBy} onChange={(e) => setRecordedBy(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl dark:bg-slate-700 dark:text-white" />
        </label>
        <label className="block text-sm font-bold">ملاحظة (اختياري)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full p-2.5 border rounded-xl dark:bg-slate-700 dark:text-white" />
        </label>
        <SignatureCanvas onChange={setSignature} height={200} />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 rounded-xl">إلغاء</button>
          <button type="submit" className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl font-bold">حفظ الجلسات</button>
        </div>
      </form>
    </div>
  );
};

export default SessionStampModal;
