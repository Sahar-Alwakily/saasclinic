import React from 'react';

const SmartTargeting = ({ enabled, onChange }) => (
  <section className="saas-card p-5 h-full">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-bold text-[#111827] dark:text-white">الاستهداف الذكي</h2>
        <p className="text-sm text-[#8a9199] mt-1">استهداف العميلات اللواتي لم يشترين منذ 30 يوماً. التفعيل يحفظ الاختيار، ولا يرسل رسائل وحده.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="الاستهداف الذكي"
        onClick={() => onChange(!enabled)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition ${enabled ? 'bg-[#10b981]' : 'bg-[#d1d5db]'}`}
      >
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${enabled ? 'start-0.5' : 'end-0.5'}`} />
      </button>
    </div>
    <p className={`mt-4 text-sm font-bold ${enabled ? 'text-emerald-700' : 'text-[#8a9199]'}`}>
      {enabled ? 'الاستهداف شغّال لهذه الشريحة' : 'الاستهداف متوقف'}
    </p>
  </section>
);

export default SmartTargeting;
