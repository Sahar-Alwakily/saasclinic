function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function table(headers, rows) {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body || '<tr><td colspan="99">لا بيانات</td></tr>'}</tbody></table>`;
}

function block(title, html) {
  return `<section><h2>${esc(title)}</h2>${html}</section>`;
}

const CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, sans-serif; color: #111827; direction: rtl; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 18px 0 8px; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 12px 0 4px; }
  p, li { font-size: 12px; line-height: 1.6; }
  .muted { color: #6b7280; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: right; font-size: 11px; vertical-align: top; }
  th { background: #ecfdf5; }
  .client { break-inside: avoid; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; margin: 0 0 12px; }
  img.sig { height: 56px; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; }
`;

export function openReportPdf({ title, clinicName, html }) {
  const doc = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><h1>${esc(title)}</h1><p class="muted">${esc(clinicName || 'العيادة')} · ${esc(new Date().toLocaleString('ar'))}</p>${html}</body></html>`;
  const frame = document.createElement('iframe');
  frame.setAttribute('title', title);
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return false;
  }
  win.document.open();
  win.document.write(doc);
  win.document.close();
  const cleanup = () => frame.remove();
  win.onafterprint = cleanup;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 60000);
  }, 300);
  return true;
}

export function numbersReportHtml(report) {
  const { health, today, campaigns, marketing, returns } = report;
  const w = health.windows;
  const shiftRows = [
    ['الحجوزات', health.curr.total, health.prev.total, deltaTextSafe(health.deltas.book)],
    ['حضور', health.curr.attended, health.prev.attended, ''],
    ['غياب', health.curr.noshow, health.prev.noshow, ''],
    ['إلغاء', health.curr.cancelled, health.prev.cancelled, ''],
    ['معلّق', health.curr.pending, health.prev.pending, ''],
    ['مؤكد', health.curr.confirmed, health.prev.confirmed, ''],
    ['نسبة الحضور', health.curr.attendRate == null ? '—' : `${health.curr.attendRate}%`, health.prev.attendRate == null ? '—' : `${health.prev.attendRate}%`, deltaTextSafe(health.deltas.attend)],
  ];
  const campRows = campaigns.rows.map((r) => [
    r.name,
    r.status,
    r.targets,
    r.bookings,
    r.attended,
    r.sent,
    r.failed,
    r.before30 == null ? '—' : r.before30,
    r.after30 == null ? '—' : r.after30,
  ]);
  const backRows = returns.cameBack.map((j) => [j.displayName, j.phone, j.visitCount, j.daysSince, j.lastService || '—']);
  const awayRows = returns.stayedAway.map((j) => [j.displayName, j.phone, j.daysSince, j.thresholdDays, j.doNotContact ? 'طلبت عدم التواصل' : 'منقطعة']);
  return [
    block('تغيّر الحجوزات', `<p>من ${esc(w.thisStart)} إلى ${esc(w.thisEnd)} مقابل ${esc(w.prevStart)} إلى ${esc(w.prevEnd)}.</p><p>الحجوزات: ${esc(deltaTextSafe(health.deltas.book))}.</p>${table(['البند', 'الفترة الحالية', 'الفترة السابقة', 'التغيّر'], shiftRows)}<p>اليوم: ${today.total} موعد، معلّق ${today.pending}، ملغى ${today.cancelled}، حضر ${today.attended}.</p>`),
    block('الحجوزات مع الحملات', `<p>حجوزات مربوطة بحملة: ${campaigns.linked}. حجوزات بلا حملة: ${campaigns.plain}.</p><p>عمودا قبل/بعد يعدّان الحجوزات التي أُنشئت خلال 30 يوماً قبل إطلاق الحملة و30 يوماً بعده.</p>${table(['الحملة', 'الحالة', 'مستهدفات', 'حجوزات الحملة', 'حضور', 'رسائل وصلت', 'فشل', 'قبل 30 يوم', 'بعد 30 يوم'], campRows)}`),
    block('التسويق', `<ul>
      <li>حملات ${marketing.campaigns}، منها نشطة ${marketing.active} وبانتظار المراجعة ${marketing.review}</li>
      <li>رسائل ${marketing.messages}، وصلت ${marketing.sent}، فشلت ${marketing.failed}، قُرئت ${marketing.read}</li>
      <li>عروض ${marketing.offers}، معتمد ${marketing.approvedOffers}</li>
      <li>عروض جماعية ${marketing.groupOffers}، مفتوحة ${marketing.openGroups}</li>
      <li>مقالات المدونة ${marketing.blog}</li>
      <li>طلبات المنتجات ${marketing.orders}</li>
    </ul>`),
    block('عميلات رجعن', table(['العميلة', 'الهاتف', 'الزيارات', 'منذ آخر زيارة (يوم)', 'آخر خدمة'], backRows)),
    block('عميلات ما رجعن', table(['العميلة', 'الهاتف', 'أيام الغياب', 'حد الانقطاع', 'الحالة'], awayRows)),
  ].join('');
}

function deltaTextSafe(n) {
  if (n == null) return 'غير متاح';
  if (n === 0) return '0%';
  return `${n > 0 ? '+' : ''}${n}%`;
}

export function filesReportHtml(files) {
  if (!files.length) return '<p>لا ملفات عميلات.</p>';
  return files.map((c) => {
    const stamps = c.stamps.length
      ? c.stamps.map((s) => {
        const when = s.recordedAt ? new Date(s.recordedAt).toLocaleString('ar') : '—';
        const services = s.services.map((svc) => esc(svc.zones ? `${svc.title} (${svc.zones})` : svc.title)).join('، ');
        const sig = String(s.signature || '').startsWith('data:image')
          ? `<img class="sig" alt="توقيع" src="${s.signature}" />`
          : '<span class="muted">بدون توقيع</span>';
        return `<div><p><strong>${esc(when)}</strong> · ${esc(s.recordedBy || '—')}</p><p>${services}</p>${s.note ? `<p>${esc(s.note)}</p>` : ''}${sig}</div>`;
      }).join('<hr />')
      : '<p class="muted">لا جلسات مختومة</p>';
    const med = c.medical.length
      ? `<ul>${c.medical.map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join('')}</ul>`
      : '<p class="muted">لا معلومات طبية مسجّلة</p>';
    return `<article class="client"><h3>${esc(c.name)}</h3><p>${esc(c.phone || '—')}${c.birthDate ? ` · ميلاد ${esc(c.birthDate)}` : ''}${c.idNumber ? ` · هوية ${esc(c.idNumber)}` : ''}${c.doNotContact ? ' · طلبت عدم التواصل' : ''}</p><p><strong>الطبي</strong></p>${med}<p><strong>جلسات الختم (${c.stamps.length})</strong></p>${stamps}</article>`;
  }).join('');
}
