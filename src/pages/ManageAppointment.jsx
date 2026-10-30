import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import {
  mergeAptSettings, slotKey, occupiedKeys, claimSlot, releaseSlot, appendHistory, APT_STATUSES,
} from '../utils/appointmentOps';
import { slotsForBooking as daySlots } from '../utils/scheduleSlots';

const ManageAppointment = () => {
  const { clinicId, token } = useParams();
  const [clinic, setClinic] = useState(null);
  const [settings, setSettings] = useState(mergeAptSettings(null));
  const [apt, setApt] = useState(null);
  const [aptId, setAptId] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!clinicId || !token) return undefined;
    const unsubs = [
      onValue(ref(database, `clinics/${clinicId}/info`), (s) => setClinic(s.val())),
      onValue(ref(database, `clinics/${clinicId}/appointmentSettings`), (s) => setSettings(mergeAptSettings(s.val()))),
      onValue(ref(database, `clinics/${clinicId}/scheduleSettings`), (s) => setSchedules(s.val() || {})),
      onValue(ref(database, `clinics/${clinicId}/appointments`), (s) => {
        const list = s.val() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : [];
        setAppointments(list);
      }),
      onValue(ref(database, `clinics/${clinicId}/manageTokens/${token}`), (s) => {
        const val = s.val();
        const id = val?.appointmentId || null;
        setAptId(id);
        setLoading(false);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicId, token]);

  useEffect(() => {
    if (!clinicId || !aptId) return undefined;
    return onValue(ref(database, `clinics/${clinicId}/appointments/${aptId}`), (s) => {
      setApt(s.exists() ? { id: aptId, ...s.val() } : null);
    });
  }, [clinicId, aptId]);

  const taken = useMemo(() => occupiedKeys(appointments.filter((a) => a.id !== aptId)), [appointments, aptId]);
  const altSlots = useMemo(() => {
    if (!apt || !newDate) return [];
    const info = daySlots(schedules, apt.branchId, apt.specialistId, newDate);
    return (info.slots || []).filter((t) => !taken.has(slotKey(apt.branchId, apt.specialistId, newDate, t)));
  }, [apt, newDate, schedules, taken]);

  const save = async (patch, historyEntry) => {
    await update(ref(database, `clinics/${clinicId}/appointments/${aptId}`), {
      ...patch,
      history: appendHistory(apt, historyEntry),
    });
  };

  const confirm = async () => {
    await save({ status: 'confirmed', extraConfirmedAt: Date.now() }, { action: 'confirmed', by: 'customer' });
    setMsg('تم تأكيد الموعد.');
  };

  const cancel = async () => {
    const oldKey = slotKey(apt.branchId, apt.specialistId, apt.date, apt.time);
    await save({
      status: 'cancelled',
      cancelReason: reason || '',
      cancelledAt: Date.now(),
    }, { action: 'cancelled', by: 'customer', reason: reason || '' });
    await releaseSlot(database, clinicId, oldKey, aptId);
    const waitRef = ref(database, `clinics/${clinicId}/waitlistEvents`);
    await push(waitRef, {
      type: 'vacancy',
      fromAppointmentId: aptId,
      service: apt.service,
      serviceId: apt.serviceId || '',
      branchId: apt.branchId,
      specialistId: apt.specialistId || '',
      date: apt.date,
      time: apt.time,
      price: 0,
      createdAt: Date.now(),
      open: true,
    });
    setMsg('أُلغي الموعد. يمكنكِ اختيار وقت بديل بالأسفل.');
  };

  const reschedule = async () => {
    if (!newDate || !newTime) return;
    const newKey = slotKey(apt.branchId, apt.specialistId, newDate, newTime);
    const ok = await claimSlot(database, clinicId, newKey, aptId);
    if (!ok) {
      setMsg('هذا الوقت لم يعد متاحاً.');
      return;
    }
    const oldKey = slotKey(apt.branchId, apt.specialistId, apt.date, apt.time);
    if (oldKey !== newKey) await releaseSlot(database, clinicId, oldKey, aptId);
    await save({
      date: newDate,
      time: newTime,
      status: settings.autoConfirm ? 'confirmed' : 'rescheduled',
    }, { action: 'rescheduled', by: 'customer', from: `${apt.date} ${apt.time}`, to: `${newDate} ${newTime}` });
    setMsg('تم تغيير الموعد.');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  if (!apt) return <div className="min-h-screen flex items-center justify-center text-gray-500">الرابط غير صالح أو انتهت صلاحيته.</div>;

  const statusLabel = APT_STATUSES.find((s) => s.id === apt.status)?.label || apt.status;
  const primary = clinic?.primaryColor || '#ec4899';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-6 shadow-sm space-y-4">
        <p className="text-xs text-gray-400">{clinic?.name}</p>
        <h1 className="text-2xl font-bold">إدارة الموعد</h1>
        <p className="font-bold">{apt.service}</p>
        <p className="text-sm text-gray-500">{apt.date} · {apt.time} · {apt.branchName}</p>
        <p className="text-sm">الحالة: {statusLabel}</p>
        {settings.cancellationPolicy && (
          <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">{settings.cancellationPolicy}</p>
        )}
        {msg && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl">{msg}</p>}

        {['pending', 'confirmed'].includes(apt.status) && (
          <div className="flex flex-wrap gap-2">
            <button onClick={confirm} className="px-4 py-2 rounded-xl text-white font-bold" style={{ backgroundColor: primary }}>تأكيد الموعد</button>
            <button onClick={cancel} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold">إلغاء</button>
          </div>
        )}
        {['pending', 'confirmed'].includes(apt.status) && (
          <div>
            <label className="text-sm">سبب الإلغاء (اختياري)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl" />
          </div>
        )}

        {['pending', 'confirmed', 'cancelled', 'noshow'].includes(apt.status) && (
          <div className="space-y-2 border-t pt-4">
            <h2 className="font-bold">إعادة الجدولة</h2>
            <input type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setNewTime(''); }} className="w-full p-2.5 border rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              {altSlots.map((t) => (
                <button key={t} type="button" onClick={() => setNewTime(t)} className={`p-2 border rounded-xl text-sm ${newTime === t ? 'font-bold' : ''}`} style={{ borderColor: newTime === t ? primary : undefined }}>{t}</button>
              ))}
            </div>
            <button disabled={!newDate || !newTime} onClick={reschedule} className="w-full py-2 rounded-xl text-white font-bold disabled:opacity-40" style={{ backgroundColor: primary }}>حفظ الموعد الجديد</button>
          </div>
        )}

        {Array.isArray(apt.history) && apt.history.length > 0 && (
          <div className="text-xs text-gray-400 space-y-1">
            <p className="font-bold text-gray-500">سجل التغييرات</p>
            {apt.history.slice().reverse().map((h, i) => (
              <p key={i}>{new Date(h.at).toLocaleString('ar')} — {h.action} {h.reason ? `(${h.reason})` : ''}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAppointment;
