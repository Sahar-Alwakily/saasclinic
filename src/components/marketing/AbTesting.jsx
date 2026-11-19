import React from 'react';

const field = 'mt-1 min-h-28 w-full resize-y rounded-lg border border-[#E4EAEE] bg-[#F8FBFC] px-3 py-2 text-[13px] outline-none focus:border-[#0FA3A3]';
const primary = 'mt-4 rounded-lg bg-[#059669] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#047857] disabled:opacity-60';

const SAMPLE = { a: 186, b: 124 };

const AbTesting = ({ templateA, templateB, onChangeA, onChangeB, onSave, saving }) => {
  const total = SAMPLE.a + SAMPLE.b;
  const lead = SAMPLE.a === SAMPLE.b ? 'التعادل' : SAMPLE.a > SAMPLE.b ? 'النسخة أ' : 'النسخة ب';
  return (
    <section className="rounded-lg border border-[#E4EAEE] bg-white p-4">
      <h2 className="text-[15px] font-bold">اختبار أ/ب</h2>
      <p className="mt-1 mb-4 text-[12px] text-[#64748B]">نسختان لرسالة التواصل. أرقام النقرات عينة للمعاينة وليست إرسالاً حقيقياً.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-[13px] font-bold">
          النسخة أ
          <textarea value={templateA} onChange={(e) => onChangeA(e.target.value)} className={field} />
        </label>
        <label className="text-[13px] font-bold">
          النسخة ب
          <textarea value={templateB} onChange={(e) => onChangeB(e.target.value)} className={field} />
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-[11px] text-[#64748B]">
          <span>نقرات أ · {SAMPLE.a}</span>
          <span>نقرات ب · {SAMPLE.b}</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-[#E4EAEE]">
          <div className="bg-[#059669]" style={{ width: `${Math.round((SAMPLE.a / total) * 100)}%` }} />
          <div className="bg-[#0FA3A3]" style={{ width: `${Math.round((SAMPLE.b / total) * 100)}%` }} />
        </div>
        <p className="text-[13px]">الأكثر نقراً في العينة: <span className="font-bold">{lead}</span></p>
      </div>
      <button type="button" onClick={onSave} disabled={saving} className={primary}>
        {saving ? 'جاري الحفظ...' : 'حفظ المقارنة'}
      </button>
    </section>
  );
};

export default AbTesting;