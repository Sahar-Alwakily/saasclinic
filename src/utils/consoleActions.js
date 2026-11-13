import { push, ref, remove, set, update } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { appendHistory, claimSlot, makeToken, releaseSlot, slotKey } from './appointmentOps';

export async function runConsoleAction(action, { clinicPath, clinicId }) {
  if (!clinicPath || !clinicId) throw new Error('no-clinic');
  if (action.type === 'addCustomer') {
    const row = push(ref(database, clinicPath('customers')));
    await set(row, {
      firstName: action.firstName,
      lastName: action.lastName || '',
      phone: action.phone,
      birthDate: '',
      idNumber: '',
      gender: 'female',
      medicalInfo: {},
      sessions: [],
      treatments: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { answer: `انضافت ${action.firstName} ${action.lastName || ''}`.trim() + '.' };
  }
  if (action.type === 'addProduct') {
    const row = push(ref(database, clinicPath('products')));
    await set(row, {
      title: action.title,
      category: 'beauty',
      price: action.price,
      imageUrl: '',
      createdAt: Date.now(),
    });
    return { answer: `انضاف منتج ${action.title}.` };
  }
  if (action.type === 'addAppointment') {
    const key = slotKey(action.branchId, '', action.date, action.time);
    const aptRef = push(ref(database, clinicPath('appointments')));
    const locked = await claimSlot(database, clinicId, key, aptRef.key);
    if (!locked) return { answer: 'الساعة محجوزة. اختاري ساعة ثانية.' };
    const token = makeToken();
    await set(aptRef, {
      customerName: action.name,
      phoneNumber: action.phone || '',
      service: action.service || '',
      serviceId: action.serviceId || '',
      specialistId: '',
      specialistName: '',
      date: action.date,
      time: action.time,
      branchId: action.branchId,
      branchName: action.branchName || '',
      status: 'pending',
      extraConfirmRequired: false,
      manageToken: token,
      slotKey: key,
      createdAt: Date.now(),
      history: appendHistory({}, { action: 'created', by: 'staff', status: 'pending' }),
    });
    await set(ref(database, clinicPath(`manageTokens/${token}`)), { appointmentId: aptRef.key });
    return { answer: `تسجّل حجز ${action.name} بتاريخ ${action.date} الساعة ${action.time}.` };
  }
  if (action.type === 'cancelAppointments') {
    for (const apt of action.appointments || []) {
      await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
        status: 'cancelled',
        cancelReason: 'المساعد',
        cancelledAt: Date.now(),
        history: appendHistory(apt, { action: 'cancelled', by: 'staff', reason: 'المساعد' }),
      });
      const key = apt.slotKey || slotKey(apt.branchId, apt.specialistId, apt.date, apt.time);
      await releaseSlot(database, clinicId, key, apt.id);
      await set(push(ref(database, clinicPath('waitlistEvents'))), {
        type: 'vacancy',
        fromAppointmentId: apt.id,
        service: apt.service || '',
        branchId: apt.branchId || '',
        specialistId: apt.specialistId || '',
        date: apt.date,
        time: apt.time,
        price: 0,
        createdAt: Date.now(),
        open: true,
      });
    }
    const n = (action.appointments || []).length;
    return { answer: `انلغى ${n} حجز يوم ${action.label}.` };
  }
  if (action.type === 'updateCustomer') {
    const patch = { updatedAt: Date.now() };
    if (action.phone) patch.phone = action.phone;
    if (action.firstName) {
      patch.firstName = action.firstName;
      patch.lastName = action.lastName || '';
    }
    await update(ref(database, clinicPath(`customers/${action.id}`)), patch);
    return { answer: 'انحفظ تعديل العميلة.' };
  }
  if (action.type === 'deleteCustomer') {
    await remove(ref(database, clinicPath(`customers/${action.id}`)));
    return { answer: `انحذف ملف ${action.name}.` };
  }
  if (action.type === 'updateProduct') {
    const patch = { updatedAt: Date.now() };
    if (action.title) patch.title = action.title;
    if (action.price != null) patch.price = action.price;
    await update(ref(database, clinicPath(`products/${action.id}`)), patch);
    return { answer: 'انحفظ تعديل المنتج.' };
  }
  if (action.type === 'deleteProduct') {
    await remove(ref(database, clinicPath(`products/${action.id}`)));
    return { answer: `انحذف منتج ${action.title}.` };
  }
  if (action.type === 'updateAppointment') {
    const apt = action.appointment;
    const date = action.date || apt.date;
    const time = action.time || apt.time;
    const moved = date !== apt.date || time !== apt.time;
    let key = apt.slotKey || slotKey(apt.branchId, apt.specialistId, apt.date, apt.time);
    if (moved) {
      const nextKey = slotKey(apt.branchId, apt.specialistId, date, time);
      const locked = await claimSlot(database, clinicId, nextKey, apt.id);
      if (!locked) return { answer: 'الساعة الجديدة محجوزة.' };
      await releaseSlot(database, clinicId, key, apt.id);
      key = nextKey;
    }
    await update(ref(database, clinicPath(`appointments/${apt.id}`)), {
      date,
      time,
      slotKey: key,
      service: action.service || apt.service || '',
      serviceId: action.serviceId || apt.serviceId || '',
      status: moved ? 'rescheduled' : (apt.status || 'pending'),
      history: appendHistory(apt, { action: moved ? 'rescheduled' : 'edited', by: 'staff' }),
    });
    return { answer: moved ? `انتقل حجز ${apt.name} إلى ${date} الساعة ${time}.` : `تغيّرت خدمة حجز ${apt.name}.` };
  }
  if (action.type === 'deletePost') {
    await remove(ref(database, clinicPath(`blog/${action.id}`)));
    return { answer: `انحذف مقال ${action.title}.` };
  }
  if (action.type === 'updatePost') {
    await update(ref(database, clinicPath(`blog/${action.id}`)), { content: action.content, updatedAt: Date.now() });
    return { answer: 'انحفظ تعديل المقال.' };
  }
  if (action.type === 'cancelOrder') {
    const extra = { status: 'cancelled', deliveryStatus: 'cancelled', updatedAt: Date.now() };
    await update(ref(database, clinicPath(`orders/${action.id}`)), extra);
    await update(ref(database, `platform/productOrders/${action.id}`), extra);
    return { answer: `انلغى طلب ${action.name}.` };
  }
  if (action.type === 'setPublished') {
    await update(ref(database, clinicPath('info')), { websitePublished: action.value });
    return { answer: action.value ? 'الموقع منشور.' : 'الموقع مخفي.' };
  }
  if (action.type === 'setPolicy') {
    await update(ref(database, clinicPath('info')), { [action.key]: action.text });
    return { answer: 'انحفظت السياسة على الموقع.' };
  }
  if (action.type === 'addPost') {
    const row = push(ref(database, clinicPath('blog')));
    await set(row, { title: action.title, content: action.content, imageUrl: '', createdAt: Date.now() });
    return { answer: `اننشر مقال «${action.title}».` };
  }
  throw new Error('unknown-action');
}
