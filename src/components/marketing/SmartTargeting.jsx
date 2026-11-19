import React from 'react';

const SmartTargeting = ({ enabled, onChange }) => (
  <section className="h-full rounded-lg border border-[#E4EAEE] bg-white p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-bold">الاستهداف الذكي</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">استهداف العميلات اللواتي لم يشترين منذ 30 يوماً. يحفظ الاختيار ولا يرسل رسائل وحده.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="الاستهداف الذكي"
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? 'bg-[#059669]' : 'bg-[#CBD5E1]'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'start-0.5' : 'end-0.5'}`} />
      </button>
    </div>
    <p className={`mt-4 text-[12.5px] font-bold ${enabled ? 'text-[#047857]' : 'text-[#94A3B8]'}`}>
      {enabled ? 'الاستهداف شغّال لهذه الشريحة' : 'الاستهداف متوقف'}
    </p>
  </section>
);

export default SmartTargeting;