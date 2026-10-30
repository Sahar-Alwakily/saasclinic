import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { FaTimes, FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { database } from '../../APIFirebase/firebase';
import { useClinic } from '../../context/ClinicContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { WHATSAPP_TEMPLATE_ID, DEFAULT_INSTRUCTIONS, matchInstructionKey, phaseLabel } from '../../constants/clinicCare';

function clean(s) {
  return String(s || '').replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildTemplateVariables({ name, serviceName, phase, instructions, note }) {
  let four = clean(`${instructions}${note ? ` — ${note}` : ''}`);
  if (four.length > 1024) four = `${four.slice(0, 1020)}…`;
  return {
    1: clean(name) || 'عميلة',
    2: clean(serviceName) || 'جلسة',
    3: clean(phaseLabel(phase)),
    4: four || 'تعليمات العيادة',
  };
}

const WhatsAppInstructionsModal = ({ show, onClose, client, treatment, activePhase }) => {
  const { clinicPath } = useClinic();
  const { sendTemplate, scheduleMessage } = useWhatsApp();
  const phase = activePhase || treatment?.currentPhase || 'during';
  const serviceName = treatment?.serviceName || '';
  const treatmentId = treatment?.id;
  const clientId = client?.clientId;

  const [source, setSource] = useState('fallback');
  const [lines, setLines] = useState([]);
  const [draft, setDraft] = useState('');
  const [days, setDays] = useState(3);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!show || !clinicPath || !clientId || !treatmentId || !serviceName) return undefined;
    let overrideVal = null;
    let templateVal = null;
    const apply = () => {
      if (overrideVal && overrideVal.length) {
        setSource('override');
        setLines(overrideVal);
        setDraft(overrideVal.join('\n'));
      } else if (templateVal && templateVal.length) {
        setSource('template');
        setLines(templateVal);
        setDraft(templateVal.join('\n'));
      } else {
        const key = matchInstructionKey(serviceName);
        const fb = DEFAULT_INSTRUCTIONS[key]?.[phase] || DEFAULT_INSTRUCTIONS.default[phase];
        setSource('fallback');
        setLines(fb);
        setDraft(fb.join('\n'));
      }
    };
    const u1 = onValue(ref(database, clinicPath(`treatments/clientOverrides/${clientId}/${treatmentId}/${phase}`)), (s) => {
      overrideVal = s.val();
      apply();
    });
    const u2 = onValue(ref(database, clinicPath(`treatments/customInstructions/${serviceName}/${phase}`)), (s) => {
      templateVal = s.val();
      apply();
    });
    apply();
    return () => { u1(); u2(); };
  }, [show, clinicPath, clientId, treatmentId, serviceName, phase]);

  const vars = useMemo(() => buildTemplateVariables({
    name: client?.customerName,
    serviceName,
    phase,
    instructions: draft,
    note: treatment?.note || '',
  }), [client, serviceName, phase, draft, treatment]);

  if (!show) return null;

  const saveOverride = async () => {
    const arr = draft.split('\n').map((x) => x.trim()).filter(Boolean);
    await set(ref(database, clinicPath(`treatments/clientOverrides/${clientId}/${treatmentId}/${phase}`)), arr);
    toast.success('حُفظت كتعليمات لهذه العميلة');
  };

  const saveTemplate = async () => {
    if (!window.confirm('حفظ كقالب رسمي لكل العميلات لهذه الخدمة؟')) return;
    const arr = draft.split('\n').map((x) => x.trim()).filter(Boolean);
    await set(ref(database, clinicPath(`treatments/customInstructions/${serviceName}/${phase}`)), arr);
    toast.success('حُفظ القالب الرسمي');
  };

  const markAfter = async () => {
    await update(ref(database, clinicPath(`customers/${clientId}/treatments/${treatmentId}`)), {
      currentPhase: 'after',
      phaseStartedAt: new Date().toISOString(),
    });
  };

  const send = async (mode) => {
    setSending(true);
    try {
      const phone = client.phoneNumber;
      const tpl = treatment?.templateId || WHATSAPP_TEMPLATE_ID;
      if (mode === 'now' || mode === 'now_and_schedule') {
        await sendTemplate(phone, tpl, vars);
      }
      if (mode === 'schedule_only' || mode === 'now_and_schedule') {
        await scheduleMessage({ phone, templateId: tpl, vars, days: Number(days) || 3 });
      }
      await markAfter();
      toast.success('تم، ونُقلت المرحلة إلى بعد العلاج');
      onClose();
    } catch {
      toast.error('تعذّر الإرسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="bg-[#172B3A] text-white p-4 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2"><FaWhatsapp /> تعليمات واتساب</h3>
          <button type="button" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-stone-500">المصدر: {source === 'override' ? 'تعليمات العميلة' : source === 'template' ? 'قالب الخدمة' : 'افتراضي'}</p>
          <p className="text-sm font-bold dark:text-white">{client?.customerName} · {serviceName} · {phaseLabel(phase)}</p>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:text-white text-sm" />
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={saveOverride} className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-700">حفظ لهذه العميلة</button>
            <button type="button" onClick={saveTemplate} className="px-3 py-2 rounded-xl bg-violet-50 text-violet-700">حفظ كقالب رسمي</button>
          </div>
          <label className="text-xs block">أيام الجدولة
            <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full p-2 border rounded-xl dark:bg-slate-700" />
          </label>
          <div className="grid gap-2">
            <button disabled={sending} type="button" onClick={() => send('now')} className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold">إرسال الآن</button>
            <button disabled={sending} type="button" onClick={() => send('now_and_schedule')} className="py-2.5 rounded-xl bg-teal-600 text-white font-bold">الآن + جدولة</button>
            <button disabled={sending} type="button" onClick={() => send('schedule_only')} className="py-2.5 rounded-xl border font-bold">جدولة فقط</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppInstructionsModal;
export { WHATSAPP_TEMPLATE_ID, buildTemplateVariables };
