import React from 'react';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaLink } from 'react-icons/fa';
import { fontStack } from '../components/themes/themeUtils';
import { FONT_OPTIONS, THEME_PRESETS, THEMES, safeHex } from './storeIdentity';
import { templatesForPlan } from '../utils/platformTemplates';
import { useClinic } from '../context/ClinicContext';
import ImageUpload from '../components/ImageUpload';

const fieldClass = 'w-full p-3 rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] outline-none text-sm';

function ColorField({ label, value, onChange, fallback }) {
  const hex = safeHex(value, fallback);
  return (
    <div className="flex items-center gap-3">
      <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/5 shrink-0 cursor-pointer">
        <span className="absolute inset-0" style={{ backgroundColor: hex }} />
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={label} />
      </label>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold mb-1">{label}</p>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} h-9 font-mono text-xs uppercase`} dir="ltr" />
      </div>
    </div>
  );
}

export default function StoreIdentityPanel({ store, setStore, clinicId, websitePro, marketingOn }) {
  const { templates, clinicInfo } = useClinic();
  const storeUrl = clinicId ? `${window.location.origin}/book/${clinicId}` : '';
  const patch = (partial) => setStore({ ...store, ...partial });
  const available = templatesForPlan(templates, clinicInfo?.plan, websitePro);
  const themeCards = available.length
    ? available.map((t) => ({ id: t.id, name: t.name, color: t.renderer === 'elegant' ? 'bg-amber-700' : t.renderer === 'minimal' ? 'bg-stone-800' : 'bg-rose-400', renderer: t.renderer }))
    : THEMES.map((t) => ({ ...t, renderer: t.id }));

  return (
    <div className="p-5 space-y-5" dir="rtl">
      <div>
        <p className="text-[11px] tracking-[0.18em] uppercase text-[#172B3A] font-semibold">هوية</p>
        <h2 className="font-product text-xl">الثيم والعيادة</h2>
      </div>

      {storeUrl && (
        <div>
          <span className="text-xs font-bold flex items-center gap-1 mb-1"><FaLink /> رابط الحجز</span>
          <div className="flex gap-2">
            <input readOnly value={storeUrl} className={fieldClass} dir="ltr" />
            <button type="button" onClick={() => { navigator.clipboard.writeText(storeUrl); toast.info('تم نسخ الرابط'); }} className="shrink-0 text-xs font-bold px-3 rounded-xl bg-[#F7F8F6]">نسخ</button>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold mb-2">تصميم الواجهة</p>
        <div className="grid grid-cols-3 gap-2">
          {themeCards.map((theme) => {
            const active = store.storeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  if (!websitePro && theme.renderer !== 'beauty' && theme.id !== 'beauty') return toast.info('الثيمات الإضافية من باقة عيادة أو من قوالب السوبر أدمن');
                  patch({ storeTheme: theme.id });
                }}
                className={`rounded-xl border p-2 text-center ${active ? 'border-[#172B3A] ring-2 ring-[#172B3A]/20' : 'border-[#E5E9EC]'}`}
              >
                <span className={`mx-auto mb-1 block w-7 h-7 rounded-lg ${theme.color}`} />
                <span className="block text-[11px] font-bold">{theme.name}</span>
                {active && <FaCheckCircle className="mx-auto mt-1 text-[#172B3A] text-xs" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="mt-2 text-[11px] font-bold text-[#172B3A]"
          onClick={() => {
            const preset = THEME_PRESETS[store.storeTheme] || THEME_PRESETS.beauty;
            patch(preset);
            toast.info('طُبّقت ألوان القالب فقط — الأقسام والمحتوى لم تُمسَح');
          }}
        >
          تطبيق ألوان القالب بدون مسح المحتوى
        </button>
      </div>

      <ColorField label="اللون الأساسي" value={store.primaryColor} fallback="#C48B7A" onChange={(primaryColor) => patch({ primaryColor })} />
      <ColorField label="لون الخلفية" value={store.bgColor} fallback="#FBF4F0" onChange={(bgColor) => patch({ bgColor })} />
      <ColorField label="لون الخط" value={store.textColor} fallback="#3A2A28" onChange={(textColor) => patch({ textColor })} />

      <div>
        <p className="text-xs font-bold mb-2">الخط</p>
        <div className="grid grid-cols-3 gap-1.5">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.value}
              type="button"
              onClick={() => patch({ fontFamily: font.value })}
              className={`rounded-xl border py-2 text-xs font-bold ${store.fontFamily === font.value ? 'border-[#172B3A]' : 'border-[#E5E9EC]'}`}
              style={{ fontFamily: fontStack(font.value) }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={store.websitePublished !== false} onChange={(e) => patch({ websitePublished: e.target.checked })} />
        نشر الموقع العام
      </label>
      {storeUrl && <p className="text-[11px] text-stone-500">الرابط العام يعمل فقط إذا الموقع منشور والعيادة غير موقوفة.</p>}

      <ImageUpload label="الشعار" value={store.logoUrl} onChange={(logoUrl) => patch({ logoUrl })} round />
      <ImageUpload label="صورة الغلاف" value={store.heroImage || ''} onChange={(heroImage) => patch({ heroImage })} />
      <div className="space-y-1">
        <span className="text-xs font-bold">اسم الأخصائية</span>
        <input value={store.doctorName} onChange={(e) => patch({ doctorName: e.target.value })} className={fieldClass} />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold">التخصص</span>
        <input value={store.specialty} onChange={(e) => patch({ specialty: e.target.value })} className={fieldClass} />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold">الشهادة</span>
        <input value={store.degree} onChange={(e) => patch({ degree: e.target.value })} className={fieldClass} />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold">نبذة الأخصائية</span>
        <textarea rows={3} value={store.doctorBio} onChange={(e) => patch({ doctorBio: e.target.value })} className={`${fieldClass} resize-none`} />
      </div>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={store.showProducts} disabled={!marketingOn} onChange={(e) => patch({ showProducts: e.target.checked })} />
        إظهار المنتجات
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={store.showBlog} disabled={!marketingOn} onChange={(e) => patch({ showBlog: e.target.checked })} />
        إظهار المدونة
      </label>

      <div className="space-y-1">
        <span className="text-xs font-bold">عنوان SEO</span>
        <input value={store.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} className={fieldClass} disabled={!websitePro} />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-bold">وصف SEO</span>
        <textarea rows={2} value={store.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} className={`${fieldClass} resize-none`} disabled={!websitePro} />
      </div>
    </div>
  );
}
