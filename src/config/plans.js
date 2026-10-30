const STARTER_CAPS = {
  appointments: true,
  customers: true,
  services: true,
  reports: true,
  website: true,
  team: true,
  ops: false,
  winback: false,
  treatments: false,
  marketing: false,
  websitePro: false,
  assistant: false,
  whatsapp: false,
  branchCompare: false,
};

const PRO_CAPS = {
  ...STARTER_CAPS,
  ops: true,
  winback: true,
  treatments: true,
  marketing: true,
  websitePro: true,
  assistant: true,
  whatsapp: true,
};

const BUSINESS_CAPS = {
  ...PRO_CAPS,
  branchCompare: true,
};

const ALL_CAPS = { ...BUSINESS_CAPS };

export const CAP_LABELS = {
  appointments: 'المواعيد والتأكيد والحضور',
  customers: 'ملفات العميلات',
  services: 'الخدمات والأسعار',
  reports: 'تقارير الحضور والإيراد',
  website: 'صفحة الحجز العامة',
  team: 'الفريق والفرع',
  ops: 'قائمة الانتظار وتشغيل الفراغ',
  winback: 'استرجاع العميلات',
  treatments: 'الجلسات بتوقيع ومتابعة العلاج',
  marketing: 'المدونة والطلبات والكوبونات',
  websitePro: 'ثيمات الموقع وSEO',
  assistant: 'المساعد الذكي والوارد',
  whatsapp: 'واتساب',
  branchCompare: 'مقارنة الفروع',
};

export const CAP_MIN_PLAN = {
  appointments: 'starter',
  customers: 'starter',
  services: 'starter',
  reports: 'starter',
  website: 'starter',
  team: 'starter',
  ops: 'pro',
  winback: 'pro',
  treatments: 'pro',
  marketing: 'pro',
  websitePro: 'pro',
  assistant: 'pro',
  whatsapp: 'pro',
  branchCompare: 'business',
};

export const PLANS = {
  trial: {
    id: 'trial',
    name: 'تجريبي',
    audience: 'كل الوحدات المبنية لمدة أسبوعين',
    price: 0,
    currency: '₪',
    durationDays: 14,
    maxUsers: 3,
    maxBranches: 2,
    maxAppointments: Infinity,
    highlighted: false,
    caps: ALL_CAPS,
    features: [
      'مواعيد، ملفات، صفحة حجز عامة',
      'قائمة انتظار واسترجاع',
      'جلسات بتوقيع ومراحل علاج',
      'بدون بطاقة',
    ],
  },
  starter: {
    id: 'starter',
    name: 'تشغيل',
    audience: 'غرفة واحدة — مالكة ومساعدة',
    price: 800,
    currency: '₪',
    durationDays: 30,
    maxUsers: 2,
    maxBranches: 1,
    maxAppointments: Infinity,
    highlighted: false,
    caps: STARTER_CAPS,
    features: [
      'مواعيد وخدمات وتقويم — تأكيد وحضر/غاب',
      'ملفات عميلات أساسية',
      'صفحة حجز بثيم واحد',
      'تقارير حضور وإيراد من سجل العيادة',
      'حسابان: مالكة + مساعدة · فرع واحد',
    ],
  },
  pro: {
    id: 'pro',
    name: 'عيادة',
    audience: 'عيادة ناشطة تريد ملء الفراغ وإرجاع العميلات',
    price: 1100,
    currency: '₪',
    durationDays: 30,
    maxUsers: 10,
    maxBranches: 2,
    maxAppointments: Infinity,
    highlighted: true,
    caps: PRO_CAPS,
    features: [
      'كل ما في تشغيل',
      'قائمة انتظار وعرض أول من يقبل',
      'عربون مكتوب وقواعد إلغاء وهدوء',
      'استرجاع عميلات وعروض وانسحاب',
      'جلسات بتوقيع ومراحل علاج وتعليمات واتساب',
      'ثيمات الموقع ومدونة وطلبات للعيادة',
      'حتى 10 حسابات وفرعين',
    ],
  },
  business: {
    id: 'business',
    name: 'فروع',
    audience: 'فرعين أو أكثر وجدولة متعددة',
    price: 1500,
    currency: '₪',
    durationDays: 30,
    maxUsers: Infinity,
    maxBranches: Infinity,
    maxAppointments: Infinity,
    highlighted: false,
    caps: BUSINESS_CAPS,
    features: [
      'كل ما في عيادة',
      'فروع وجداول بلا حد عملي',
      'حسابات فريق بلا حد عملي',
      'مقارنة فروع من تشغيل المواعيد',
    ],
  },
};

export const PAID_PLAN_IDS = ['starter', 'pro', 'business'];

export const paidPlans = () => PAID_PLAN_IDS.map((id) => PLANS[id]);

export const getPlan = (id) => PLANS[id] || PLANS.trial;

export function mergePlan(clinicInfo, planConfig) {
  const id = clinicInfo?.plan || 'trial';
  const base = getPlan(id);
  const extra = planConfig?.[id] || {};
  const maxUsers = extra.maxUsers === -1 ? Infinity : (extra.maxUsers ?? base.maxUsers);
  const maxBranches = extra.maxBranches === -1 ? Infinity : (extra.maxBranches ?? base.maxBranches);
  return {
    ...base,
    ...extra,
    id,
    name: base.name,
    caps: { ...base.caps, ...(extra.caps || {}) },
    maxUsers,
    maxBranches,
    price: extra.price ?? base.price,
    yearlyPrice: extra.yearlyPrice ?? base.yearlyPrice,
  };
}

export const clinicPlan = (clinicInfo, planConfig) => mergePlan(clinicInfo, planConfig);

export const planCaps = (clinicInfo, planConfig) => mergePlan(clinicInfo, planConfig).caps || ALL_CAPS;

export const hasCap = (clinicInfo, cap, planConfig) => !!planCaps(clinicInfo, planConfig)[cap];

export const minPlanForCap = (cap) => getPlan(CAP_MIN_PLAN[cap] || 'starter');

export const isTrialExpired = (clinicInfo) => {
  if (!clinicInfo) return false;
  if (clinicInfo.plan !== 'trial') return false;
  if (!clinicInfo.trialEndsAt) return false;
  return Date.now() > clinicInfo.trialEndsAt;
};

export const withinUserLimit = (clinicInfo, userCount, planConfig) => {
  const max = mergePlan(clinicInfo, planConfig).maxUsers;
  if (!Number.isFinite(max)) return true;
  return userCount < max;
};

export const withinBranchLimit = (clinicInfo, branchCount, planConfig) => {
  const max = mergePlan(clinicInfo, planConfig).maxBranches;
  if (!Number.isFinite(max)) return true;
  return branchCount < max;
};
