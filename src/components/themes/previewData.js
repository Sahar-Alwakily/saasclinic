const services = [
  { id: "s1", title: "تنظيف بشرة عميق", description: "تنقية المسام، إزالة الرؤوس السوداء، وماسك مهدئ يناسب البشرة المختلطة.", price: 180, duration: "60 د" },
  { id: "s2", title: "جلسة ليزر للوجه", description: "بروتوكول آمن لتوحيد اللون وتقليل الشعر مع حماية للبشرة الملونة.", price: 250, duration: "45 د" },
  { id: "s3", title: "إشراق وفيتامين", description: "جلسة إشراق للبشرة الباهتة والتعب، بتركيز لطيف بدون تقشير عنيف.", price: 220, duration: "50 د" },
  { id: "s4", title: "عناية حول العين", description: "تهدئة الانتفاخ وتحسين إشراق النظرة ببروتوكول لطيف للمنطقة الحساسة.", price: 160, duration: "30 د" },
];

const products = [
  { id: "p1", title: "سيروم فيتامين C", price: 129, imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80" },
  { id: "p2", title: "غسول لطيف", price: 89, imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80" },
  { id: "p3", title: "واقي شمس ملون", price: 110, imageUrl: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=600&q=80" },
  { id: "p4", title: "كريم ليلي مرطّب", price: 145, imageUrl: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=80" },
];

const branches = [{ id: "b1", name: "الجناح الرئيسي", address: "رهط — شارع العيادات" }];

const posts = [
  { id: "n1", title: "روتين الصباح للبشرة المختلطة", content: "غسول لطيف، سيروم فيتامين، وواقي شمس. ثلاث خطوات تكفي معظم الأيام.", createdAt: Date.now() - 86400000 },
  { id: "n2", title: "متى تحتاجين جلسة ليزر؟", content: "إذا كان الشعر تحت الجلد أو اللون غير موحّد، نبدأ بتقييم نوع البشرة قبل أي بروتوكول.", createdAt: Date.now() - 172800000 },
];

const base = {
  _demo: true,
  doctorName: "أ. ليلى منصور",
  specialty: "أخصائية بشرة وتجميل",
  degree: "دبلوم عناية متقدمة",
  doctorBio: "أخصائية بشرة تركز على التشخيص الهادئ والخطط الواقعية: ليزر، إشراق، وتنظيف عميق بدون وعود مبالغ فيها. كل زيارة تبدأ بقراءة بشرتكِ، لا بقائمة جاهزة.",
  address: "رهط — مجمع العيادات",
  whatsapp: "972500000000",
  instagram: "https://instagram.com",
  showServices: true,
  showProducts: true,
  showBlog: true,
  whyChooseUsTitle: "لماذا تختارين هذه العيادة؟",
  whyChooseUs: "خصوصية، أجهزة معتمدة، وخطة عناية مكتوبة تناسب نوع بشرتكِ — من أول استشارة.",
};

export function getPreviewClinic(clinicId) {
  if (clinicId === "preview-beauty") {
    return {
      clinic: {
        ...base,
        name: "عيادة نوارة",
        storeTheme: "beauty",
        heroTitle: "بشرتكِ تُقرأ\nقبل أن تُعالَج.",
        heroImage: "https://images.unsplash.com/photo-1570172619604-71fdc739a2ce?auto=format&fit=crop&w=1400&q=80",
        storeDescription: "عيادة تجميل خاصة لأخصائيات البشرة: جلسات ليزر، إشراق، وتنظيف عميق في مساحة هادئة تليق بكِ.",
        primaryColor: "#C48B7A",
        bgColor: "#FBF4F0",
        textColor: "#3A2A28",
        fontFamily: "Tajawal",
      },
      services, products, branches, posts,
    };
  }
  if (clinicId === "preview-elegant") {
    return {
      clinic: {
        ...base,
        name: "Maison Nour",
        storeTheme: "elegant",
        heroTitle: "تجميل يُخاط\nعلى مقاس بشرتكِ.",
        heroImage: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80",
        storeDescription: "أتيليه تجميل خاص بإضاءة خافتة وغرف VIP. طقوس عناية تُصمَّم لكِ وحدكِ.",
        primaryColor: "#C9A66B",
        bgColor: "#0C0B0A",
        textColor: "#F5EDE3",
        fontFamily: "serif",
      },
      services, products, branches, posts,
    };
  }
  if (clinicId === "preview-minimal") {
    return {
      clinic: {
        ...base,
        name: "Studio Skin",
        storeTheme: "minimal",
        heroTitle: "عناية دقيقة.\nلغة هادئة.\nنتائج تُقاس.",
        heroImage: "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1400&q=80",
        storeDescription: "عيادة بشرة تحريرية: تشخيص واضح، جلسات مدروسة، وروتين منزلي قصير.",
        primaryColor: "#1C1917",
        bgColor: "#FAF8F5",
        textColor: "#1C1917",
        fontFamily: "Tajawal",
      },
      services, products, branches, posts,
    };
  }
  return null;
}
