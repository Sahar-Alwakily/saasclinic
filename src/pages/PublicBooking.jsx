import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ref, onValue, push, set, update, increment } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { FaTimes, FaCheck, FaShoppingBag, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';

import SectionRenderer from '../engine/SectionRenderer';
import { clinicSections } from '../utils/clinicDraft';
import { getPreviewClinic } from '../components/themes/previewData';
import { DRAFT_STORAGE_KEY } from '../components/themes/themeUtils';
import { slotsForBooking } from '../utils/scheduleSlots';
import {
  mergeAptSettings, slotKey, occupiedKeys, claimSlot, makeToken, appendHistory,
  manageUrl,
} from '../utils/appointmentOps';
import { publicPolicyList, withPublicPolicies } from '../utils/sitePolicies';
import { hasCap } from '../config/plans';
import { resolvePublicTheme } from '../utils/platformTemplates';
import { publicPlaces } from '../utils/publicPlaces';
import { useLocale } from '../context/LocaleContext';
import BeautyBookingWizard from '../components/public/BeautyBookingWizard';

const publicCacheKey = (id) => `warafa_public_${id}`;

function readPublicClinic(clinicId, isDraft) {
  try {
    if (isDraft) {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      const draft = raw ? JSON.parse(raw) : null;
      if (draft?.clinicId === clinicId && draft.clinic) return draft.clinic;
    }
    const raw = sessionStorage.getItem(publicCacheKey(clinicId));
    const data = raw ? JSON.parse(raw) : null;
    return data?.clinic || null;
  } catch {
    return null;
  }
}

function writePublicClinic(clinicId, clinic) {
  try {
    if (clinicId && clinic) sessionStorage.setItem(publicCacheKey(clinicId), JSON.stringify({ clinic }));
  } catch {
    /* ignore */
  }
}

const PublicBooking = () => {
  const { t, dir } = useLocale();
  const { clinicId } = useParams();
  const [searchParams] = useSearchParams();
  const isDraft = searchParams.get('draft') === '1';
  const adminPreview = searchParams.get('preview') === '1';
  const preview = useMemo(() => getPreviewClinic(clinicId), [clinicId]);
  const draftRef = useRef(null);
  const bootClinic = preview?.clinic || readPublicClinic(clinicId, isDraft);

  const [clinic, setClinic] = useState(bootClinic);
  const [services, setServices] = useState(preview?.services || []);
  const [products, setProducts] = useState(preview?.products || []);
  const [branches, setBranches] = useState(preview?.branches || []);
  const [posts, setPosts] = useState(preview?.posts || []);
  const [loading, setLoading] = useState(!bootClinic);

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
  const [templates, setTemplates] = useState(null);
  const [planConfig, setPlanConfig] = useState(null);
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
      const next = { ...(payload || {}), _demo: false };
      setClinic((prev) => ({ ...(prev || {}), ...next }));
      writePublicClinic(clinicId, next);
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ clinicId, clinic: payload }));
      } catch {
        /* ignore */
      }
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
    if (isDraft || adminPreview) {
      try { window.parent.postMessage({ type: 'clinic-draft-ready', clinicId }, '*'); } catch { /* ignore */ }
    }
    return () => window.removeEventListener('message', onMsg);
  }, [clinicId, isDraft, adminPreview]);

  useEffect(() => {
    if (!clinicId || preview) return;
    const unsubInfo = onValue(ref(database, `clinics/${clinicId}/info`), (snap) => {
      const val = snap.val();
      const next = val ? { ...val, ...(draftRef.current || {}) } : draftRef.current;
      setClinic(next);
      if (next) writePublicClinic(clinicId, next);
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
    const unsubTpl = onValue(ref(database, 'platform/templates'), (snap) => setTemplates(snap.val()));
    const unsubPlans = onValue(ref(database, 'platform/planConfig'), (snap) => setPlanConfig(snap.val()));
    return () => { unsubInfo(); unsubServ(); unsubProd(); unsubBranch(); unsubBlog(); unsubSched(); unsubUsers(); unsubApts(); unsubAptSet(); unsubTpl(); unsubPlans(); };
  }, [clinicId, preview]);

  const handleCheckout = async () => {
    if (!orderData.name || !orderData.phone || !orderData.address) return alert(t('book.fillAll'));
    if (preview || isDraft || adminPreview) {
      setCart([]);
      setCheckoutStep(3);
      return;
    }
    try {
      const orderRef = push(ref(database, `clinics/${clinicId}/orders`));
      const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      await set(orderRef, {
        customerInfo: orderData,
        items: cart,
        total,
        status: 'pending',
        paymentStatus: 'unpaid',
        deliveryStatus: 'pending',
        createdAt: Date.now(),
      });
      await set(ref(database, `platform/productOrders/${orderRef.key}`), {
        clinicId,
        clinicName: clinic?.name || '',
        status: 'pending',
        paymentStatus: 'unpaid',
        deliveryStatus: 'pending',
        total,
        customerName: orderData.name,
        customerPhone: orderData.phone || '',
        itemSummary: cart.map((i) => `${i.title || i.name || 'منتج'}×${i.qty}`).join('، '),
        createdAt: Date.now(),
      });
      await update(ref(database, `meta/clinics/${clinicId}`), { orderCount: increment(1), lastActivityAt: Date.now() });
      setCart([]);
      setCheckoutStep(3);
    } catch (error) {
      alert(t('book.error'));
    }
  };

  const handleBookSubmit = async () => {
    if (!bookingData.branchId) return alert(t('book.pickBranchFirst'));
    if (preview || isDraft || adminPreview) {
      setIsSuccess(true);
      return;
    }
    try {
      if (publicPolicyList(clinic, aptSettings).length && !policyOk) return alert(t('book.policyAlert'));
      const specialistId = bookingData.specialistId || '';
      const key = slotKey(bookingData.branchId, specialistId, bookingData.date, bookingData.time);
      const aptRef = push(ref(database, `clinics/${clinicId}/appointments`));
      const locked = await claimSlot(database, clinicId, key, aptRef.key);
      if (!locked) return alert(t('book.slotGone'));
      const token = makeToken();
      const status = aptSettings.autoConfirm ? 'confirmed' : 'pending';
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
        campaignId: searchParams.get('wb') || '',
        status,
        extraConfirmRequired: false,
        manageToken: token,
        reminderVariant: Math.random() < 0.5 ? 'A' : 'B',
        slotKey: key,
        createdAt: Date.now(),
        history: appendHistory({}, { action: 'created', by: 'customer', status }),
      });
      await set(ref(database, `clinics/${clinicId}/manageTokens/${token}`), { appointmentId: aptRef.key });
      await update(ref(database, `meta/clinics/${clinicId}`), { bookingCount: increment(1), lastActivityAt: Date.now() });
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

  const places = publicPlaces(clinic, branches);

  const openBooking = (opts = {}) => {
    let next = { ...emptyBooking };
    if (opts.serviceId) next = applyServiceToBooking(next, opts.serviceId);
    const picked = opts.branchId
      ? places.find((p) => p.id === opts.branchId)
      : (places.length === 1 ? places[0] : null);
    if (picked) {
      next.branchId = picked.id;
      next.branchName = opts.branchName || picked.name;
    }
    setBookingData(next);
    setIsSuccess(false);
    setShowBooking(true);
    if (next.branchId && next.serviceId) setBookingStep(3);
    else if (opts.branchId) setBookingStep(2);
    else setBookingStep(1);
  };

  useEffect(() => {
    if (queryApplied.current || loading || !clinic) return;
    const sid = searchParams.get('service');
    const bid = searchParams.get('branch');
    if (searchParams.get('book') !== '1') return;
    if (sid && services.length === 0) return;
    queryApplied.current = true;
    openBooking({ serviceId: sid || undefined, branchId: bid || undefined });
  }, [loading, clinic, services, branches, searchParams]);

  const selectedService = services.find((s) => s.id === bookingData.serviceId);
  const resolvedSpecialistId = bookingData.specialistId
    || staff.find((u) => u.branch === bookingData.branchId && selectedService && (u.category === selectedService.category || u.category === 'all'))?.id
    || '';
  let slotInfo = slotsForBooking(schedules, bookingData.branchId, resolvedSpecialistId, bookingData.date, aptSettings);
  const takenSlots = occupiedKeys(bookedApts);
  if (slotInfo.slots?.length) {
    slotInfo = {
      ...slotInfo,
      slots: slotInfo.slots.filter((t) => !takenSlots.has(slotKey(bookingData.branchId, resolvedSpecialistId || bookingData.specialistId, bookingData.date, t))),
    };
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

  if (!clinic) {
    if (loading) return <div className="min-h-screen bg-white" />;
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#8a9199]" dir={dir}>
        {t('book.missing')}
      </div>
    );
  }

  if (!preview && !isDraft && !adminPreview && clinic.isActive === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF4F0] text-[#3A2A28] p-6 text-center" dir={dir}>
        <p className="font-display text-4xl mb-3">✦</p>
        <h1 className="text-2xl font-bold mb-2">العيادة متوقفة مؤقتاً</h1>
        <p className="text-sm opacity-70">الحجز غير متاح حالياً. تواصلي مع العيادة لاحقاً.</p>
      </div>
    );
  }

  if (!preview && !isDraft && !adminPreview && clinic.websitePublished === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF4F0] text-[#3A2A28] p-6 text-center" dir={dir}>
        <p className="font-display text-4xl mb-3">✦</p>
        <h1 className="text-2xl font-bold mb-2">الموقع غير منشور</h1>
        <p className="text-sm opacity-70">هذه العيادة لم تنشر صفحتها العامة بعد.</p>
      </div>
    );
  }

  const themesOn = hasCap(clinic, 'websitePro', planConfig);
  const publicProducts = clinic.showProducts !== false ? products : [];
  const publicPosts = clinic.showBlog !== false ? posts : [];
  const resolved = resolvePublicTheme(clinic, templates, themesOn);
  const themeName = resolved.renderer;

  const pageClinic = {
    ...withPublicPolicies(clinic, aptSettings),
    storeTheme: themeName,
    showProducts: clinic.showProducts !== false,
    showBlog: clinic.showBlog !== false,
  };
  const bookingPolicies = publicPolicyList(clinic, aptSettings);
  const pageSections = clinicSections(clinic);

  const primaryColor = clinic.primaryColor && clinic.primaryColor !== '#C48B7A' ? clinic.primaryColor : (themeName === 'beauty' ? '#3B82F6' : '#C48B7A');
  const isDark = themeName === 'elegant';
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  const panelBg = isDark ? '#141210' : '#fff';
  const panelText = isDark ? '#F5EDE3' : '#3A2A28';

  return (
    <div className="relative" dir={dir}>
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
        <BeautyBookingWizard
          clinicName={clinic.name}
          primaryColor={primaryColor}
          places={places}
          services={services}
          bookingData={bookingData}
          setBookingData={setBookingData}
          bookingStep={bookingStep}
          setBookingStep={setBookingStep}
          slotInfo={slotInfo}
          applyServiceToBooking={applyServiceToBooking}
          resolvedSpecialistId={resolvedSpecialistId}
          onSubmit={handleBookSubmit}
          onClose={() => setShowBooking(false)}
          isSuccess={isSuccess}
          policies={bookingPolicies}
          policyOk={policyOk}
          setPolicyOk={setPolicyOk}
          autoConfirm={aptSettings.autoConfirm}
          manageLink={manageLink}
        />
      )}
    </div>
  );
};

export default PublicBooking;
