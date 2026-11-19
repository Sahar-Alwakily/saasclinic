import React from 'react';

const TeamStatStrip = ({ items = [] }) => (
  <section className="grid grid-cols-2 border-y border-[#E4EAEE] lg:grid-cols-4">
    {items.map((item, i) => (
      <div
        key={item.label}
        className={[
          'px-5 py-4',
          i % 2 === 1 ? 'border-s border-[#E4EAEE]' : '',
          i > 1 ? 'border-t border-[#E4EAEE]' : '',
          'lg:border-t-0',
          i > 0 ? 'lg:border-s lg:border-[#E4EAEE]' : '',
        ].join(' ')}
      >
        <p className="text-[11px] text-[#64748B]">{item.label}</p>
        <p
          className="mt-1.5 text-[30px] font-light leading-none tabular-nums tracking-tight"
          style={{ color: item.accent || '#0F172A' }}
        >
          {item.value}
        </p>
        {item.note && <p className="mt-1.5 truncate text-[10.5px] text-[#7C8A99]">{item.note}</p>}
      </div>
    ))}
  </section>
);

export default TeamStatStrip;
