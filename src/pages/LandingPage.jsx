import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheckCircle, FaCalendarAlt, FaUsers, FaStore, FaChartLine, FaArrowLeft, FaArrowRight,
} from 'react-icons/fa';
import { paidPlans, ADDONS, PLANS } from '../config/plans';
import { useLocale } from '../context/LocaleContext';
import LangSwitcher from '../components/i18n/LangSwitcher';

const FEATURE_ICONS = [FaCalendarAlt, FaUsers, FaStore, FaChartLine];

const LandingPage = () => {
  const { t, dir, locale } = useLocale();
  const trialDays = PLANS.trial.durationDays;
  const plans = paidPlans();
  const outcomes = t('outcomes');
  const features = t('features');
  const Arrow = dir === 'rtl' ? FaArrowLeft : FaArrowRight;

  return (
    <div dir={dir} className="min-h-screen bg-[#f3efe6] text-[#14121c] font-sans">
      <nav className="sticky top-0 z-50 bg-[#14121c] text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4d7cff] via-[#a78bfa] to-[#ff6b4a] font-product font-extrabold flex items-center justify-center">{t('brandMark')}</span>
            <span className="font-product text-xl">{t('brand')}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <LangSwitcher />
            <a href="#pricing" className="hidden sm:inline text-white/70 hover:text-white">{t('nav.pricing')}</a>
            <Link to="/login" className="text-white/80 hover:text-white">{t('nav.login')}</Link>
            <Link to="/register" className="bg-[#4d7cff] text-white px-3 sm:px-5 py-2 rounded-xl font-bold hover:bg-[#3b6af0]">
              {t('nav.trial', { n: trialDays })}
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#4d7cff] font-semibold mb-4">{t('os')}</p>
          <h1 className="font-product text-4xl sm:text-5xl md:text-6xl leading-[1.08] mb-6">
            {t('land.h1a')}
            <br />
            {t('land.h1b')}
          </h1>
          <p className="text-lg text-stone-600 mb-8 max-w-2xl mx-auto">{t('land.lead')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register" className="bg-[#4d7cff] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#3b6af0]">
              {t('land.cta', { n: trialDays })}
            </Link>
            <a href="#outcomes" className="bg-white border border-[#e4ddd0] px-8 py-4 rounded-xl font-bold text-lg">
              {t('land.outcomesCta')}
            </a>
          </div>
          <p className="text-sm text-stone-400 mt-4">{t('land.niche')}</p>
        </div>
      </section>

      <section id="outcomes" className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          {(Array.isArray(outcomes) ? outcomes : []).map((item) => (
            <div key={item.title} className="bg-[#fffcf7] rounded-[1.75rem] p-6 border border-[#e4ddd0]">
              <h2 className="font-product text-2xl mb-3">{item.title}</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 pb-20 max-w-6xl mx-auto">
        <h2 className="font-product text-3xl mb-8 text-center">{t('land.featuresTitle')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Array.isArray(features) ? features : []).map((item, i) => (
            <FeatureCard key={item.title} icon={FEATURE_ICONS[i]} title={item.title} desc={item.desc} />
          ))}
        </div>
      </section>

      <section id="pricing" className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-product text-3xl mb-3">{t('land.pricingTitle')}</h2>
            <p className="text-stone-600 max-w-xl mx-auto">{t('land.pricingLead', { n: trialDays })}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {plans.map((plan) => {
              const copy = t(`plans.${plan.id}`) || {};
              return (
                <div
                  key={plan.id}
                  className={`rounded-[1.75rem] p-7 flex flex-col ${
                    plan.highlighted
                      ? 'bg-[#14121c] text-white shadow-xl md:-translate-y-2'
                      : 'bg-[#fffcf7] border border-[#e4ddd0]'
                  }`}
                >
                  {plan.highlighted && (
                    <p className="text-[11px] font-bold text-[#f0b429] mb-2">{t('land.highlighted')}</p>
                  )}
                  <h3 className="font-product text-2xl">{copy.name || plan.name}</h3>
                  <p className={`text-sm mt-1 mb-5 ${plan.highlighted ? 'text-white/60' : 'text-stone-500'}`}>{copy.audience || plan.audience}</p>
                  <p className="font-product text-4xl mb-6">
                    {plan.price.toLocaleString(locale)}
                    <span className={`text-base font-sans font-normal mx-1 ${plan.highlighted ? 'text-white/50' : 'text-stone-400'}`}>
                      {t('land.perMonth', { currency: plan.currency })}
                    </span>
                  </p>
                  <ul className={`space-y-2 text-sm flex-1 mb-8 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {(copy.features || plan.features).map((f) => (
                      <li key={f} className="flex gap-2">
                        <FaCheckCircle className={`mt-0.5 shrink-0 ${plan.highlighted ? 'text-[#22c9a0]' : 'text-[#4d7cff]'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`block text-center py-3 rounded-xl font-bold ${
                      plan.highlighted ? 'bg-[#4d7cff] text-white' : 'bg-[#14121c] text-white'
                    }`}
                  >
                    {t('land.startTrial')}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-10 bg-[#fffcf7] border border-[#e4ddd0] rounded-[1.75rem] p-6">
            <h3 className="font-product text-xl mb-2">{t('land.addonsTitle')}</h3>
            <p className="text-sm text-stone-500 mb-4">{t('land.addonsLead')}</p>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {ADDONS.map((a) => (
                <div key={a.id}>
                  <p className="font-bold">{t(`addons.${a.id}.name`)}</p>
                  <p className="text-stone-500 mt-1">{t(`addons.${a.id}.note`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 max-w-3xl mx-auto text-center">
        <h2 className="font-product text-2xl mb-3">{t('land.whoTitle')}</h2>
        <p className="text-stone-600 text-sm leading-relaxed">{t('land.whoBody')}</p>
        <Link to="/register" className="inline-flex items-center gap-2 mt-8 text-[#4d7cff] font-bold">
          {t('land.create')} <Arrow />
        </Link>
      </section>

      <footer className="bg-[#14121c] text-white/50 py-12 text-center text-sm">
        <p className="font-product text-2xl text-white mb-2">{t('brand')}</p>
        <p className="mb-6">{t('land.footerTag')}</p>
        <p className="text-xs text-white/30">© {new Date().getFullYear()} {t('brand')}. {t('land.footerLegal')}</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-[#fffcf7] p-6 rounded-[1.75rem] border border-[#e4ddd0]">
    <div className="w-12 h-12 bg-[#4d7cff]/10 text-[#4d7cff] rounded-2xl flex items-center justify-center text-xl mb-4">
      <Icon />
    </div>
    <h3 className="font-product text-xl mb-2">{title}</h3>
    <p className="text-stone-600 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;
