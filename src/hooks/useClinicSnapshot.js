import { useEffect, useMemo, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { buildConsoleBrief } from '../utils/consoleBrief';

function listFrom(snap) {
  const v = snap.val();
  return v ? Object.entries(v).map(([id, item]) => ({ id, ...item })) : [];
}

export function useClinicSnapshot(pathname) {
  const { clinicPath, clinicId, clinicInfo, loadingClinic, userRole, userCategory, plan, hasCap } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [branches, setBranches] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [messages, setMessages] = useState([]);
  const [blog, setBlog] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (loadingClinic || !clinicId || !clinicPath) return undefined;
    const fail = () => {};
    const unsubs = [
      onValue(ref(database, clinicPath('appointments')), (snap) => {
        let all = listFrom(snap);
        if (userRole === 'worker' && userCategory) {
          all = all.filter((apt) => apt.category === userCategory);
        }
        setAppointments(all);
      }, fail),
      onValue(ref(database, clinicPath('customers')), (s) => setCustomers(listFrom(s)), fail),
      onValue(ref(database, clinicPath('services')), (s) => setServices(listFrom(s)), fail),
      onValue(ref(database, clinicPath('scheduleSettings')), (s) => setSchedules(s.val() || {}), fail),
      onValue(ref(database, clinicPath('branches')), (s) => setBranches(listFrom(s)), fail),
      onValue(ref(database, clinicPath('waitlist')), (s) => setWaitlist(listFrom(s)), fail),
      onValue(ref(database, clinicPath('winbackMessages')), (s) => setMessages(listFrom(s)), fail),
      onValue(ref(database, clinicPath('blog')), (s) => setBlog(listFrom(s)), fail),
      onValue(ref(database, clinicPath('appointmentSettings')), (s) => setSettings(s.val()), fail),
    ];
    return () => unsubs.forEach((u) => u());
  }, [clinicPath, clinicId, loadingClinic, userRole, userCategory]);

  const brief = useMemo(
    () => buildConsoleBrief({
      pathname,
      clinicInfo,
      clinicId,
      plan,
      hasCap,
      appointments,
      customers,
      services,
      schedules,
      branches,
      waitlist,
      messages,
      blog,
      settings,
    }),
    [pathname, clinicInfo, clinicId, plan, hasCap, appointments, customers, services, schedules, branches, waitlist, messages, blog, settings],
  );

  return brief;
}
