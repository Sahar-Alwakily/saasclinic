import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '../APIFirebase/firebase';
import { 
  FaPhone, FaTimes, FaCheck, FaWhatsapp, FaEnvelope, 
  FaInstagram, FaFacebook, FaTiktok, FaMapMarkerAlt, FaShoppingCart, 
  FaCalendarAlt, FaClock, FaStar, FaArrowLeft, FaBars, FaGraduationCap, FaStethoscope
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';

const BeautyTheme = ({ clinicId, clinic, services, products, blogPosts, onOpenBooking }) => {
  const [mobileMenu, setMobileMenu] = useState(false);
    const navigate = useNavigate(); // ✅ ضيف هاد

  const themeStyle = {
    '--primary': clinic.primaryColor || '#ec4899',
    '--bg-color': clinic.bgColor || '#fdf2f8',
  };

  return (
    <div style={themeStyle} className="min-h-screen font-sans overflow-x-hidden" dir="rtl">
      
      {/* النافبار */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {clinic.logoUrl ? (
              <img src={clinic.logoUrl} alt="Logo" className="h-12 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: 'var(--primary)' }}>C</div>
            )}
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="font-bold" style={{ color: 'var(--primary)' }}>الرئيسية</a>
            {clinic.showServices !== false && <a href="#services" className="hover:opacity-70">الخدمات</a>}
            {clinic.showProducts !== false && <a href="#products" className="hover:opacity-70">المنتجات</a>}
            {clinic.showBlog !== false && <a href="#blog" className="hover:opacity-70">المدونة</a>}
            <a href="#contact" className="hover:opacity-70">اتصل بنا</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden md:flex w-10 h-10 rounded-full items-center justify-center relative" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}>
              <FaShoppingCart />
              <span className="absolute top-0 right-0 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>0</span>
            </button>
            <button onClick={onOpenBooking} className="hidden md:block text-white px-6 py-2 rounded-full font-bold shadow-md hover:opacity-90 transition" style={{ backgroundColor: 'var(--primary)' }}>احجزي الآن</button>
            
            <button onClick={() => setMobileMenu(true)} className="md:hidden w-10 h-10 flex items-center justify-center text-gray-600 text-xl">
              <FaBars />
            </button>
          </div>
        </div>
      </header>

      {/* منيو الموبايل الجانبية */}
      <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${mobileMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileMenu(false)}>
        <div className={`fixed inset-y-0 right-0 w-64 bg-white shadow-xl flex flex-col transition-transform duration-300 ${mobileMenu ? 'translate-x-0' : 'translate-x-full'}`} onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b flex justify-between items-center">
            <span className="font-bold text-gray-800">القائمة</span>
            <button onClick={() => setMobileMenu(false)} className="text-gray-400 hover:text-rose-500"><FaTimes /></button>
          </div>
          <div className="flex-1 p-4 space-y-4 text-gray-600 font-medium">
            <a href="#" onClick={() => setMobileMenu(false)} className="block font-bold" style={{ color: 'var(--primary)' }}>الرئيسية</a>
            {clinic.showServices !== false && <a href="#services" onClick={() => setMobileMenu(false)} className="block">الخدمات</a>}
            {clinic.showProducts !== false && <a href="#products" onClick={() => setMobileMenu(false)} className="block">المنتجات</a>}
            {clinic.showBlog !== false && <a href="#blog" onClick={() => setMobileMenu(false)} className="block">المدونة</a>}
            <a href="#contact" onClick={() => setMobileMenu(false)} className="block">اتصل بنا</a>
          </div>
          <div className="p-4 border-t">
            <button onClick={() => { setMobileMenu(false); onOpenBooking(); }} className="w-full text-white py-3 rounded-xl font-bold" style={{ backgroundColor: 'var(--primary)' }}>احجزي الآن</button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
          
          <div className="flex-1 text-center md:text-right z-10">
            <span className="inline-flex items-center gap-2 bg-white border border-gray-100 px-4 py-1.5 rounded-full text-sm font-bold mb-6 shadow-sm" style={{ color: 'var(--primary)' }}>
              ✨ عيادة {clinic.doctorName || clinic.name}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 leading-tight mb-4">
              جمالك يبدأ من الداخل<br/>
              <span style={{ color: 'var(--primary)' }}>مع {clinic.doctorName || clinic.name}</span>
            </h1>
            <p className="text-gray-500 text-base md:text-lg mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed">
              {clinic.doctorBio || clinic.storeDescription || 'طبيبة أسنان حاصلة على دبلوم في طب الأسنان والتجميل، خبرة واسعة في التجميل غير الجراحي.'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button onClick={onOpenBooking} className="text-white px-8 py-3 rounded-full font-bold shadow-lg hover:opacity-90 transition flex items-center gap-2" style={{ backgroundColor: 'var(--primary)', boxShadow: `0 10px 15px -3px ${clinic.primaryColor}40` }}>
                <span className="text-lg">✨</span> احجزي موعدك الآن
              </button>
              <a href="#services" className="border-2 bg-white px-8 py-3 rounded-full font-bold hover:bg-gray-50 transition" style={{ borderColor: 'var(--bg-color)', color: 'var(--primary)' }}>
                تعرّفي على الخدمات
              </a>
            </div>
          </div>

          <div className="w-full md:w-1/2 flex justify-center relative">
            <div className="relative w-72 h-72 md:w-[400px] md:h-[400px]">
              <div className="absolute inset-0 rounded-full border-[6px] border-white shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
                {clinic.heroImage ? (
                  <img src={clinic.heroImage} alt="Doctor" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl" style={{ color: 'var(--primary)' }}>👩‍⚕️</div>
                )}
              </div>
              
              {clinic.specialty && (
                <div className="absolute -bottom-4 -right-4 bg-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 border border-gray-50">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}><FaStethoscope /></div>
                   <div className="text-right">
                     <p className="text-[10px] text-gray-400">تخصص</p>
                     <p className="text-xs font-bold text-gray-800">{clinic.specialty}</p>
                   </div>
                </div>
              )}

              {clinic.degree && (
                <div className="absolute top-1/2 -right-8 bg-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 border border-gray-50">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}><FaGraduationCap /></div>
                   <div className="text-right">
                     <p className="text-xs font-bold text-gray-800">{clinic.degree}</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* الخدمات */}
      {clinic.showServices !== false && (
        <section id="services" className="py-16 px-4 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary)' }}>خدماتنا</h2>
            <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--primary)' }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{services.map(s => (
  <div key={s.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center text-center">
    <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4" style={{ backgroundColor: 'var(--bg-color)' }}>💆‍♀️</div>
    <h3 className="text-xl font-bold text-gray-800 mb-2">{s.title}</h3>
    <p className="font-bold mb-4" style={{ color: 'var(--primary)' }}>{s.price} ₪</p>
    
    {/* ✅ زر التفاصيل والحجز */}
    <div className="w-full mt-auto flex gap-2">
      <button 
        onClick={() => navigate(`/book/${clinicId}/service/${s.id}`)} 
        className="flex-1 py-2 rounded-xl font-bold transition hover:opacity-80 bg-gray-100 text-gray-700 text-sm"
      >
        التفاصيل
      </button>
      <button 
        onClick={onOpenBooking} 
        className="flex-1 py-2 rounded-xl font-bold transition hover:opacity-80 text-sm" 
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}
      >
        احجزي
      </button>
    </div>
  </div>
))}
            {services.length === 0 && <p className="col-span-3 text-center text-gray-400">لا توجد خدمات مضافة حالياً.</p>}
          </div>
        </section>
      )}

      {/* المنتجات */}
      {clinic.showProducts !== false && products && products.length > 0 && (
        <section id="products" className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary)' }}>أحدث المنتجات</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} className="w-32 h-32 object-contain mx-auto mb-4" /> : <div className="w-32 h-32 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center text-gray-400">صورة</div>}
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{p.title}</h3>
                  <p className="font-bold mb-4" style={{ color: 'var(--primary)' }}>{p.price} ₪</p>
                  <button className="w-full text-white py-2 rounded-xl font-bold text-sm" style={{ backgroundColor: 'var(--primary)' }}>أضف للسلة</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* المدونة */}
      {clinic.showBlog !== false && (
        <section id="blog" className="py-16 px-4" style={{ backgroundColor: 'var(--bg-color)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary)' }}>مقالات ونصائح</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogPosts && blogPosts.length > 0 ? blogPosts.map(post => (
                <div key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="h-40 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
                    {post.imageUrl ? <img src={post.imageUrl} className="w-full h-full object-cover" /> : 'صورة المقال'}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-800 mb-2">{post.title}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{post.content}</p>
                  </div>
                </div>
              )) : (
                <p className="col-span-3 text-center text-gray-400">لا توجد مقالات منشورة بعد.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* الفوتر */}
      <footer id="contact" className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-right">
          <div>
            {clinic.logoUrl ? <img src={clinic.logoUrl} className="h-16 mx-auto md:mx-0 mb-4" /> : <div className="text-2xl font-bold mb-4" style={{ color: 'var(--primary)' }}>{clinic.name}</div>}
            <p className="text-gray-500 text-sm leading-relaxed">نقدم أفضل خدمات التجميل والعناية بالبشرة بأحدث التقنيات.</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-4">تواصلي معنا</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              {clinic.whatsapp && <li className="flex items-center justify-center md:justify-start gap-2" dir="ltr"><FaPhone style={{ color: 'var(--primary)' }} /> {clinic.whatsapp}</li>}
              {clinic.ownerEmail && <li className="flex items-center justify-center md:justify-start gap-2"><FaEnvelope style={{ color: 'var(--primary)' }} /> {clinic.ownerEmail}</li>}
              {clinic.address && <li className="flex items-center justify-center md:justify-start gap-2"><FaMapMarkerAlt style={{ color: 'var(--primary)' }} /> {clinic.address}</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-4">تابعينا</h4>
            <div className="flex justify-center md:justify-start gap-4">
              {clinic.instagram && <a href={clinic.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}><FaInstagram /></a>}
              {clinic.facebook && <a href={clinic.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}><FaFacebook /></a>}
              {clinic.tiktok && <a href={clinic.tiktok} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}><FaTiktok /></a>}
              {clinic.whatsapp && <a href={`https://wa.me/${clinic.whatsapp}`} className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-100"><FaWhatsapp /></a>}
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-gray-400 mt-12 pt-6 border-t border-gray-100">
          جميع الحقوق محفوظة © {new Date().getFullYear()} {clinic.name}
        </div>
      </footer>
    </div>
  );
};

// ================= الصفحة الرئيسية =================
const PublicBooking = () => {
  const { clinicId } = useParams();
  const [clinic, setClinic] = useState(null);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({ service: '', date: '', time: '', name: '', phone: '' });
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    
    const unsubInfo = onValue(ref(database, `clinics/${clinicId}/info`), (snap) => setClinic(snap.val()));
    const unsubServ = onValue(ref(database, `clinics/${clinicId}/services`), (snap) => {
      const val = snap.val();
      setServices(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubProd = onValue(ref(database, `clinics/${clinicId}/products`), (snap) => {
      const val = snap.val();
      setProducts(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
    });
    const unsubBlog = onValue(ref(database, `clinics/${clinicId}/blog`), (snap) => {
      const val = snap.val();
      setBlogPosts(val ? Object.entries(val).map(([id, item]) => ({ id, ...item })) : []);
      setLoading(false);
    });

    return () => { unsubInfo(); unsubServ(); unsubProd(); unsubBlog(); };
  }, [clinicId]);

  const handleBookSubmit = async () => {
    try {
      const aptRef = push(ref(database, `clinics/${clinicId}/appointments`));
      await set(aptRef, {
        customerName: bookingData.name, phoneNumber: bookingData.phone,
        service: bookingData.service, date: bookingData.date, time: bookingData.time,
        status: 'pending', createdAt: Date.now(),
      });
      setIsSuccess(true);
    } catch (error) { alert('حدث خطأ'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white" style={{ color: 'var(--primary)' }}>جاري التحميل...</div>;
  if (!clinic) return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">العيادة غير موجودة</div>;

  return (
    <div className="relative">
      <BeautyTheme clinicId={clinicId} clinic={clinic} services={services} products={products} blogPosts={blogPosts} onOpenBooking={() => { setShowBooking(true); setBookingStep(1); setIsSuccess(false); }} />

      {showBooking && (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0">
            <div className="flex items-center gap-2">
              {clinic.logoUrl && <img src={clinic.logoUrl} className="h-8" />}
              <span className="font-bold text-gray-800">{clinic.name}</span>
            </div>
            <button onClick={() => setShowBooking(false)} className="text-gray-500 hover:text-rose-500 flex items-center gap-2">
              إلغاء <FaTimes />
            </button>
          </div>

          <div className="max-w-3xl mx-auto p-4 md:p-8">
            {!isSuccess ? (
              <>
                <div className="text-center mb-10">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}><FaStar /></div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">حجز موعدك</h1>
                </div>
                <div className="flex justify-between items-center mb-10 relative px-4">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
                  {[{ id: 1, name: 'الخدمة', icon: FaStar }, { id: 2, name: 'التاريخ', icon: FaCalendarAlt }, { id: 3, name: 'الوقت', icon: FaClock }, { id: 4, name: 'التأكيد', icon: FaCheck }].map(step => (
                    <div key={step.id} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${bookingStep >= step.id ? 'text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`} style={{ backgroundColor: bookingStep >= step.id ? 'var(--primary)' : 'transparent' }}><step.icon className="text-sm" /></div>
                      <span className="text-xs font-bold" style={{ color: bookingStep >= step.id ? 'var(--primary)' : '#9ca3af' }}>{step.name}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[300px]">
                  {bookingStep === 1 && (
                    <div>
                      <h2 className="text-xl font-bold text-center text-gray-800 mb-6">أي خدمة تريدين؟</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services.map(s => (
                          <button key={s.id} onClick={() => { setBookingData({...bookingData, service: s.title}); setBookingStep(2); }} className="p-4 border border-gray-200 rounded-2xl text-right hover:bg-gray-50 transition" style={{ borderColor: 'var(--bg-color)' }}>
                            <p className="font-bold text-gray-800">{s.title}</p>
                            <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{s.price} ₪</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {bookingStep === 2 && (
                    <div>
                      <h2 className="text-xl font-bold text-center text-gray-800 mb-6">متى يناسبك؟</h2>
                      <input type="date" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} className="w-full p-4 border border-gray-200 rounded-xl text-center text-lg outline-none" style={{ borderColor: 'var(--bg-color)' }} min={new Date().toISOString().split('T')[0]} />
                      <button onClick={() => bookingStep === 2 && bookingData.date && setBookingStep(3)} className="w-full mt-6 text-white py-3 rounded-xl font-bold" style={{ backgroundColor: 'var(--primary)' }}>التالي</button>
                    </div>
                  )}
                  {bookingStep === 3 && (
                    <div>
                      <h2 className="text-xl font-bold text-center text-gray-800 mb-6">في أي ساعة؟</h2>
                      <div className="grid grid-cols-3 gap-3">
                        {['10:00 صباحًا', '11:30 صباحًا', '02:00 مساءً', '04:00 مساءً', '06:00 مساءً'].map(t => (
                          <button key={t} onClick={() => { setBookingData({...bookingData, time: t}); setBookingStep(4); }} className="p-3 border rounded-xl text-sm font-bold transition" style={{ borderColor: bookingData.time === t ? 'var(--primary)' : '#e5e7eb', backgroundColor: bookingData.time === t ? 'var(--primary)' : 'white', color: bookingData.time === t ? 'white' : '#4b5563' }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {bookingStep === 4 && (
                    <div>
                      <h2 className="text-xl font-bold text-center text-gray-800 mb-6">أدخلي بياناتك للتأكيد</h2>
                      <div className="space-y-4">
                        <input type="text" placeholder="الاسم الكامل" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none" />
                        <input type="tel" placeholder="رقم الهاتف" value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none" dir="ltr" />
                        <div className="p-4 rounded-xl text-sm space-y-1" style={{ backgroundColor: 'var(--bg-color)' }}>
                          <p><span className="text-gray-500">الخدمة:</span> <span className="font-bold">{bookingData.service}</span></p>
                          <p><span className="text-gray-500">التاريخ:</span> <span className="font-bold">{bookingData.date}</span></p>
                          <p><span className="text-gray-500">الوقت:</span> <span className="font-bold">{bookingData.time}</span></p>
                        </div>
                        <button onClick={handleBookSubmit} disabled={!bookingData.name || !bookingData.phone} className="w-full text-white py-3 rounded-xl font-bold disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}>تأكيد الحجز</button>
                      </div>
                    </div>
                  )}
                  {bookingStep > 1 && (
                    <button onClick={() => setBookingStep(bookingStep - 1)} className="mt-6 text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"><FaArrowLeft /> رجوع</button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center bg-white rounded-3xl shadow-sm border border-gray-100 p-12 mt-10">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><FaCheck className="text-4xl" /></div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">تم الحجز بنجاح!</h2>
                <p className="text-gray-500 mb-8">سنتواصل معك قريباً لتأكيد الموعد.</p>
                <button onClick={() => setShowBooking(false)} className="text-white px-8 py-3 rounded-full font-bold" style={{ backgroundColor: 'var(--primary)' }}>العودة للرئيسية</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBooking;