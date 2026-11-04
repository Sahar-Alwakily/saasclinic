import { clinicHealth, toYmd } from './clinicInsights';
import { buildJourneys, mergeSettings } from './winback';

const DAY = 86400000;

export function deltaText(n) {
  if (n == null) return 'ما في فترة سابقة كافية للمقارنة';
  if (n === 0) return 'نفس الفترة السابقة';
  if (n > 0) return `زيادة ${n}%`;
  return `انخفاض ${Math.abs(n)}%`;
}

export function campaignBookingReport(appointments = [], campaigns = [], messages = []) {
  const linked = appointments.filter((a) => a.campaignId);
  const rows = campaigns.map((c) => {
    const apts = appointments.filter((a) => a.campaignId === c.id);
    const msgs = messages.filter((m) => m.campaignId === c.id);
    const launched = Number(c.launchedAt) || 0;
    let before30 = null;
    let after30 = null;
    if (launched) {
      before30 = appointments.filter((a) => {
        const t = Number(a.createdAt) || 0;
        return t >= launched - 30 * DAY && t < launched;
      }).length;
      after30 = appointments.filter((a) => {
        const t = Number(a.createdAt) || 0;
        return t >= launched && t <= launched + 30 * DAY;
      }).length;
    }
    return {
      id: c.id,
      name: c.name || 'حملة',
      status: c.status || '—',
      targets: (c.targetIds || []).length,
      bookings: apts.filter((a) => a.status !== 'cancelled').length,
      attended: apts.filter((a) => ['attended', 'confirmed', 'completed'].includes(a.status)).length,
      messages: msgs.length,
      sent: msgs.filter((m) => ['sent', 'delivered', 'read'].includes(m.status)).length,
      failed: msgs.filter((m) => m.status === 'failed').length,
      replied: msgs.filter((m) => m.replied).length,
      before30,
      after30,
    };
  });
  return {
    linked: linked.length,
    plain: appointments.length - linked.length,
    rows,
  };
}

export function marketingSnapshot({ campaigns = [], messages = [], offers = [], groupOffers = [], blog = [], orders = [] }) {
  const openGroups = groupOffers.filter((o) => Object.keys(o.accepts || {}).length >= (Number(o.goal) || 10));
  return {
    campaigns: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    review: campaigns.filter((c) => c.status === 'review').length,
    messages: messages.length,
    sent: messages.filter((m) => ['sent', 'delivered', 'read'].includes(m.status)).length,
    failed: messages.filter((m) => m.status === 'failed').length,
    read: messages.filter((m) => m.status === 'read').length,
    offers: offers.length,
    approvedOffers: offers.filter((o) => o.adminApproved).length,
    groupOffers: groupOffers.length,
    openGroups: openGroups.length,
    blog: blog.length,
    orders: orders.length,
  };
}

export function clientReturnReport({ customers = [], appointments = [], services = [], settings, messages = [], optOuts = {} }) {
  const journeys = buildJourneys({
    customers,
    appointments,
    services,
    settings: mergeSettings(settings),
    logs: messages,
    optOuts,
  });
  const cameBack = journeys.filter((j) => j.visitCount >= 2 && !j.lapsed);
  const stayedAway = journeys.filter((j) => j.lapsed);
  return { cameBack, stayedAway };
}

function medicalLines(info) {
  const m = info || {};
  const lines = [];
  if (m.allergies) lines.push(['حساسية', m.allergies]);
  if (m.chronicDiseases) lines.push(['أمراض مزمنة', m.chronicDiseases]);
  if (m.currentMedications) lines.push(['أدوية', m.currentMedications]);
  if (m.previousSurgeries) lines.push(['عمليات سابقة', m.previousSurgeries]);
  if (m.notes) lines.push(['ملاحظات', m.notes]);
  if (m.isPregnant) lines.push(['حمل', 'نعم']);
  if (m.isBreastfeeding) lines.push(['رضاعة', 'نعم']);
  return lines;
}

export function clientFileReport(customers = []) {
  return customers
    .map((c) => {
      const sessions = Array.isArray(c.sessions) ? c.sessions : [];
      const groups = new Map();
      sessions.forEach((s) => {
        const key = s.groupId || s.id;
        if (!groups.has(key)) {
          groups.set(key, {
            id: key,
            recordedAt: s.recordedAt || s.createdAt || '',
            recordedBy: s.recordedBy || '',
            note: s.note || '',
            signature: s.signature || '',
            services: [],
          });
        }
        const g = groups.get(key);
        g.services.push({
          title: s.serviceTitle || s.service || 'جلسة',
          zones: (s.laserZonesLabels || []).join('، '),
        });
        if (!g.signature && s.signature) g.signature = s.signature;
        if (!g.note && s.note) g.note = s.note;
      });
      const stamps = [...groups.values()].sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
      return {
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'عميلة',
        phone: c.phone || '',
        birthDate: c.birthDate || '',
        idNumber: c.idNumber || '',
        doNotContact: !!(c.doNotContact || c.winbackOptOut),
        medical: medicalLines(c.medicalInfo),
        stamps,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export function buildClinicReport(input) {
  const health = clinicHealth({ appointments: input.appointments, customers: input.customers });
  const today = toYmd(new Date());
  const todayApts = (input.appointments || []).filter((a) => a.date === today);
  return {
    health,
    today: {
      total: todayApts.length,
      pending: todayApts.filter((a) => a.status === 'pending').length,
      cancelled: todayApts.filter((a) => a.status === 'cancelled').length,
      attended: todayApts.filter((a) => a.status === 'attended').length,
    },
    campaigns: campaignBookingReport(input.appointments, input.campaigns, input.messages),
    marketing: marketingSnapshot(input),
    returns: clientReturnReport(input),
    files: clientFileReport(input.customers),
  };
}
