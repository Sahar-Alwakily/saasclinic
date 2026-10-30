export function resolvePublicTheme(clinic, templatesMap, websitePro) {
  const requested = clinic?.storeTheme || 'beauty';
  const builtins = ['beauty', 'elegant', 'minimal'];
  const map = templatesMap || {};
  const values = Object.values(map);
  const plan = clinic?.plan || 'trial';

  const allowed = (tpl) => {
    if (!tpl || tpl.active === false) return false;
    const plans = tpl.plans;
    if (Array.isArray(plans) && plans.length) return plans.includes(plan);
    return true;
  };

  const assigned = map[requested];
  if (assigned && assigned.active !== false) {
    return {
      templateId: requested,
      renderer: assigned.renderer || (builtins.includes(requested) ? requested : 'beauty'),
    };
  }
  if (builtins.includes(requested) && !assigned) {
    return { templateId: requested, renderer: requested };
  }

  if (!websitePro) {
    const starter = map.beauty && allowed(map.beauty) ? map.beauty : values.find((t) => t.renderer === 'beauty' && allowed(t));
    return { templateId: starter?.id || 'beauty', renderer: starter?.renderer || 'beauty' };
  }

  const def = values.find((t) => t.isDefault && allowed(t)) || values.find(allowed);
  if (def) return { templateId: def.id, renderer: def.renderer || 'beauty' };
  return { templateId: 'beauty', renderer: 'beauty' };
}

export function templatesForPlan(templatesMap, planId, websitePro) {
  const map = templatesMap || {};
  const list = Object.values(map);
  if (!list.length) {
    const all = [
      { id: 'beauty', renderer: 'beauty', name: 'تجميلي وردي', active: true, plans: ['trial', 'starter', 'pro', 'business'] },
      { id: 'elegant', renderer: 'elegant', name: 'أتيليه ذهبي', active: true, plans: ['trial', 'pro', 'business'] },
      { id: 'minimal', renderer: 'minimal', name: 'عيادة هادئة', active: true, plans: ['trial', 'pro', 'business'] },
    ];
    return websitePro ? all : all.filter((t) => t.id === 'beauty');
  }
  return list.filter((t) => t.active !== false && (!t.plans?.length || t.plans.includes(planId || 'trial')) && (websitePro || t.renderer === 'beauty' || t.id === 'beauty'));
}
