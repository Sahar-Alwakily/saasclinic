import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { FaTimes, FaCheck, FaArrowLeft, FaShoppingBag, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';

import SectionRenderer from '../engine/SectionRenderer';
import { clinicSections } from '../utils/clinicDraft';
import { getPreviewClinic } from '../components/themes/previewData';
import { DRAFT_STORAGE_KEY } from '../components/themes/themeUtils';
import { slotsForBooking } from '../utils/scheduleSlots';
import {
  mergeAptSettings, slotKey, occupiedKeys, claimSlot, makeToken, appendHistory,
  needsExtraConfirm, isHoliday, manageUrl,
} from '../utils/appointmentOps';
import { hasCap } from '../config/plans';
import { useLocale } from '../context/LocaleContext';
import LangSwitcher from '../components/i18n/LangSwitcher';

const PublicBooking = () => {
  const { t, dir } = useLocale();
  const { clinicId } = useParams();
  const [searchParams] = useSearchParams();
  const isDraft = searchParams.get('draft') === '1';
  const preview = useMemo(() => getPreviewClinic(clinicId), [clinicId]);
  const draftRef = useRef(null);

  const [clinic, setClinic] = useState(preview?.clinic || null);
  const [services, setServices] = useState(preview?.services || []);
  const [products, setProducts] = useState(preview?.products || []);
  const [branches, setBranches] = useState(preview?.branches || []);
  const [posts, setPosts] = useState(preview?.posts || []);
  const [loading, setLoading] = useState(!preview);

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [orderData, setOrderData] = useState({ name: '', phone: '', address: '' });

  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const emptyBooking = { service: '', serviceId: '', specialistId: '', specialistName: '', date: '', time: '', name: '', phone: '', branchId: '', branchName: '' };
  const [bookingData, setBookingData] = useState(emptyBooking);
  const [isSuccess, setIsSuccess] = useState(false);
  const [schedules, setSchedules] = useState({});
  const [staff, setStaff] = useState([]);
  const [bookedApts, setBookedApts] = useState([]);
  const [aptSettings, setAptSettings] = useState(mergeAptSettings(null));
  const [policyOk, setPolicyOk] = useState(false);
  const [extraOk, setExtraOk] = useState(false);
  const [manageLink, setManageLink] = useState('');
  const queryApplied = useRef(false);

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${clinicId}`);
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [clinicId]);

  useEffect(() => {
    if (cart.length > 0) localStorage.setItem(`cart_${clinicId}`, JSON.stringify(cart));
    else localStorage.removeItem(`cart_${clinicId}`);
  }, [cart, clinicId]);

  useEffect(() => {
    const applyDraft = (payload) => {
      if (!payload) return;
      draftRef.current = payload;
      setClinic((prev) => ({ ...(prev || {}), ...payload, _demo: false }));
      setLoading(false);
    };

    const fromStorage = () => {
      try {
        const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        const draft = raw ? JSON.parse(raw) : null;
        if (draft?.clinicId === clinicId && draft.clinic) applyDraft(draft.clinic);
      } catch {
        /* ignore */
      }
    };

    if (isDraft) fromStorage();

    const onMsg = (event) => {
      if (event.data?.type === 'clinic-draft' && event.data.clinicId === clinicId) {
        applyDraft(event.data.clinic);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [clinicId, isDraft]);

  useEffect(() => {
    if (!clinicId || preview) return;
    const unsubInfo = onValue(ref(database, `clinics/${clinicId}/info`), (snap) => {
      const val = snap.val();
      setClinic(val ? { ...val, ...(draftRef.current || {}) } : draftRef.current);
      setLoading(false);
    });
    const unsubServ = onValue(ref(database, `clinics/${clinicId}/services`), (snap) => {
      const val = snap.val();
      setServices(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubProd = onValue(ref(database, `clinics/${clinicId}/products`), (snap) => {
      const val = snap.val();
      setProducts(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubBranch = onValue(ref(database, `clinics/${clinicId}/branches`), (snap) => {
      const val = snap.val();
      setBranches(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubBlog = onValue(ref(database, `clinics/${clinicId}/blog`), (snap) => {
      const val = snap.val();
      setPosts(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubSched = onValue(ref(database, `clinics/${clinicId}/scheduleSettings`), (snap) => {
      setSchedules(snap.val() || {});
    });
    const unsubUsers = onValue(ref(database, `clinics/${clinicId}/users`), (snap) => {
      const val = snap.val();
      const list = val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : [];
      setStaff(list.filter((u) => u.role !== 'admin'));
    });
    const unsubApts = onValue(ref(database, `clinics/${clinicId}/appointments`), (snap) => {
      setBookedApts(snap.val() ? Object.entries(snap.val()).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubAptSet = onValue(ref(database, `clinics/${clinicId}/appointmentSettings`), (snap) => {
      setAptSettings(mergeAptSettings(snap.val()));
    });
    return () => { unsubInfo(); unsubServ(); unsubProd(); unsubBranch(); unsubBlog(); unsubSched(); unsubUsers(); unsubApts(); unsubAptSet(); };
  }, [clinicId, preview]);

  const handleCheckout = async () => {
    if (!orderData.name || !orderData.phone || !orderData.address) return alert(t('book.fillAll'));
    if (preview || isDraft) {
      setCart([]);
      setCheckoutStep(3);
      return;
    }
    try {
      const orderRef = push(ref(database, `clinics/${clinicId}/orders`));
      await set(orderRef, {
        customerInfo: orderData,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        status: 'pending',
        createdAt: Date.now(),
      });
      setCart([]);
      setCheckoutStep(3);
    } catch (error) {
      alert(t('book.error'));
    }
  };

  const handleBookSubmit = async () => {
    if (!bookingData.branchId) return alert(t('book.pickBranchFirst'));
    if (preview || isDraft) {
      setIsSuccess(true);
      return;
    }
    try {
      const price = Number((services.find((s) => s.id === bookingData.serviceId || s.title === bookingData.service) || {}).price || 0);
      if (needsExtraConfirm(price, aptSettings) && !extraOk) return alert(t('book.extraAlert'));
      if (!policyOk) return alert(t('book.policyAlert'));
      const specialistId = bookingData.specialistId || '';
      const key = slotKey(bookingData.branchId, specialistId, bookingData.date, bookingData.time);
      const aptRef = push(ref(database, `clinics/${clinicId}/appointments`));
      const locked = await claimSlot(database, clinicId, key, aptRef.key);
      if (!locked) return alert(t('book.slotGone'));
      const token = makeToken();
      const status = aptSettings.autoConfirm && !needsExtraConfirm(price, aptSettings) ? 'confirmed' : 'pending';
      await set(aptRef, {
        customerName: bookingData.name,
        phoneNumber: bookingData.phone,
        service: bookingData.service,
        serviceId: bookingData.serviceId || '',
        specialistId,
        specialistName: bookingData.specialistName || '',
        date: bookingData.date,
        time: bookingData.time,
        branchId: bookingData.branchId,
        branchName: bookingData.branchName,
        price,
        campaignId: searchParams.get('wb') || '',
        status,
        extraConfirmRequired: needsExtraConfirm(price, aptSettings),
        manageToken: token,
        reminderVariant: Math.random() < 0.5 ? 'A' : 'B',
        slotKey: key,
        createdAt: Date.now(),
        history: appendHistory({}, { action: 'created', by: 'customer', status }),
      });
      await set(ref(database, `clinics/${clinicId}/manageTokens/${token}`), { appointmentId: aptRef.key });
      setManageLink(manageUrl(clinicId, token));
      setIsSuccess(true);
    } catch (error) {
      alert(t('book.error'));
    }
  };

  const applyServiceToBooking = (next, serviceId) => {
    const s = services.find((x) => x.id === serviceId);
    if (!s) return next;
    return {
      ...next,
      serviceId: s.id,
      service: s.title,
      specialistId: s.specialistId || '',
      specialistName: s.specialistName || '',
    };
  };

  const openBooking = (opts = {}) => {
    let next = { ...emptyBooking };
    if (opts.serviceId) next = applyServiceToBooking(next, opts.serviceId);
    if (opts.branchId) {
      const b = branches.find((x) => x.id === opts.branchId);
      next.branchId = opts.branchId;
      next.branchName = b?.name || '';
    }
    setBookingData(next);
    setIsSuccess(false);
    setShowBooking(true);
    if (next.branchId && next.serviceId) setBookingStep(3);
    else if (next.branchId) setBookingStep(2);
    else setBookingStep(1);
  };

  useEffect(() => {
    if (queryApplied.current || loading || !clinic) return;
    const sid = searchParams.get('service');
    const bid = searchParams.get('branch');
    if (searchParams.get('book') !== '1') return;
    if (sid && services.length === 0) return;
    if (bid && branches.length === 0) return;
    queryApplied.current = true;
    openBooking({ serviceId: sid || undefined, branchId: bid || undefined });
  }, [loading, clinic, services, branches, searchParams]);

  const selectedService = services.find((s) => s.id === bookingData.serviceId);
  const resolvedSpecialistId = bookingData.specialistId
    || staff.find((u) => u.branch === bookingData.branchId && selectedService && (u.category === selectedService.category || u.category === 'all'))?.id
    || '';
  let slotInfo = slotsForBooking(schedules, bookingData.branchId, resolvedSpecialistId, bookingData.date);
  const takenSlots = occupiedKeys(bookedApts);
  if (slotInfo.slots?.length) {
    slotInfo = {
      ...slotInfo,
      slots: slotInfo.slots.filter((t) => !takenSlots.has(slotKey(bookingData.branchId, resolvedSpecialistId || bookingData.specialistId, bookingData.date, t))),
    };
  }
  if (bookingData.date && isHoliday(bookingData.date, aptSettings)) {
    slotInfo = { ...slotInfo, slots: [], closed: true, missing: false, dayName: t('book.holiday') };
  }
  if ((preview || isDraft) && slotInfo.missing && bookingData.date) {
    const dayIdx = new Date(`${bookingData.date}T12:00:00`).getDay();
    if (dayIdx === 5 || dayIdx === 6) {
      slotInfo = { slots: [], closed: true, missing: false, dayName: dayIdx === 5 ? t('book.friday') : t('book.saturday') };
    } else {
      slotInfo = {
        slots: ['09:00 ص', '10:00 ص', '11:00 ص', '12:00 م', '01:00 م', '02:00 م', '03:00 م', '04:00 م'],
        closed: false,
        missing: false,
      };
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF4F0] text-[#3A2A28]" dir={dir}>
        <p className="font-display text-4xl mb-3">✦</p>
        <p className="tracking-[0.3em] text-xs uppercase opacity-60">{t('book.preparing')}</p>
      </div>
    );
  }
  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF4F0] text-[#8a6f68]" dir={dir}>
        {t('book.missing')}
      </div>
    );
  }

  const shopOn = hasCap(clinic, 'marketing');
  const themesOn = hasCap(clinic, 'websitePro');
  const publicProducts = shopOn && clinic.showProducts !== false ? products : [];
  const publicPosts = shopOn && clinic.showBlog !== false ? posts : [];
  const themeName = themesOn ? clinic.storeTheme : 'beauty';

  const pageClinic = { ...clinic, storeTheme: themeName, showProducts: shopOn && clinic.showProducts !== false, showBlog: shopOn && clinic.showBlog !== false };
  const pageSections = clinicSections(clinic);

  const primaryColor = clinic.primaryColor || '#C48B7A';
  const isDark = themeName === 'elegant';
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  const panelBg = isDark ? '#141210' : '#fff';
  const panelText = isDark ? '#F5EDE3' : '#3A2A28';

  return (
    <div className="relative" dir={dir}>
      <div className="fixed top-3 left-3 z-[90]"><LangSwitcher tone="light" /></div>
      <SectionRenderer
        sections={pageSections}
        clinic={pageClinic}
        services={services}
        products={publicProducts}
        branches={branches}
        posts={publicPosts}
        onOpenBooking={(opts) => openBooking(opts || {})}
        cart={cart}
        setCart={setCart}
        setShowCart={setShowCart}
        themeVariant={themeName}
      />

      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[100]" dir={dir}>
          <div className="rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" style={{ backgroundColor: panelBg, color: panelText }}>
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: `${primaryColor}33` }}>
              <h3 className="font-display text-2xl flex items-center gap-3">
                <span className="w-10 h-10 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: primaryColor }}><FaShoppingBag size={14} /></span>
                {t('book.cart')}
              </h3>
              <button onClick={() => { setShowCart(false); setCheckoutStep(1); }} className="w-10 h-10 rounded-full flex items-center justify-center opacity-60"><FaTimes /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {checkoutStep === 1 && (
                cart.length === 0
                  ? <div className="text-center py-16 opacity-60"><p className="font-display text-3xl mb-2">{t('book.cartEmpty')}</p><p className="text-sm">{t('book.cartHint')}</p></div>
                  : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl" style={{ backgroundColor: isDark ? '#1c1917' : '#FBF4F0' }}>
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10">
                            {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate">{item.title}</h4>
                            <p className="font-extrabold" style={{ color: primaryColor }}>{item.price} ₪</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button onClick={() => setCart(cart.filter((c) => c.id !== item.id))} className="text-rose-400 p-1"><FaTrash size={12} /></button>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setCart(cart.map((c) => c.id === item.id ? { ...c, qty: (c.qty || 1) + 1 } : c))} className="w-7 h-7 rounded-full border flex items-center justify-center"><FaPlus size={8} /></button>
                              <span className="w-5 text-center text-sm">{item.qty || 1}</span>
                              <button onClick={() => setCart(cart.map((c) => c.id === item.id ? { ...c, qty: Math.max(1, (c.qty || 1) - 1) } : c))} className="w-7 h-7 rounded-full border flex items-center justify-center"><FaMinus size={8} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              )}
              {checkoutStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-display text-2xl text-center">{t('book.delivery')}</h3>
                  <input type="text" placeholder={t('book.name')} value={orderData.name} onChange={(e) => setOrderData({ ...orderData, name: e.target.value })} className="w-full p-4 rounded-2xl outline-none border bg-transparent" />
                  <input type="tel" placeholder={t('book.phone')} value={orderData.phone} onChange={(e) => setOrderData({ ...orderData, phone: e.target.value })} className="w-full p-4 rounded-2xl outline-none border bg-transparent" dir="ltr" />
                  <textarea placeholder={t('book.address')} value={orderData.address} onChange={(e) => setOrderData({ ...orderData, address: e.target.value })} rows={3} className="w-full p-4 rounded-2xl outline-none border bg-transparent resize-none" />
                </div>
              )}
              {checkoutStep === 3 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}><FaCheck className="text-3xl" /></div>
                  <h3 className="font-display text-3xl mb-2">{t('book.orderOk')}</h3>
                  <p className="opacity-70 mb-6 text-sm">{t('book.orderNote')}</p>
                  <button onClick={() => { setShowCart(false); setCheckoutStep(1); setOrderData({ name: '', phone: '', address: '' }); }} className="px-8 py-3 text-white rounded-full font-bold" style={{ backgroundColor: primaryColor }}>{t('book.shopMore')}</button>
                </div>
              )}
            </div>
            {checkoutStep !== 3 && cart.length > 0 && (
              <div className="p-6 border-t" style={{ borderColor: `${primaryColor}33` }}>
                <div className="flex justify-between mb-5">
                  <span>{t('book.total')}</span>
                  <span className="text-2xl font-extrabold" style={{ color: primaryColor }}>{cartTotal} ₪</span>
                </div>
                {checkoutStep === 1
                  ? <button onClick={() => setCheckoutStep(2)} className="w-full text-white py-4 rounded-full font-bold" style={{ backgroundColor: primaryColor }}>{t('book.continue')}</button>
                  : (
                    <div className="flex gap-3">
                      <button onClick={() => setCheckoutStep(1)} className="w-1/3 border py-4 rounded-full font-bold">{t('book.back')}</button>
                      <button onClick={handleCheckout} className="w-2/3 text-white py-4 rounded-full font-bold" style={{ backgroundColor: primaryColor }}>{t('book.confirm')}</button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {showBooking && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" dir={dir} style={{ backgroundColor: isDark ? '#0C0B0A' : '#FBF4F0', color: panelText }}>
          <div className="sticky top-0 backdrop-blur px-5 py-4 flex justify-between items-center border-b" style={{ borderColor: `${primaryColor}33`, backgroundColor: isDark ? '#0C0B0A' : '#FBF4F0' }}>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">{t('book.session')}</p>
              <div className="font-bold">{clinic.name}</div>
            </div>
            <button onClick={() => setShowBooking(false)} className="opacity-60">{t('book.close')}</button>
          </div>
          <div className="max-w-3xl mx-auto p-5 md:p-10">
            {!isSuccess ? (
              <>
                <h1 className="font-display text-2xl sm:text-4xl text-center mb-6 sm:mb-10">{t('book.bookTitle')}</h1>
                <div className="flex justify-between items-center mb-6 sm:mb-10 relative px-0 sm:px-2">
                  <div className="absolute top-4 sm:top-1/2 left-4 right-4 h-px -z-10" style={{ backgroundColor: `${primaryColor}33` }} />
                  {(t('book.steps') || []).map((label, idx) => {
                    const step = idx + 1;
                    return (
                      <div key={label} className="flex flex-col items-center gap-1 sm:gap-2">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold" style={{ backgroundColor: bookingStep >= step ? primaryColor : 'transparent', color: bookingStep >= step ? (isDark ? '#0C0B0A' : '#fff') : undefined, border: `1px solid ${primaryColor}` }}>{step}</div>
                        <span className="text-[9px] sm:text-[11px] opacity-60">{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 md:p-8 min-h-[280px]" style={{ backgroundColor: panelBg }}>
                  {bookingStep === 1 && (
                    <div>
                      <h2 className="font-display text-2xl text-center mb-6">{t('book.pickBranch')}</h2>
                      {branches.length === 0 ? (
                        <p className="text-center opacity-60 py-8">{t('book.noBranches')}</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {branches.map((b) => {
                            const selected = bookingData.branchId === b.id;
                            return (
                              <button
                                key={b.id}
                                onClick={() => { setBookingData({ ...bookingData, branchId: b.id, branchName: b.name }); setBookingStep(bookingData.serviceId ? 3 : 2); }}
                                className={`p-4 border rounded-2xl hover:shadow-md transition ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                style={{ borderColor: selected ? primaryColor : undefined, backgroundColor: selected ? `${primaryColor}18` : 'transparent' }}
                              >
                                <p className="font-bold">{b.name}</p>
                                {b.address && <p className="text-xs opacity-60 mt-1">{b.address}</p>}
                                {b.phone && <p className="text-xs opacity-60 mt-1" dir="ltr">{b.phone}</p>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {bookingStep === 2 && (
                    <div>
                      {bookingData.branchName && <p className="text-center text-sm opacity-60 mb-4">{t('book.branch')}: {bookingData.branchName}</p>}
                      <h2 className="font-display text-2xl text-center mb-6">{t('book.pickService')}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {services.length === 0 && (
                          <p className="md:col-span-2 text-center opacity-60 py-8">{t('book.noServices')}</p>
                        )}
                        {services.map((s) => (
                          <button key={s.id} onClick={() => { setBookingData(applyServiceToBooking({ ...bookingData }, s.id)); setBookingStep(3); }} className={`p-4 border rounded-2xl hover:shadow-md transition ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                            <p className="font-bold">{s.title}</p>
                            {s.description && <p className="text-xs opacity-60 mt-1 line-clamp-2">{s.description}</p>}
                            {s.duration && <p className="text-xs opacity-50 mt-1">{s.duration}</p>}
                            <p className="text-sm font-bold mt-2" style={{ color: primaryColor }}>{s.price} ₪</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {bookingStep === 3 && (
                    <div>
                      <h2 className="font-display text-2xl text-center mb-6">{t('book.when')}</h2>
                      <input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} className="w-full p-4 border rounded-2xl text-center text-lg outline-none bg-transparent" />
                      <button onClick={() => bookingData.date && setBookingStep(4)} className="w-full mt-6 text-white py-3 rounded-full font-bold" style={{ backgroundColor: primaryColor }}>{t('book.next')}</button>
                    </div>
                  )}
                  {bookingStep === 4 && (
                    <div>
                      <h2 className="font-display text-2xl text-center mb-2">{t('book.pickHour')}</h2>
                      {bookingData.specialistName && <p className="text-center text-sm opacity-60 mb-4">{t('book.schedule', { name: bookingData.specialistName })}</p>}
                      {slotInfo.missing && <p className="text-center text-sm opacity-70 py-8">{t('book.noSchedule')}</p>}
                      {slotInfo.closed && <p className="text-center text-sm opacity-70 py-8">{t('book.closedDay', { day: slotInfo.dayName })}</p>}
                      {!slotInfo.missing && !slotInfo.closed && slotInfo.slots.length === 0 && (
                        <p className="text-center text-sm opacity-70 py-8">{t('book.noSlots')}</p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {slotInfo.slots.map((t) => (
                          <button key={t} onClick={() => { setBookingData({ ...bookingData, time: t, specialistId: resolvedSpecialistId || bookingData.specialistId }); setBookingStep(5); }} className="p-3 border rounded-2xl font-bold" style={{ borderColor: bookingData.time === t ? primaryColor : undefined, backgroundColor: bookingData.time === t ? primaryColor : 'transparent', color: bookingData.time === t ? (isDark ? '#0C0B0A' : '#fff') : undefined }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {bookingStep === 5 && (
                    <div>
                      <h2 className="font-display text-2xl text-center mb-2">{t('book.yourData')}</h2>
                      {bookingData.branchName && <p className="text-center text-sm opacity-60 mb-6">{t('book.branch')}: {bookingData.branchName}</p>}
                      <div className="space-y-4">
                        <input type="text" placeholder={t('book.name')} value={bookingData.name} onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })} className="w-full p-3 border rounded-2xl outline-none bg-transparent" />
                        <input type="tel" placeholder={t('book.phone')} value={bookingData.phone} onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })} className="w-full p-3 border rounded-2xl outline-none bg-transparent" dir="ltr" />
                        {aptSettings.cancellationPolicy && (
                          <label className="flex items-start gap-2 text-xs opacity-70">
                            <input type="checkbox" checked={policyOk} onChange={(e) => setPolicyOk(e.target.checked)} className="mt-1" />
                            <span>{aptSettings.cancellationPolicy}{aptSettings.depositPolicyEnabled ? ` ${aptSettings.depositNote}` : ''}</span>
                          </label>
                        )}
                        {needsExtraConfirm(Number((services.find((s) => s.id === bookingData.serviceId || s.title === bookingData.service) || {}).price || 0), aptSettings) && (
                          <label className="flex items-start gap-2 text-xs opacity-70">
                            <input type="checkbox" checked={extraOk} onChange={(e) => setExtraOk(e.target.checked)} className="mt-1" />
                            {t('book.extraConfirm')}
                          </label>
                        )}
                        <button onClick={handleBookSubmit} disabled={!bookingData.name || !bookingData.phone || !bookingData.branchId || !policyOk} className="w-full text-white py-3 rounded-full font-bold disabled:opacity-40" style={{ backgroundColor: primaryColor }}>{t('book.confirmSession')}</button>
                      </div>
                    </div>
                  )}
                  {bookingStep > 1 && <button onClick={() => setBookingStep(bookingStep - 1)} className="mt-6 opacity-60 font-bold"><FaArrowLeft className="inline" /> {t('book.back')}</button>}
                </div>
              </>
            ) : (
              <div className="text-center p-12 mt-8 rounded-[2rem]" style={{ backgroundColor: panelBg }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}><FaCheck className="text-3xl" /></div>
                <h2 className="font-display text-4xl mb-2">{t('book.booked')}</h2>
                <p className="opacity-70 mb-6">{aptSettings.autoConfirm ? t('book.confirmedPolicy') : t('book.willConfirm')}{bookingData.branchName ? t('book.atBranch', { name: bookingData.branchName }) : ''}</p>
                {manageLink && <a href={manageLink} className="block mb-4 text-sm font-bold underline">{t('book.manage')}</a>}
                <button onClick={() => setShowBooking(false)} className="text-white px-8 py-3 rounded-full font-bold" style={{ backgroundColor: primaryColor }}>{t('book.backClinic')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBooking;
