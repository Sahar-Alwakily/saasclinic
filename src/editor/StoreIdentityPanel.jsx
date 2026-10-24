import React from 'react';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaLink } from 'react-icons/fa';
import { fontStack } from '../components/themes/themeUtils';
import { FONT_OPTIONS, THEME_PRESETS, THEMES, safeHex } from './storeIdentity';

const fieldClass = 'w-full p-3 rounded-xl bg-[#f3efe6] dark:bg-[#1e1b28] outline-none text-sm';

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
  const storeUrl = clinicId ? `${window.location.origin}/book/${clinicId}` : '';
  const patch = (partial) => setStore({ ...store, ...partial });

  return (
    <div className="p-5 space-y-5" dir="rtl">
      <div>
        <p className="text-[11px] tracking-[0.18em] uppercase text-[#4d7cff] font-semibold">هوية</p>
        <h2 className="font-product text-xl">الثيم والعيادة</h2>
      </div>

      {storeUrl && (
        <div>
          <span className="text-xs font-bold flex items-center gap-1 mb-1"><FaLink /> رابط الحجز</span>
          <div className="flex gap-2">
            <input readOnly value={storeUrl} className={fieldClass} dir="ltr" />
            <button type="button" onClick={() => { navigator.clipboard.writeText(storeUrl); toast.info('تم نسخ الرابط'); }} className="shrink-0 text-xs font-bold px-3 rounded-xl bg-[#f3efe6]">نسخ</button>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold mb-2">تصميم الواجهة</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((theme) => {
            const active = store.storeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  if (!websitePro && theme.id !== 'beauty') return toast.info('الثيمات الإضافية من باقة عيادة');
                  patch({ storeTheme: theme.id, ...THEME_PRESETS[theme.id] });
                }}
                className={`rounded-xl border p-2 text-center ${active ? 'border-[#4d7cff] ring-2 ring-[#4d7cff]/20' : 'border-[#e4ddd0]'}`}
              >
                <span className={`mx-auto mb-1 block w-7 h-7 rounded-lg ${theme.color}`} />
                <span className="block text-[11px] font-bold">{theme.name}</span>
                {active && <FaCheckCircle className="mx-auto mt-1 text-[#4d7cff] text-xs" />}
              </button>
            );
          })}
        </div>
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
              className={`rounded-xl border py-2 text-xs font-bold ${store.fontFamily === font.value ? 'border-[#4d7cff]' : 'border-[#e4ddd0]'}`}
              style={{ fontFamily: fontStack(font.value) }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-bold">اللوجو</span>
        <input type="url" dir="ltr" value={store.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} className={fieldClass} placeholder="https://" />
      </div>
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
