import React from 'react';
import { Link } from 'react-router-dom';
import { paidPlans, PLANS } from '../config/plans';
import { useLocale } from '../context/LocaleContext';

const Icon = ({ name, className = '' }) => (
  <span className={`ms ${className}`} aria-hidden="true">{name}</span>
);

const PLAN_COPY = {
  starter: {
    badge: 'للعيادة المستقلة',
    lead: 'مناسب للأخصائية المستقلة أو العيادة ذات الغرفة الواحدة.',
    features: [
      'إدارة المواعيد والخدمات والتقويم الطبي',
      'ملفات العميلات الأساسية وتوثيق الزيارات',
      'صفحة حجز عامة متجاوبة للعيادة',
      'تقارير الحضور والغياب والإيراد المباشر',
    ],
    footnote: 'حسابان (طبيبة + مساعدة) • فرع واحد',
  },
  pro: {
    badge: 'شامل المزايا الذكية',
    lead: 'للعيادات التي تسعى لملء الشواغر وأتمتة الواتساب وتوثيق الإقرارات.',
    features: [
      'جميع ميزات باقة تشغيل بالكامل',
      'قائمة الانتظار الذكية وملء الشواغر الفوري',
      'نظام العربون الإلكتروني وقواعد الإلغاء',
      'جلسات بتوقيع رقمي للمريضة وإقرارات إلكترونية',
      'إشعارات ما قبل/بعد الجلسة عبر واتساب العيادة',
    ],
    footnote: 'حتى 10 حسابات للموظفات والأطباء • فرعين',
    ribbon: 'الأكثر طلباً للعيادات النشطة',
  },
  business: {
    badge: 'للمراكز الكبرى',
    lead: 'للمراكز متعددة الفروع والفريق الطبي الواسع وسلاسل العيادات.',
    features: [
      'جميع ميزات باقة عيادة بالكامل',
      'فروع وجداول متعددة بلا أي حد أقصى',
      'صلاحيات دقيقة للفريق الطبي وطاقم الاستقبال',
      'مقارنة إيرادات الفروع وإنتاجية أجهزة الليزر',
    ],
    footnote: 'مدير حساب مخصص ودعم فني على مدار الساعة',
    footnoteIcon: 'support_agent',
  },
};

const OUTCOMES = [
  { icon: 'event_available', tone: 'primary', value: '42%−', title: 'تقليل نسبة الغياب', body: 'تأكيدات فورية عبر WhatsApp الرسمي، تذكير تلقائي مجدول، وربط حجز الموعد بعربون رمزي لمنع حجز الأوقات الوهمية.' },
  { icon: 'autorenew', tone: 'emerald', value: '100%', title: 'تعويض الشواغر الفجائية', body: 'نظام الانتظار الذكي يرسل إشعار القبول الفوري للمريضات المنتظرات بنفس اليوم لملء فراغ الطبيبة فوراً.' },
  { icon: 'draw', tone: 'primary', value: '0%', title: 'أوراق وملفات تالفة', body: 'سجل رقمي متكامل لكل مريضة، جرعات البوتوكس ومناطق الحقن، صور مقارنة الجلسات، وتوقيع إلكتروني آمن عبر جهاز التابلت.' },
  { icon: 'group_add', tone: 'emerald', value: '+34%', title: 'معدل إعادة الزيارة', body: 'تنبيهات تلقائية ذكية لمواعيد الرتوش ومراجعات الفيلر أو جلسات الليزر الدورية لتحفيز عودة العميلات تلقائياً.' },
];

const MODULES = [
  { icon: 'calendar_month', title: 'إدارة المواعيد والغرف المزدوجة', body: 'جدولة غرف الليزر، غرف الحقن، وجلسات الرتوش بدون تداخل.', active: true },
  { icon: 'medical_information', title: 'الملف الطبي والسجل (EMR)', body: 'توثيق أنواع المواد، جرعات الفيلر، وإقرارات المريضة الرقمية.' },
  { icon: 'mark_chat_unread', title: 'بوابة حجز مستقلة وأتمتة الواتساب', body: 'صفحة خاصة بعيادتك وتأكيدات فورية برقم الواتساب الرسمي.' },
  { icon: 'monitoring', title: 'تحليلات الأداء وإيرادات الأجهزة', body: 'ساعات إشغال الأجهزة الطبية، أكثر الخدمات طلباً، وأرباح الفروع.' },
];

const MODULE_POINTS = [
  { title: 'جدولة متعددة الغرف والأطباء', body: 'توزيع المواعيد تلقائياً حسب نوع الإجراء وتوفر الأجهزة وغرف العلاج.' },
  { title: 'قائمة الانتظار اللحظية (Smart Waitlist)', body: 'إرسال شاغر الإلغاء فورياً لأول عميلة مسجلة بضغطة زر واحدة.' },
  { title: 'تأكيد العربون وسياسة الإلغاء', body: 'تثبيت الجدية برابط دفع إلكتروني مباشر وتوثيق شروط عدم الحضور.' },
  { title: 'تكامل WhatsApp Business API', body: 'إرسال الموقع الجغرافي وتعليمات قبل الجلسة تلقائياً للمريضة.' },
];

const FAQS = [
  { q: 'هل يحتاج وَرَف إلى تنصيب سيرفرات داخل العيادة؟', a: 'لا أبداً، وَرَف نظام سحابي 100% يعمل مباشرة من خلال المتصفح على أجهزة الآيباد، شاشات الاستقبال، الهواتف الذكية أو أجهزة الكمبيوتر دون أي إعداد مسبق.' },
  { q: 'كيف تعمل ميزة تعويض الشواغر التلقائية؟', a: 'بمجرد إلغاء أي موعد، يرسل النظام إشعاراً فورياً للمريضات بقائمة الانتظار لنفس اليوم. أول من تضغط على رابط القبول يُحجز الموعد باسمها وتُغلق الدعوة تلقائياً.' },
  { q: 'هل تظل بياناتي ومواعيدي آمنة بعد انتهاء الـ 14 يوماً؟', a: 'نعم، بياناتك وملفات مريضاتك مشفرة ومحفوظة تماماً. يمكنك تفعيل الاشتراك بالباقة التي تناسبك في أي وقت لمتابعة العمل دون انقطاع.' },
];

const LandingPage = () => {
  const { lang, setLang, langs } = useLocale();
  const trialDays = PLANS.trial.durationDays;
  const plans = paidPlans();

  return (
    <div dir="rtl" className="waraf-landing min-h-screen bg-white text-slate-900 antialiased">
      <div className="bg-slate-900 text-slate-200 text-xs py-2.5 px-4 border-b border-slate-800 relative z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2.5 text-center">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium text-[11px] border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            تحديث V2.4 السحابي
          </span>
          <span className="text-slate-300">منظومة وَرَف  المتخصصة: احصل على تجربة كاملة لمدة {trialDays} يوماً بدون بطاقة ائتمان.</span>
          <a className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-0.5 ms-1" href="#pricing">
            استعراض الباقات <Icon name="arrow_back" className="text-xs" />
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">و</span>
            <span className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900">وَرَف</span>
                <span className="mono text-[11px] font-medium text-slate-400 tracking-wider">/ WARAF</span>
              </span>
              <span className="mono text-[10px] tracking-wider text-slate-400 uppercase">Clinical Tech OS</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13.5px] font-medium text-slate-600">
            <a className="hover:text-[#006948]" href="#features">المميزات </a>
            <a className="hover:text-[#006948]" href="#outcomes">الأثر التشغيلي</a>
            <a className="hover:text-[#006948]" href="#specialization">التخصص الطبي</a>
            <a className="hover:text-[#006948]" href="#pricing">الباقات</a>
            <a className="hover:text-[#006948]" href="#faq">الأسئلة الشائعة</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/70 text-xs font-medium">
              {langs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLang(item.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${lang === item.id ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {item.id === 'ar' ? 'العربية' : item.id.toUpperCase()}
                </button>
              ))}
            </div>
            <Link to="/login" className="text-xs font-semibold text-slate-700 hover:text-[#006948] px-2 sm:px-3 py-2">تسجيل الدخول</Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 bg-[#006948] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#00553a] transition-all">
              ابدأ مجاناً <Icon name="arrow_back" className="!text-sm" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden bg-white">
        <div className="absolute inset-0 grid-pattern pointer-events-none opacity-60 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            الجيل الجديد من منصات تشغيل العيادات السحابية • Aesthetic Clinic OS
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-[58px] font-bold tracking-tight leading-[1.18] text-slate-900 max-w-4xl mx-auto">
            منصة تشغيل متكاملة لعيادات التجميل،
            <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006948] via-emerald-600 to-teal-700"> من الحجز الأول حتى الإجراء الطبي الموثق.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            «وَرَف» يجمع إدارة المواعيد الدقيقة، قائمة الانتظار الذكية لملء الفراغات اللحظية، السجلات السيرية الرقمية (EMR)، وتأكيدات الواتساب الآلية في شاشة موحدة وسلسة.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#006948] text-white px-7 py-3 rounded-xl font-semibold text-sm hover:bg-[#00553a]">
              ابدأ تجربة مجانية لمدة {trialDays} يوماً <Icon name="arrow_back" className="!text-base" />
            </Link>
            <a href="#demo" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50">
              <Icon name="play_circle" className="!text-base text-slate-500" /> استعراض ديمو حي للنظام
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Icon name="check_circle" className="!text-sm text-emerald-600" /> بدون إدخال بطاقة بنكية</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="shield" className="!text-sm text-emerald-600" /> تشفير سحابي للملفات الطبية</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="bolt" className="!text-sm text-emerald-600" /> جاهز للتشغيل خلال 3 دقائق</span>
          </div>

          <div id="demo" className="mt-14 text-right">
            <div className="p-1 sm:p-2 rounded-2xl bg-slate-900/5 border border-slate-200/90 shadow-2xl">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="ms-3 hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 mono text-[11px] text-slate-500">
                      <Icon name="lock" className="!text-[12px] text-slate-400" /> app.waraf.io/clinic-hub
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium inline-flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> مزامنة حية • عيادة التجميل والليزر
                  </span>
                </div>
                <div className="grid lg:grid-cols-12 p-4 sm:p-6 gap-6 bg-[#fcfcfd]">
                  <aside className="hidden lg:block lg:col-span-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center gap-2.5 pb-3 mb-2 border-b border-slate-100">
                      <span className="w-7 h-7 rounded-md bg-[#006948] text-white flex items-center justify-center font-bold text-xs">و</span>
                      <span>
                        <span className="block font-bold text-slate-900 text-xs">عيادة د. سارة عدنان</span>
                        <span className="block text-[10px] text-slate-400">الفرع الرئيسي • نشط</span>
                      </span>
                    </div>
                    <DemoNav icon="calendar_today" label="جدول المواعيد" badge="14 اليوم" active />
                    <DemoNav icon="hourglass_empty" label="قائمة الانتظار" badge="3 شواغر" />
                    <DemoNav icon="description" label="ملفات العملاء" />
                    <DemoNav icon="chat_bubble" label="إشعارات WhatsApp" />
                    <DemoNav icon="insights" label="تقارير الإشغال" />
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] mb-1">
                        <Icon name="check_circle" className="!text-sm text-emerald-600" /> تم تعويض موعد شاغر!
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">اعتذار في 03:00 م — تم تأكيد الحجز للمريضة المسجلة بقائمة الانتظار بنجاح.</p>
                    </div>
                  </aside>
                  <div className="lg:col-span-9 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Stat label="معدل الحضور الفعلي" value="94.8%" extra="+18%" />
                      <Stat label="ساعات الفراغ المسترجعة" value="32 ساعة" extra="Waitlist" muted />
                      <Stat label="عربونات مؤكدة" value="100%" />
                      <Stat label="جلسات موثقة بتوقيع" value="156 جلسة" accent />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">جدول مواعيد اليوم — عيادة الجلدية والحقن</span>
                          <span className="mono text-slate-400 text-[11px]">اليوم، 14:30</span>
                        </div>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">مزامنة الواتساب: نشطة</span>
                      </div>
                      <div className="space-y-2">
                        <QueueRow time="10:30 ص" name="ريم عبد الله" detail="فيلر شفايف + رتوش • الجلسة الثانية" status="تم الحضور والتوثيق ✓" tone="emerald" />
                        <QueueRow time="11:45 ص" name="لمى يوسف" detail="ليزر كربوني + بروتوكول نضارة" status="عربون مدفوع" tone="sky" note="في الانتظار" />
                        <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="mono text-slate-400 bg-slate-200/60 px-2 py-1 rounded">01:15 م</span>
                            <span>
                              <span className="block font-semibold text-slate-700">هند مراد — اعتذار مسبق</span>
                              <span className="block text-[11px] text-emerald-600 font-medium">عرض فوري على قائمة الانتظار (2 بالانتظار)</span>
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-medium">ملء الشاغر</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="outcomes" className="py-20 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <span className="mono text-xs font-semibold tracking-wider text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">الأثر التشغيلي الحقيقي</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-3 tracking-tight">أداء  محسوب بالأرقام، لا بمجرد شاشات إدخال.</h2>
            <p className="mt-3 text-slate-500 text-sm sm:text-base">حوّلنا التحديات اليومية التي ترهق الطبيبة وطاقم الاستقبال إلى نظم ذكية تعمل بهدوء في الخلفية.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {OUTCOMES.map((item) => (
              <article key={item.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_10px_30px_-10px_rgba(15,23,42,0.05)] transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4 transition-colors ${item.tone === 'emerald' ? 'text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'text-[#006948] group-hover:bg-[#006948] group-hover:text-white'}`}>
                  <Icon name={item.icon} className="!text-xl" />
                </div>
                <div className="mono text-3xl font-bold text-slate-900 mb-1 tracking-tight">{item.value}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="mono text-xs font-semibold tracking-wider text-[#006948] uppercase">Modular Architecture</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-1 tracking-tight">وحدات تخصصية مصممة خصيصاً لمنهجية عيادات التجميل</h2>
            </div>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">استبدل 5 اشتراكات متباعدة (برنامج مواعيد، واتساب بوت، فواتير، ملفات صور) بنظام سحابي نقي ومترابط بالكامل.</p>
          </div>
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-2.5">
              {MODULES.map((item) => (
                <div key={item.title} className={`p-4 rounded-xl ${item.active ? 'bg-slate-50 border-2 border-[#006948]/80' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.active ? 'bg-[#006948] text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon name={item.icon} className="!text-base" />
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${item.active ? 'text-slate-900' : 'text-slate-800'}`}>{item.title}</div>
                      <p className="text-xs text-slate-500">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_10px_30px_-10px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-200">
                <div>
                  <span className="mono text-[11px] text-emerald-700 font-semibold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Module 01</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1.5">إدارة الجدولة وصالة الاستقبال</h3>
                </div>
                <span className="mono text-xs text-slate-400 shrink-0">Sync: iOS / Web / iPad</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 my-6">
                {MODULE_POINTS.map((point) => (
                  <div key={point.title} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon name="check" className="!text-sm" />
                    </span>
                    <span>
                      <span className="block font-bold text-slate-900 text-xs mb-1">{point.title}</span>
                      <span className="block text-slate-500 text-xs leading-relaxed">{point.body}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs mono font-bold">W</span>
                <p className="text-xs text-slate-600 leading-relaxed">«في قطاع التجميل، كل ساعة فراغ ملغاة تعني خسارة تشغيلية مؤكدة. وَرَف مصمم لاسترجاع هذه الساعات وتحويلها لإيرادات حقيقية.»</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="specialization" className="py-16 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <span className="text-emerald-400 mono text-xs font-semibold tracking-wider uppercase">Focus & Precision</span>
                <h3 className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight">صُمم حصراً للمجال التجميلي </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">ابتعدنا تماماً عن تعقيدات البرامج الطبية العامة القديمة وبرامج المستشفيات التقليدية لنبني بيئة عمل خفيفة تليق بفخامة عيادتك التجميلية وسرعة إيقاع يومك .</p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs">
                  {['عيادات الحقن والتجميل', 'أطباء الجلدية والتناسلية', 'مراكز إزالة الشعر بالليزر', 'عيادات العناية بالبشرة المتقدمة'].map((tag) => (
                    <span key={tag} className="bg-white/10 text-slate-200 px-3 py-1 rounded-md border border-white/10">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5 bg-white/5 p-5 rounded-xl border border-white/10 text-xs text-slate-300 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-white text-xs mb-1">
                  <Icon name="verified" className="!text-sm text-emerald-400" /> ما يميز وَرَف عن البرامج الأخرى:
                </div>
                <p>ليس برنامج مستشفيات عام بطيء بمئات النوافذ غير المفيدة.</p>
                <p>ليس مجرد شيت إكسل أو بوت واتساب غير مرتبط بملف المريضة.</p>
                <p>نظام سحابي خفيف يعمل على أي iPad أو هاتف أو لابتوب فوراً.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="mono text-xs font-semibold tracking-wider text-[#006948] uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">باقات شفافة وبدون تعقيد</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-3 tracking-tight">استثمار واضح ينمو بمرونة مع عيادتك</h2>
            <p className="mt-3 text-slate-500 text-sm sm:text-base">جميع الباقات تبدأ بتجربة حرة لمدة {trialDays} يوماً كاملة لكافة الوحدات، بدون عقود إلزامية.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
            {plans.map((plan) => {
              const copy = PLAN_COPY[plan.id] || { features: plan.features, lead: plan.audience, badge: '' };
              return (
                <article key={plan.id} className={`bg-white rounded-2xl p-7 flex flex-col justify-between relative ${plan.highlighted ? 'border-2 border-[#006948] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_10px_30px_-10px_rgba(15,23,42,0.05)] md:scale-[1.02]' : 'border border-slate-200'}`}>
                  {copy.ribbon && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#006948] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">{copy.ribbon}</div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-3 mt-1 gap-2">
                      <h3 className={`text-lg font-bold ${plan.highlighted ? 'text-[#006948]' : 'text-slate-900'}`}>{plan.name}</h3>
                      <span className={`text-[11px] mono font-medium px-2 py-0.5 rounded ${plan.highlighted ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-slate-500 bg-slate-100'}`}>{copy.badge}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">{copy.lead}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="mono text-4xl font-extrabold text-slate-900">{plan.price.toLocaleString('en-US')}</span>
                      <span className="text-xs font-medium text-slate-400">{plan.currency} / شهرياً</span>
                    </div>
                    <div className="h-px bg-slate-100 mb-6" />
                    <ul className="space-y-3 text-xs text-slate-600">
                      {(copy.features || []).map((feature, index) => (
                        <li key={feature} className={`flex items-center gap-2 ${index === 0 && plan.highlighted ? 'font-semibold text-slate-700' : ''}`}>
                          <Icon name="check_circle" className="!text-base text-[#006948]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {copy.footnote && (
                        <li className="flex items-center gap-2 text-slate-400">
                          <Icon name={copy.footnoteIcon || 'group'} className="!text-base" />
                          <span>{copy.footnote}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <Link to="/register" className={`mt-8 w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-all ${plan.highlighted ? 'bg-[#006948] hover:bg-[#00553a] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}>
                    {plan.highlighted ? `بدء تجربة ${trialDays} يوماً مجاناً` : 'بدء التجربة المجانية'}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="mono text-xs font-semibold tracking-wider text-[#006948] uppercase">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">الأسئلة المتكررة</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item) => (
              <article key={item.q} className="p-4 rounded-xl bg-white border border-slate-200">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-3">
                  <span>{item.q}</span>
                  <Icon name="expand_more" className="!text-base text-slate-400" />
                </h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-slate-900 rounded-2xl p-8 sm:p-12 text-center text-white border border-slate-800">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">ابدأ تشغيل عيادتك بمعايير  فائقة الدقة</h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">انضم إلى عيادات التجميل التي تدير مواعيدها وتملأ شواغرها بهدوء وسلاسة عبر منصة وَرَف السحابية.</p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register" className="w-full sm:w-auto bg-[#006948] hover:bg-[#00553a] text-white px-7 py-2.5 rounded-xl font-semibold text-xs">ابدأ {trialDays} يوماً مجاناً</Link>
              <Link to="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white px-6 py-2.5 rounded-xl font-semibold text-xs">
                <Icon name="chat" className="!text-sm" /> دخول العيادة
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-50 border-t border-slate-200/80 pt-12 pb-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-10 border-b border-slate-200">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">و</span>
                <span className="text-sm font-bold text-slate-900">وَرَف | WARAF</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">نظام تشغيل وإدارة المواعيد السيرية المتخصص لعيادات التجميل، أطباء الجلدية، ومراكز الليزر الحديثة.</p>
              <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>منصة سحابية لتشغيل العيادة</span>
              </div>
            </div>
            <FooterCol title="المنظومة" links={[['#features', 'جدول المواعيد'], ['#features', 'قائمة الانتظار الذكية'], ['#features', 'الملف السيري (EMR)'], ['#features', 'أتمتة WhatsApp']]} />
            <div className="space-y-2.5">
              <h2 className="font-semibold text-slate-900 text-xs">التخصصات</h2>
              <ul className="space-y-1.5">
                {['عيادات الحقن والتجميل', 'مراكز الليزر والجلدية', 'عيادات العناية بالبشرة', 'المراكز متعددة الفروع'].map((item) => (
                  <li key={item} className="text-slate-600">{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2.5">
              <h2 className="font-semibold text-slate-900 text-xs">الدخول</h2>
              <ul className="space-y-1.5">
                <li><Link className="hover:text-[#006948]" to="/login">تسجيل الدخول</Link></li>
                <li><Link className="hover:text-[#006948]" to="/register">بدء التجربة</Link></li>
                <li><a className="hover:text-[#006948]" href="#pricing">الباقات</a></li>
                <li><a className="hover:text-[#006948]" href="#faq">الأسئلة الشائعة</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} وَرَف | WARAF Aesthetic Clinic Operating System. جميع الحقوق محفوظة.</p>
            <p className="mono">Cloud SaaS • عيادة التجميل</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const DemoNav = ({ icon, label, badge, active = false }) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${active ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'}`}>
    <span className="flex items-center gap-2"><Icon name={icon} className={`!text-base ${active ? 'text-[#006948]' : ''}`} /> {label}</span>
    {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-[#006948] text-white mono' : 'bg-emerald-100 text-emerald-800 font-medium'}`}>{badge}</span>}
  </div>
);

const Stat = ({ label, value, extra, muted = false, accent = false }) => (
  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
    <span className="text-[11px] font-medium text-slate-400">{label}</span>
    <div className={`mono text-xl font-bold mt-1 flex items-baseline justify-between gap-2 ${accent ? 'text-[#006948]' : 'text-slate-900'}`}>
      <span>{value}</span>
      {extra && <span className={`text-[10px] font-sans font-medium ${muted ? 'text-slate-500' : 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded'}`}>{extra}</span>}
    </div>
  </div>
);

const QueueRow = ({ time, name, detail, status, tone, note }) => (
  <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-3 min-w-0">
      <span className="mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded shrink-0">{time}</span>
      <span className="min-w-0">
        <span className="block font-bold text-slate-900">{name}</span>
        <span className="block text-[11px] text-slate-500 truncate">{detail}</span>
      </span>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className={`px-2 py-0.5 rounded font-medium text-[11px] border ${tone === 'sky' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{status}</span>
      {note ? <span className="text-slate-400 text-[11px]">{note}</span> : <Icon name="edit_note" className="!text-sm text-slate-400" />}
    </div>
  </div>
);

const FooterCol = ({ title, links }) => (
  <div className="space-y-2.5">
    <h2 className="font-semibold text-slate-900 text-xs">{title}</h2>
    <ul className="space-y-1.5">
      {links.map(([href, label]) => (
        <li key={label}><a className="hover:text-[#006948]" href={href}>{label}</a></li>
      ))}
    </ul>
  </div>
);

export default LandingPage;
