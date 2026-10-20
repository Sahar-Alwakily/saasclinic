import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCheckCircle, FaChartLine, FaCalendarAlt, FaMobileAlt, 
  FaStore, FaUsers, FaArrowLeft 
} from 'react-icons/fa';

const LandingPage = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans">
      
      {/* النافبار */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center text-xl shadow-lg">
                🩺
              </div>
              <span className="font-extrabold text-2xl text-gray-800">ClinicSaaS</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-violet-600 font-medium">تسجيل الدخول</Link>
              <Link to="/register" className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-violet-700 transition">
                ابدأ مجاناً
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-violet-50 to-fuchsia-50 py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-white text-violet-600 font-bold px-4 py-1.5 rounded-full text-sm mb-6 shadow-sm border border-violet-100">
            🚀 النظام الأحدث لإدارة عيادات التجميل
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            أدر عيادتك باحترافية، <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-violet-600 to-fuchsia-500">
              وضاعف أرباحك
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            نظام متكامل لإدارة الحجوزات، ملفات العملاء، ومتابعة العلاجات، مع متجر إلكتروني خاص بعيادتك لجذب عملاء جدد. كل هذا في مكان واحد.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="bg-violet-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-violet-700 transition transform hover:-translate-y-1">
              جرّب النظام مجاناً 14 يوم
            </Link>
            <a href="#features" className="bg-white text-violet-600 border border-violet-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-violet-50 transition">
              اكتشف الميزات
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4">بدون بطاقة ائتمان • إلغاء في أي وقت</p>
        </div>
      </section>

      {/* الميزات */}
      <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">كل ما تحتاجه عيادتك في مكان واحد</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">صممنا النظام ليكون سهل الاستخدام، ويوفر عليك الوقت والجهد.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={FaCalendarAlt} 
            title="إدارة الحجوزات بذكاء" 
            desc="نظام حجوزات متطور مع تنبيهات ذكية تمنع الإلغاءات المتكررة وتدير وقتك بفعالية."
          />
          <FeatureCard 
            icon={FaStore} 
            title="متجر إلكتروني خاص" 
            desc="واجهة عملاء احترافية بتصاميم متعددة تتيح للعميل الحجز وشراء المنتجات مباشرة."
          />
          <FeatureCard 
            icon={FaUsers} 
            title="ملفات طبية ومتابعة" 
            desc="سجل تاريخ كل عميلة، تابع مراحل العلاج، وسجل الجلسات بضغطة زر."
          />
          <FeatureCard 
            icon={FaChartLine} 
            title="تقارير وإحصائيات" 
            desc="اعرف أكثر الساعات ازدحاماً، معدل الحضور، وأفضل العملاء لديك لتنمي أرباحك."
          />
          <FeatureCard 
            icon={FaMobileAlt} 
            title="يعمل على كل الأجهزة" 
            desc="نظام سريع ومتجاوب، سواء كنت تستخدمه من الكمبيوتر أو الموبايل أو التابلت."
          />
          <FeatureCard 
            icon={FaCheckCircle} 
            title="إدارة الموظفين" 
            desc="أضف فريق عملك، وحدد لكل موظفة أقسامها وصلاحياتها لضمان تنظيم العمل."
          />
        </div>
      </section>

      {/* التسعير */}
      <section className="py-24 bg-gray-50 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">خطط تناسب الجميع</h2>
          <p className="text-gray-500 mb-12">ابدأ مجاناً، وارقِ باقتك عندما تنمو عيادتك.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* الباقة الأساسية */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-2">الباقة الأساسية</h3>
              <p className="text-gray-500 text-sm mb-6">للعيادات الصغيرة</p>
              <div className="text-4xl font-extrabold text-gray-900 mb-6">800 <span className="text-lg text-gray-400 font-normal">₪/شهر</span></div>
              <ul className="space-y-3 mb-8 text-right text-gray-600">
                <li className="flex items-center gap-2"><FaCheckCircle className="text-violet-500" /> حتى 300 حجز شهرياً</li>
                <li className="flex items-center gap-2"><FaCheckCircle className="text-violet-500" /> موظفة واحدة</li>
                <li className="flex items-center gap-2"><FaCheckCircle className="text-violet-500" /> إدارة الخدمات</li>
              </ul>
              <Link to="/register" className="block w-full text-center bg-gray-100 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-200 transition">ابدأ الآن</Link>
            </div>

            {/* باقة المحترفين */}
            <div className="bg-gradient-to-b from-violet-600 to-fuchsia-500 rounded-3xl p-8 shadow-xl text-white relative transform scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">الأكثر مبيعاً</div>
              <h3 className="text-xl font-bold mb-2">باقة المحترفين</h3>
              <p className="text-violet-100 text-sm mb-6">للعياادات النامية</p>
              <div className="text-4xl font-extrabold mb-6">1000 <span className="text-lg text-violet-200 font-normal">₪/شهر</span></div>
              <ul className="space-y-3 mb-8 text-right text-violet-50">
                <li className="flex items-center gap-2"><FaCheckCircle /> حجوزات غير محدودة</li>
                <li className="flex items-center gap-2"><FaCheckCircle /> موظفين غير محدودين</li>
                <li className="flex items-center gap-2"><FaCheckCircle /> متجر إلكتروني ومنتجات</li>
                <li className="flex items-center gap-2"><FaCheckCircle /> التنبيهات الذكية</li>
              </ul>
              <Link to="/register" className="block w-full text-center bg-white text-violet-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition">ابدأ التجربة المجانية</Link>
            </div>
          </div>
        </div>
      </section>

      {/* الفوتر */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">🩺</span>
            <span className="font-bold text-2xl text-white">ClinicSaaS</span>
          </div>
          <p className="mb-6">النظام الأسهل والأكثر احترافية لإدارة عيادات التجميل.</p>
          <div className="flex justify-center gap-6 text-sm mb-8">
            <a href="#" className="hover:text-white">الشروط والأحكام</a>
            <a href="#" className="hover:text-white">سياسة الخصوصية</a>
            <a href="#" className="hover:text-white">اتصل بنا</a>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} ClinicSaaS. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

// مكون الميزة
const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
    <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
      <Icon />
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
    <p className="text-gray-500 leading-relaxed text-sm">{desc}</p>
  </div>
);

export default LandingPage;