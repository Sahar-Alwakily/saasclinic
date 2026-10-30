import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheckCircle, FaCalendarAlt, FaUsers, FaStore, FaChartLine, FaArrowLeft, FaArrowRight,
} from 'react-icons/fa';
import { paidPlans, ADDONS, PLANS } from '../config/plans';
import { useLocale } from '../context/LocaleContext';
import LangSwitcher from '../components/i18n/LangSwitcher';

const FEATURE_ICONS = [FaCalendarAlt, FaUsers, FaStore, FaChartLine];
const CARD_WASH = ['stat-card-mint', 'stat-card-sky', 'stat-card-gold', 'stat-card-lilac'];

const LandingPage = () => {
  const { t, dir, locale } = useLocale();
  const trialDays = PLANS.trial.durationDays;
  const plans = paidPlans();
  const outcomes = t('outcomes');
  const features = t('features');
  const Arrow = dir === 'rtl' ? FaArrowLeft : FaArrowRight;

  return (
    <div dir={dir} className="min-h-screen bg-white text-[#14171c] font-sans">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#e4eee8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-[#16a34a] text-white text-sm font-bold flex items-center justify-center">{t('brandMark')}</span>
            <span className="text-sm font-bold text-[#111827]">{t('brand')}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <LangSwitcher tone="light" />
            <a href="#pricing" className="hidden sm:inline text-[#6b7280] hover:text-[#047857] font-medium">{t('nav.pricing')}</a>
            <Link to="/login" className="text-[#111827] font-bold px-2">{t('nav.login')}</Link>
            <Link to="/register" className="bg-[#10b981] text-white px-3 py-2 rounded-2xl text-[12px] sm:text-sm font-bold hover:bg-[#059669] whitespace-nowrap shrink-0">
              {t('nav.trial', { n: trialDays })}
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div>
            <p className="nura-chip nura-chip-mint mb-4">{t('os')}</p>
            <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-tight text-[#111827]">
              {t('land.h1a')}
              <br />
              {t('land.h1b')}
            </h1>
            <p className="text-[15px] text-[#8a9199] mt-4 max-w-xl leading-relaxed">{t('land.lead')}</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <Link to="/register" className="inline-flex justify-center bg-[#10b981] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#059669]">
                {t('land.cta', { n: trialDays })}
              </Link>
              <a href="#outcomes" className="inline-flex justify-center bg-white border border-[#e4eee8] text-[#111827] px-5 py-3 rounded-2xl font-bold">
                {t('land.outcomesCta')}
              </a>
            </div>
            <p className="text-sm text-[#8a9199] mt-4">{t('land.niche')}</p>
          </div>

          <div className="saas-card p-4 sm:p-5">
            <div className="flex items-center gap-2.5 px-1 pb-4 border-b border-[#e4eee8]">
              <span className="w-8 h-8 rounded-lg bg-[#16a34a] text-white text-sm font-bold flex items-center justify-center">{t('brandMark')}</span>
              <div>
                <p className="text-sm font-bold leading-none">{t('brand')}</p>
                <p className="text-[11px] text-[#9ca3af] mt-1">{t('land.featuresTitle')}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {(Array.isArray(features) ? features : []).map((item, i) => {
                const Icon = FEATURE_ICONS[i] || FaCalendarAlt;
                return (
                  <div key={item.title} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${i === 0 ? 'bg-[#10b981] text-white' : 'text-[#6b7280]'}`}>
                    <Icon className="shrink-0 text-[13px]" />
                    <span className="text-sm font-bold truncate">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="outcomes" className="px-4 sm:px-6 pb-14 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-3">
          {(Array.isArray(outcomes) ? outcomes : []).map((item, i) => (
            <div key={item.title} className={`saas-card p-5 ${CARD_WASH[i % CARD_WASH.length]}`}>
              <h2 className="text-base font-bold text-[#111827] mb-2">{item.title}</h2>
              <p className="text-sm text-[#6b7280] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 sm:px-6 pb-14 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold tracking-tight text-[#111827] mb-4">{t('land.featuresTitle')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Array.isArray(features) ? features : []).map((item, i) => (
            <FeatureCard key={item.title} icon={FEATURE_ICONS[i]} title={item.title} desc={item.desc} wash={CARD_WASH[i % CARD_WASH.length]} />
          ))}
        </div>
      </section>

      <section id="pricing" className="px-4 sm:px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-[#111827]">{t('land.pricingTitle')}</h2>
            <p className="text-sm text-[#8a9199] mt-1 max-w-xl">{t('land.pricingLead', { n: trialDays })}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 items-stretch">
            {plans.map((plan) => {
              const copy = t(`plans.${plan.id}`) || {};
              return (
                <div
                  key={plan.id}
                  className={`saas-card p-5 flex flex-col ${plan.highlighted ? 'stat-card-mint' : ''}`}
                >
                  {plan.highlighted && (
                    <p className="nura-chip nura-chip-mint w-fit mb-3">{t('land.highlighted')}</p>
                  )}
                  <h3 className="text-base font-bold text-[#111827]">{copy.name || plan.name}</h3>
                  <p className="text-sm mt-1 mb-4 text-[#8a9199]">{copy.audience || plan.audience}</p>
                  <p className="text-3xl font-extrabold tracking-tight text-[#059669] mb-5">
                    {plan.price.toLocaleString(locale)}
                    <span className="text-sm font-medium text-[#8a9199] mx-1">
                      {t('land.perMonth', { currency: plan.currency })}
                    </span>
                  </p>
                  <ul className={`space-y-2 text-sm flex-1 mb-6 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {(copy.features || plan.features).map((f) => (
                      <li key={f} className="flex gap-2 text-[#374151]">
                        <FaCheckCircle className="mt-0.5 shrink-0 text-[#10b981]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`block text-center py-2.5 rounded-2xl text-sm font-bold ${
                      plan.highlighted ? 'bg-[#10b981] text-white hover:bg-[#059669]' : 'bg-[#111827] text-white hover:bg-[#030712]'
                    }`}
                  >
                    {t('land.startTrial')}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="saas-card mt-4 p-5">
            <h3 className="text-base font-bold text-[#111827]">{t('land.addonsTitle')}</h3>
            <p className="text-sm text-[#8a9199] mt-1 mb-4">{t('land.addonsLead')}</p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {ADDONS.map((a) => (
                <div key={a.id} className="rounded-2xl bg-[#f8faf9] border border-[#e4eee8] p-3">
                  <p className="font-bold text-[#111827]">{t(`addons.${a.id}.name`)}</p>
                  <p className="text-[#8a9199] mt-1">{t(`addons.${a.id}.note`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-16 max-w-6xl mx-auto">
        <div className="saas-card stat-card-mint p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#111827]">{t('land.whoTitle')}</h2>
            <p className="text-sm text-[#6b7280] leading-relaxed mt-2 max-w-2xl">{t('land.whoBody')}</p>
          </div>
          <Link to="/register" className="inline-flex items-center justify-center gap-2 shrink-0 bg-[#10b981] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#059669]">
            {t('land.create')} <Arrow />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#e4eee8] py-8 text-sm text-[#8a9199]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#16a34a] text-white text-xs font-bold flex items-center justify-center">{t('brandMark')}</span>
            <span className="font-bold text-[#111827]">{t('brand')}</span>
            <span>{t('land.footerTag')}</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} {t('brand')}. {t('land.footerLegal')}</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, wash }) => (
  <div className={`saas-card p-5 ${wash}`}>
    <div className="w-9 h-9 bg-white/80 text-[#047857] rounded-xl flex items-center justify-center text-sm mb-3">
      <Icon />
    </div>
    <h3 className="text-sm font-bold text-[#111827] mb-1">{title}</h3>
    <p className="text-[#6b7280] text-sm leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;
