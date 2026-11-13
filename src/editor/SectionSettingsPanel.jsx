import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { SECTION_FIELDS, sectionLabel } from './sectionCatalog';
import ImageUpload from '../components/ImageUpload';

const fieldClass = 'w-full p-3 rounded-xl bg-[#F7F8F6] dark:bg-[#1A2C38] outline-none text-sm';

function ListEditor({ items, onChange, fields, addLabel }) {
  const list = Array.isArray(items) ? items : [];
  const add = () => {
    const blank = {};
    fields.forEach((f) => { blank[f.key] = ''; });
    onChange([...list, blank]);
  };
  const patch = (i, key, value) => {
    onChange(list.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  };
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {list.map((row, i) => (
        <div key={i} className="rounded-xl border border-[#E5E9EC] p-2 space-y-2">
          {fields.map((f) => (
            f.kind === 'textarea' ? (
              <textarea
                key={f.key}
                rows={2}
                placeholder={f.label}
                value={row[f.key] || ''}
                onChange={(e) => patch(i, f.key, e.target.value)}
                className={`${fieldClass} resize-none`}
              />
            ) : (
              <input
                key={f.key}
                placeholder={f.label}
                value={row[f.key] || ''}
                onChange={(e) => patch(i, f.key, e.target.value)}
                className={fieldClass}
              />
            )
          ))}
          <button type="button" onClick={() => remove(i)} className="text-xs text-[#9A3F32] font-bold flex items-center gap-1">
            <FaTrash /> حذف
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-bold text-[#172B3A] flex items-center gap-1">
        <FaPlus /> {addLabel}
      </button>
    </div>
  );
}

function StringsEditor({ items, onChange }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-2">
      {list.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={row || ''}
            onChange={(e) => onChange(list.map((v, idx) => (idx === i ? e.target.value : v)))}
            className={fieldClass}
          />
          <button type="button" onClick={() => onChange(list.filter((_, idx) => idx !== i))} className="text-[#9A3F32] px-2" aria-label="حذف">
            <FaTrash />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, ''])} className="text-xs font-bold text-[#172B3A] flex items-center gap-1">
        <FaPlus /> أضيفي نقطة
      </button>
    </div>
  );
}

export default function SectionSettingsPanel({ section, onChange }) {
  if (!section) {
    return (
      <div className="p-5 text-sm text-stone-500" dir="rtl">
        اختاري قسماً من القائمة لتعديل إعداداته.
      </div>
    );
  }

  const fields = SECTION_FIELDS[section.type] || [];
  const settings = section.settings || {};

  const setField = (key, value) => {
    onChange({
      ...section,
      settings: { ...settings, [key]: value },
    });
  };

  return (
    <div className="p-5 space-y-4" dir="rtl">
      <div>
        <p className="text-[11px] tracking-[0.18em] uppercase text-[#172B3A] font-semibold">إعدادات</p>
        <h2 className="font-product text-xl">{sectionLabel(section.type)}</h2>
      </div>
      {fields.length === 0 && (
        <p className="text-sm text-stone-500">لا حقول إضافية لهذا النوع.</p>
      )}
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          {field.kind !== 'image' && <span className="text-xs font-bold">{field.label}</span>}
          {field.kind === 'quotes' ? (
            <ListEditor
              items={settings.items}
              onChange={(items) => setField('items', items)}
              addLabel="أضيفي رأياً"
              fields={[
                { key: 'quote', label: 'الرأي', kind: 'textarea' },
                { key: 'name', label: 'الاسم', kind: 'text' },
              ]}
            />
          ) : field.kind === 'faqs' ? (
            <ListEditor
              items={settings.items}
              onChange={(items) => setField('items', items)}
              addLabel="أضيفي سؤالاً"
              fields={[
                { key: 'question', label: 'السؤال', kind: 'text' },
                { key: 'answer', label: 'الجواب', kind: 'textarea' },
              ]}
            />
          ) : field.kind === 'strings' ? (
            <StringsEditor items={settings.features} onChange={(features) => setField('features', features)} />
          ) : field.kind === 'textarea' ? (
            <textarea
              rows={3}
              value={settings[field.key] || ''}
              onChange={(e) => setField(field.key, e.target.value)}
              className={`${fieldClass} resize-none`}
            />
          ) : field.kind === 'number' ? (
            <input
              type="number"
              min={1}
              value={settings[field.key] ?? ''}
              onChange={(e) => setField(field.key, Number(e.target.value) || 0)}
              className={fieldClass}
            />
          ) : field.kind === 'image' ? (
            <ImageUpload label={field.label} value={settings[field.key] || ''} onChange={(url) => setField(field.key, url)} />
          ) : (
            <input
              type={field.kind === 'url' ? 'url' : 'text'}
              dir={field.kind === 'url' ? 'ltr' : undefined}
              value={settings[field.key] || ''}
              onChange={(e) => setField(field.key, e.target.value)}
              className={fieldClass}
              placeholder={field.kind === 'url' ? 'https://' : ''}
            />
          )}
        </div>
      ))}
    </div>
  );
}
