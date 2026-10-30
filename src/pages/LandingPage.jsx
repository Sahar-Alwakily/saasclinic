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
    <div dir={dir} className="min-h-screen bg-[#F7F8F6] text-[#202A32] font-sans">
      <nav className="sticky top-0 z-50 bg-[#172B3A] text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-md bg-white/10 text-sm font-semibold flex items-center justify-center">{t('brandMark')}</span>
            <span className="text-base font-semibold">{t('brand')}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <LangSwitcher />
            <a href="#pricing" className="hidden sm:inline text-white/70 hover:text-white">{t('nav.pricing')}</a>
            <Link to="/login" className="text-white/80 hover:text-white">{t('nav.login')}</Link>
            <Link to="/register" className="bg-white text-[#172B3A] px-3 sm:px-4 py-1.5 rounded-md text-sm font-semibold">
              {t('nav.trial', { n: trialDays })}
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-[#658B83] mb-3">{t('os')}</p>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-tight mb-5 text-[#172B3A]">
            {t('land.h1a')}
            <br />
            {t('land.h1b')}
          </h1>
          <p className="text-base text-[#75818B] mb-8 max-w-2xl mx-auto">{t('land.lead')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register" className="bg-[#172B3A] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#122330]">
              {t('land.cta', { n: trialDays })}
            </Link>
            <a href="#outcomes" className="bg-white border border-[#E5E9EC] px-6 py-3 rounded-md font-semibold">
              {t('land.outcomesCta')}
            </a>
          </div>
          <p className="text-sm text-stone-400 mt-4">{t('land.niche')}</p>
        </div>
      </section>

      <section id="outcomes" className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          {(Array.isArray(outcomes) ? outcomes : []).map((item) => (
            <div key={item.title} className="bg-white rounded-lg p-5 border border-[#E5E9EC]">
              <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 pb-20 max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-center text-[#172B3A]">{t('land.featuresTitle')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Array.isArray(features) ? features : []).map((item, i) => (
            <FeatureCard key={item.title} icon={FEATURE_ICONS[i]} title={item.title} desc={item.desc} />
          ))}
        </div>
      </section>

      <section id="pricing" className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold mb-3 text-[#172B3A]">{t('land.pricingTitle')}</h2>
            <p className="text-stone-600 max-w-xl mx-auto">{t('land.pricingLead', { n: trialDays })}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {plans.map((plan) => {
              const copy = t(`plans.${plan.id}`) || {};
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg p-6 flex flex-col ${
                    plan.highlighted
                      ? 'bg-[#172B3A] text-white'
                      : 'bg-white border border-[#E5E9EC]'
                  }`}
                >
                  {plan.highlighted && (
                    <p className="text-[11px] font-medium text-[#8fafa6] mb-2">{t('land.highlighted')}</p>
                  )}
                  <h3 className="text-lg font-semibold">{copy.name || plan.name}</h3>
                  <p className={`text-sm mt-1 mb-5 ${plan.highlighted ? 'text-white/60' : 'text-stone-500'}`}>{copy.audience || plan.audience}</p>
                  <p className="text-3xl font-semibold mb-6">
                    {plan.price.toLocaleString(locale)}
                    <span className={`text-base font-sans font-normal mx-1 ${plan.highlighted ? 'text-white/50' : 'text-stone-400'}`}>
                      {t('land.perMonth', { currency: plan.currency })}
                    </span>
                  </p>
                  <ul className={`space-y-2 text-sm flex-1 mb-8 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {(copy.features || plan.features).map((f) => (
                      <li key={f} className="flex gap-2">
                        <FaCheckCircle className={`mt-0.5 shrink-0 ${plan.highlighted ? 'text-[#8fafa6]' : 'text-[#658B83]'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`block text-center py-2.5 rounded-md text-sm font-semibold ${
                      plan.highlighted ? 'bg-white text-[#172B3A]' : 'bg-[#172B3A] text-white'
                    }`}
                  >
                    {t('land.startTrial')}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-10 bg-white border border-[#E5E9EC] rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">{t('land.addonsTitle')}</h3>
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
        <h2 className="text-xl font-semibold mb-3 text-[#172B3A]">{t('land.whoTitle')}</h2>
        <p className="text-stone-600 text-sm leading-relaxed">{t('land.whoBody')}</p>
        <Link to="/register" className="inline-flex items-center gap-2 mt-8 text-[#172B3A] font-semibold">
          {t('land.create')} <Arrow />
        </Link>
      </section>

      <footer className="bg-[#172B3A] text-white/50 py-10 text-center text-sm">
        <p className="text-lg text-white font-semibold mb-2">{t('brand')}</p>
        <p className="mb-6">{t('land.footerTag')}</p>
        <p className="text-xs text-white/30">© {new Date().getFullYear()} {t('brand')}. {t('land.footerLegal')}</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-white p-5 rounded-lg border border-[#E5E9EC]">
    <div className="w-8 h-8 bg-[#eef2f1] text-[#172B3A] rounded-md flex items-center justify-center text-sm mb-3">
      <Icon />
    </div>
    <h3 className="text-base font-semibold mb-1">{title}</h3>
    <p className="text-stone-600 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;
