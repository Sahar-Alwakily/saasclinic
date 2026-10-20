export const PLANS = {
  trial: {
    id: 'trial',
    name: 'تجريبي',
    price: 0,
    currency: '₪',
    durationDays: 14,
    maxUsers: 3,
    maxAppointments: 100,
    features: ['كل الأقسام', 'التنبيهات الذكية', 'تصدير Excel/CSV'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 800,
    currency: '₪',
    durationDays: 30,
    maxUsers: 2,
    maxAppointments: 300,
    features: ['قسم واحد', 'التنبيهات الذكية', 'تصدير Excel/CSV'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1000,
    currency: '₪',
    durationDays: 30,
    maxUsers: 10,
    maxAppointments: Infinity,
    features: ['كل الأقسام', 'تنبيهات ذكية', 'تصدير', 'دعم أولوية'],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 349,
    currency: '₪',
    durationDays: 30,
    maxUsers: Infinity,
    maxAppointments: Infinity,
    features: ['كل شي في Pro', 'عدة فروع', 'تقارير متقدمة'],
  },
};

export const getPlan = (id) => PLANS[id] || PLANS.trial;

export const isTrialExpired = (clinicInfo) => {
  if (!clinicInfo) return true;
  if (clinicInfo.plan !== 'trial') return false;
  if (!clinicInfo.trialEndsAt) return true;
  return Date.now() > clinicInfo.trialEndsAt;
};