import React from 'react';

const field = 'w-full p-3 border border-[#e4eee8] rounded-2xl text-sm bg-[#f8faf9] min-h-28 resize-y';

const SAMPLE = { a: 186, b: 124 };

const AbTesting = ({ templateA, templateB, onChangeA, onChangeB, onSave, saving }) => {
  const total = SAMPLE.a + SAMPLE.b;
  const lead = SAMPLE.a === SAMPLE.b ? 'التعادل' : SAMPLE.a > SAMPLE.b ? 'النسخة أ' : 'النسخة ب';
  return (
    <section className="saas-card p-5">
      <h2 className="font-bold text-[#111827] dark:text-white">اختبار أ/ب</h2>
      <p className="text-sm text-[#8a9199] mt-1 mb-4">اكتبي نسختين من رسالة التواصل. أرقام النقرات تحت عينة للمعاينة، وليست نتيجة إرسال حقيقي.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm font-bold text-[#111827] dark:text-white">
          النسخة أ
          <textarea value={templateA} onChange={(e) => onChangeA(e.target.value)} className={`${field} mt-1 font-normal`} />
        </label>
        <label className="text-sm font-bold text-[#111827] dark:text-white">
          النسخة ب
          <textarea value={templateB} onChange={(e) => onChangeB(e.target.value)} className={`${field} mt-1 font-normal`} />
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-[#6b7280]">
          <span>نقرات أ · {SAMPLE.a}</span>
          <span>نقرات ب · {SAMPLE.b}</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-[#f3f4f6]">
          <div className="bg-[#10b981]" style={{ width: `${Math.round((SAMPLE.a / total) * 100)}%` }} />
          <div className="bg-sky-400" style={{ width: `${Math.round((SAMPLE.b / total) * 100)}%` }} />
        </div>
        <p className="text-sm text-[#111827] dark:text-white">الأكثر نقراً في العينة: <span className="font-bold">{lead}</span></p>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-4 px-4 py-2.5 rounded-2xl bg-[#10b981] text-white text-sm font-bold disabled:opacity-60"
      >
        {saving ? 'جاري الحفظ...' : 'حفظ المقارنة'}
      </button>
    </section>
  );
};

export default AbTesting;
