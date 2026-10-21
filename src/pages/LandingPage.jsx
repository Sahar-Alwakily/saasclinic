import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheckCircle, FaCalendarAlt, FaUsers, FaStore, FaChartLine, FaArrowLeft,
} from 'react-icons/fa';
import { paidPlans, ADDONS, PLANS } from '../config/plans';

const OUTCOMES = [
  {
    title: 'تقل الغيابات',
    desc: 'تأكيد الموعد، تذكير، عربون مكتوب، ومتابعة من تغيّبت دون إشعار — من قواعد عيادتك لا من وعود عامة.',
  },
  {
    title: 'لا يضيع الوقت الفاضي',
    desc: 'قائمة انتظار وعرض «أول من يقبل» على الموعد الشاغر. ليست حملة تسويق؛ هي طابور يملأ الفراغ.',
  },
  {
    title: 'العميلة لا تختفي',
    desc: 'ملف جلسات بتوقيع، مرحلة أثناء/بعد العلاج، وحملة عودة بحد تواصل وحق انسحاب من الملف.',
  },
];

const LandingPage = () => {
  const trialDays = PLANS.trial.durationDays;
  const plans = paidPlans();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3efe6] text-[#14121c] font-sans">
      <nav className="sticky top-0 z-50 bg-[#14121c] text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4d7cff] via-[#a78bfa] to-[#ff6b4a] font-product font-extrabold flex items-center justify-center">ن</span>
            <span className="font-product text-xl">نورا</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <a href="#pricing" className="hidden sm:inline text-white/70 hover:text-white">الأسعار</a>
            <Link to="/login" className="text-white/80 hover:text-white">دخول</Link>
            <Link to="/register" className="bg-[#4d7cff] text-white px-3 sm:px-5 py-2 rounded-xl font-bold hover:bg-[#3b6af0]">
              {trialDays} يوماً مجاناً
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#4d7cff] font-semibold mb-4">clinic operating system</p>
          <h1 className="font-product text-4xl sm:text-5xl md:text-6xl leading-[1.08] mb-6">
            تشغيل العيادة من الحجز
            <br />
            حتى عودة العميلة.
          </h1>
          <p className="text-lg text-stone-600 mb-8 max-w-2xl mx-auto">
            نورا مساحة عمل لعيادة التجميل: الحجوزات، قائمة الانتظار، الملف الطبي، وصفحة الحجز العامة في كونسول واحد. الأرقام المعروضة من سجل عيادتك فقط.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register" className="bg-[#4d7cff] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#3b6af0]">
              ابدئي {trialDays} يوماً بدون بطاقة
            </Link>
            <a href="#outcomes" className="bg-white border border-[#e4ddd0] px-8 py-4 rounded-xl font-bold text-lg">
              ماذا تغيّر في العيادة
            </a>
          </div>
          <p className="text-sm text-stone-400 mt-4">تجميل، ليزر، فيتامينات، كوزمتكا — ليس مستشفى ولا نظام ضريبي.</p>
        </div>
      </section>

      <section id="outcomes" className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          {OUTCOMES.map((item) => (
            <div key={item.title} className="bg-[#fffcf7] rounded-[1.75rem] p-6 border border-[#e4ddd0]">
              <h2 className="font-product text-2xl mb-3">{item.title}</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 pb-20 max-w-6xl mx-auto">
        <h2 className="font-product text-3xl mb-8 text-center">ما يعمل اليوم داخل الكونسول</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard icon={FaCalendarAlt} title="مواعيد وتشغيل" desc="تقويم، تأكيد، غياب، قائمة انتظار، عربون مكتوب، ورابط للعميلة لإدارة موعدها." />
          <FeatureCard icon={FaUsers} title="ملف العميلة" desc="بيانات طبية، ختم إعلانات، سجل جلسات بتوقيع، وعلاجات تُنشأ مع أول جلسة." />
          <FeatureCard icon={FaStore} title="صفحة العيادة" desc="ثلاثة ثيمات، حجز حسب الفرع، مدونة، وطلب منتجات يصل للعيادة — بلا ادّعاء بوابة دفع." />
          <FeatureCard icon={FaChartLine} title="أرقام من السجل" desc="حضور وإيراد هذا الشهر مقابل الماضي، ازدحام الساعات، وإيراد من ملء الفراغات." />
        </div>
      </section>

      <section id="pricing" className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-product text-3xl mb-3">الاشتراك</h2>
            <p className="text-stone-600 max-w-xl mx-auto">
              ابدئي بتجربة {trialDays} يوماً على كل الوحدات. بعد التجربة تُفتح الأقسام حسب الباقة: تشغيل = تأكيد وحضور؛ عيادة = انتظار وواتساب تشغيلي واسترجاع؛ فروع = بلا حد فريق. الدفع غير مربوط؛ التفعيل اليدوي من شاشة المدفوعات.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-[1.75rem] p-7 flex flex-col ${
                  plan.highlighted
                    ? 'bg-[#14121c] text-white shadow-xl md:-translate-y-2'
                    : 'bg-[#fffcf7] border border-[#e4ddd0]'
                }`}
              >
                {plan.highlighted && (
                  <p className="text-[11px] font-bold text-[#f0b429] mb-2">الأكثر ملاءمة لعيادة ناشطة</p>
                )}
                <h3 className="font-product text-2xl">{plan.name}</h3>
                <p className={`text-sm mt-1 mb-5 ${plan.highlighted ? 'text-white/60' : 'text-stone-500'}`}>{plan.audience}</p>
                <p className="font-product text-4xl mb-6">
                  {plan.price.toLocaleString('ar')}
                  <span className={`text-base font-sans font-normal mr-1 ${plan.highlighted ? 'text-white/50' : 'text-stone-400'}`}>
                    {plan.currency}/شهر
                  </span>
                </p>
                <ul className="space-y-2 text-sm text-right flex-1 mb-8">
                  {plan.features.map((f) => (
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
                  ابدئي التجربة
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-[#fffcf7] border border-[#e4ddd0] rounded-[1.75rem] p-6">
            <h3 className="font-product text-xl mb-2">إضافات — ليست ضمن الاشتراك الأساسي بعد</h3>
            <p className="text-sm text-stone-500 mb-4">لا نعد بها كأنها جاهزة على الهبوط. تُسعَّر عند الربط.</p>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {ADDONS.map((a) => (
                <div key={a.id}>
                  <p className="font-bold">{a.name}</p>
                  <p className="text-stone-500 mt-1">{a.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 max-w-3xl mx-auto text-center">
        <h2 className="font-product text-2xl mb-3">لمن نورا — ولمن ليست</h2>
        <p className="text-stone-600 text-sm leading-relaxed">
          لعيادة أو أخصائية تجميل تريد تقليل الغياب وملء الفراغ وإرجاع من انقطعت. ليست لسلسلة مستشفيات، وليست بديلاً عن محاسب أو بوت يرد على واتساب لوحده.
        </p>
        <Link to="/register" className="inline-flex items-center gap-2 mt-8 text-[#4d7cff] font-bold">
          أنشئ مساحة عمل <FaArrowLeft />
        </Link>
      </section>

      <footer className="bg-[#14121c] text-white/50 py-12 text-center text-sm">
        <p className="font-product text-2xl text-white mb-2">نورا</p>
        <p className="mb-6">مساحة عمل لعيادة التجميل.</p>
        <p className="text-xs text-white/30">© {new Date().getFullYear()} نورا. أرقام العميلات للتذكير وتشغيل الموعد؛ يمكن إيقاف رسائل الاسترجاع من الملف.</p>
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
