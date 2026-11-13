import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { onValue, push, ref, set, update } from 'firebase/database';
import { database } from '../../APIFirebase/firebase';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ShellNavContext } from './shellNav';
import { useClinic } from '../../context/ClinicContext';
import ConsoleChat from '../assistant/ConsoleChat';

function ClinicIndexSync() {
  const { clinicId, clinicInfo, clinicPath, isSupport } = useClinic();
  useEffect(() => {
    if (!clinicId || !clinicPath) return undefined;
    const state = { staffCount: 0, bookingCount: 0, clientCount: 0, orderCount: 0 };
    let timer;
    const flush = () => {
      const patch = {
        ...state,
        name: clinicInfo?.name || null,
        ownerEmail: clinicInfo?.ownerEmail || null,
        ownerName: clinicInfo?.ownerName || null,
        phone: clinicInfo?.phone || null,
        plan: clinicInfo?.plan || 'trial',
        isActive: clinicInfo?.isActive !== false,
        trialEndsAt: clinicInfo?.trialEndsAt || null,
        trialStartedAt: clinicInfo?.trialStartedAt || clinicInfo?.createdAt || null,
        storeTheme: clinicInfo?.storeTheme || 'beauty',
        websitePublished: clinicInfo?.websitePublished !== false,
        subscriptionStatus: clinicInfo?.subscriptionStatus || clinicInfo?.plan || null,
      };
      if (!isSupport) patch.lastActivityAt = Date.now();
      update(ref(database, `meta/clinics/${clinicId}`), patch).catch(() => {});
    };
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, 900);
    };
    const count = (snap) => (snap.exists() && snap.val() ? Object.keys(snap.val()).length : 0);
    const unsubs = [
      onValue(ref(database, clinicPath('users')), (s) => { state.staffCount = count(s); bump(); }),
      onValue(ref(database, clinicPath('appointments')), (s) => { state.bookingCount = count(s); bump(); }),
      onValue(ref(database, clinicPath('customers')), (s) => { state.clientCount = count(s); bump(); }),
      onValue(ref(database, clinicPath('orders')), (s) => { state.orderCount = count(s); bump(); }),
    ];
    return () => { unsubs.forEach((u) => u()); clearTimeout(timer); };
  }, [clinicId, clinicPath, clinicInfo, isSupport]);
  return null;
}

function SupportAuditWatcher() {
  const { userMeta, user } = useAuth();
  const { clinicId, clinicPath } = useClinic();
  useEffect(() => {
    if (userMeta?.role !== 'support' || !clinicId || !clinicPath) return undefined;
    let first = { info: true, services: true, users: true };
    const log = (action, title) => {
      set(push(ref(database, 'platform/auditLog')), {
        type: 'support_write',
        action,
        title,
        clinicId,
        by: user?.email || userMeta.impersonatorEmail,
        at: Date.now(),
      }).catch(() => {});
      set(push(ref(database, `clinics/${clinicId}/adminAudit`)), {
        action, title, by: user?.email || userMeta.impersonatorEmail, at: Date.now(),
      }).catch(() => {});
    };
    const unsubs = [
      onValue(ref(database, clinicPath('info')), () => {
        if (first.info) { first.info = false; return; }
        log('info_change', 'تعديل بيانات العيادة أثناء جلسة دعم');
      }),
      onValue(ref(database, clinicPath('services')), () => {
        if (first.services) { first.services = false; return; }
        log('services_change', 'تعديل الخدمات أثناء جلسة دعم');
      }),
      onValue(ref(database, clinicPath('users')), () => {
        if (first.users) { first.users = false; return; }
        log('users_change', 'تعديل الفريق أثناء جلسة دعم');
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [userMeta, user, clinicId, clinicPath]);
  return null;
}

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { plan, trialExpired, isSupport } = useClinic();
  const { endSupport, userMeta } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <ShellNavContext.Provider value={{ open, setOpen }}>
      <div dir="rtl" className="saas-app flex h-dvh font-sans overflow-hidden">
        {open && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <ClinicIndexSync />
        <SupportAuditWatcher />
        <Sidebar />
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-clip no-scrollbar">
          <Topbar />
          {isSupport && (
            <div className="mx-4 sm:mx-6 mt-3 rounded-2xl bg-[#111827] text-white text-sm px-4 py-2.5 flex flex-wrap justify-between gap-2">
              <span>جلسة مسؤولة دعم · {userMeta?.impersonatorEmail} · كل تعديل يُسجَّل في التدقيق</span>
              <button type="button" onClick={() => endSupport()} className="font-semibold underline">إنهاء الجلسة</button>
            </div>
          )}
          {trialExpired && (
            <div className="mx-4 sm:mx-6 mt-3 rounded-2xl bg-[#fff7ed] text-[#c2410c] text-sm px-4 py-2.5 flex flex-wrap justify-between gap-2 border border-[#ffedd5]">
              <span>انتهت الفترة التجريبية. الكونسول مفتوح حتى ربط الدفع.</span>
              <Link to="/billing" className="font-semibold text-[#111827]">الباقات</Link>
            </div>
          )}
          {plan?.id && plan.id !== 'trial' && (
            <p className="mx-4 sm:mx-6 mt-2 text-[11px] text-[#8a9199]">باقة {plan.name}</p>
          )}
          <main className={`p-4 sm:p-6 lg:px-8 lg:py-6 w-full pb-[max(1.5rem,env(safe-area-inset-bottom))] ${pathname.startsWith('/treatments') || pathname.startsWith('/customers') ? 'bg-[#f8fafc]' : pathname === '/dashboard' || pathname.startsWith('/appointments') ? 'bg-[#eef0ff]' : 'max-w-[1360px] mx-auto'}`}>
            <Outlet />
          </main>
          <ConsoleChat />
        </div>
      </div>
    </ShellNavContext.Provider>
  );
};

export default DashboardLayout;
