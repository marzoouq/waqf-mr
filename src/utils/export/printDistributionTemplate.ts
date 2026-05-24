/**
 * قوالب HTML/CSS لتقرير طباعة التوزيع — مستخرجة من printDistributionReport.ts
 * ملاحظة: ألوان HEX مسموحة هنا لأنها سياق طباعة مستقل (window.open).
 */
import { fmt } from '@/utils/format/format';

/** ألوان تقرير الطباعة — مركزية لتسهيل التعديل */
export const PRINT_COLORS = {
  text: '#1a1a2e',
  background: '#fff',
  heading: '#2c3e50',
  subheading: '#7f8c8d',
  muted: '#95a5a6',
  metaBg: '#f8f9fa',
  metaBorder: '#e9ecef',
  tableBorder: '#dee2e6',
  tableHeaderBg: '#2c3e50',
  tableHeaderText: '#fff',
  evenRowBg: '#f8f9fa',
  totalRowBg: '#f1f3f5',
  success: '#27ae60',
  danger: '#c0392b',
  warning: '#e67e22',
  info: '#2980b9',
  deficitBg: '#fff5f5',
  primaryCardBg: '#e8f5e9',
  primaryCardBorder: '#a5d6a7',
  dangerCardBg: '#ffebee',
  dangerCardBorder: '#ef9a9a',
  warningCardBg: '#fff8e1',
  warningCardBorder: '#ffe082',
  infoCardBg: '#e3f2fd',
  infoCardBorder: '#90caf9',
  footerText: '#adb5bd',
  labelText: '#666',
} as const;

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface DistributionRow {
  beneficiary_name: string;
  share_percentage: number;
  share_amount: number;
  advances_paid: number;
  carryforward_deducted: number;
  net_amount: number;
  deficit: number;
}

export interface DistributionHtmlParams {
  fiscalYearLabel: string;
  availableAmount: number;
  distributions: DistributionRow[];
  totalNet: number;
  totalAdvances: number;
  totalCarryforward: number;
  totalDeficit: number;
  waqfName?: string;
  deedNumber?: string;
  logoUrl?: string;
}

function buildStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Amiri', serif; padding: 32px 40px; color: ${PRINT_COLORS.text}; direction: rtl; background: ${PRINT_COLORS.background}; }

    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px double ${PRINT_COLORS.heading}; padding-bottom: 16px; }
    .header h1 { font-size: 24px; color: ${PRINT_COLORS.heading}; margin-bottom: 4px; }
    .header h2 { font-size: 16px; color: ${PRINT_COLORS.subheading}; font-weight: normal; }
    .header .deed { font-size: 13px; color: ${PRINT_COLORS.muted}; margin-top: 2px; }

    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 12px 16px; background: ${PRINT_COLORS.metaBg}; border-radius: 6px; border: 1px solid ${PRINT_COLORS.metaBorder}; }
    .meta span { font-size: 14px; }
    .meta strong { color: ${PRINT_COLORS.heading}; }

    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th { background: ${PRINT_COLORS.tableHeaderBg}; color: ${PRINT_COLORS.tableHeaderText}; padding: 10px 12px; text-align: right; font-weight: 700; }
    td { border: 1px solid ${PRINT_COLORS.tableBorder}; padding: 8px 12px; text-align: right; }
    tr:nth-child(even) { background: ${PRINT_COLORS.evenRowBg}; }
    .deficit-row { background: ${PRINT_COLORS.deficitBg} !important; }
    .deficit-row td { color: ${PRINT_COLORS.danger}; }
    .name-cell { font-weight: 700; }
    .net-cell { font-weight: 700; color: ${PRINT_COLORS.success}; }
    .deficit-row .net-cell { color: ${PRINT_COLORS.danger}; }

    .total-row td { border-top: 3px double ${PRINT_COLORS.heading}; font-weight: 700; font-size: 14px; background: ${PRINT_COLORS.totalRowBg} !important; }

    .summary { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .summary-card { padding: 12px 16px; border-radius: 6px; border: 1px solid ${PRINT_COLORS.metaBorder}; }
    .summary-card.primary { background: ${PRINT_COLORS.primaryCardBg}; border-color: ${PRINT_COLORS.primaryCardBorder}; }
    .summary-card.danger { background: ${PRINT_COLORS.dangerCardBg}; border-color: ${PRINT_COLORS.dangerCardBorder}; }
    .summary-card.warning { background: ${PRINT_COLORS.warningCardBg}; border-color: ${PRINT_COLORS.warningCardBorder}; }
    .summary-card.info { background: ${PRINT_COLORS.infoCardBg}; border-color: ${PRINT_COLORS.infoCardBorder}; }
    .summary-card .label { font-size: 12px; color: ${PRINT_COLORS.labelText}; }
    .summary-card .value { font-size: 18px; font-weight: 700; margin-top: 2px; }

    .footer { margin-top: 32px; text-align: center; color: ${PRINT_COLORS.footerText}; font-size: 11px; border-top: 1px solid ${PRINT_COLORS.metaBorder}; padding-top: 12px; }

    @media print {
      body { padding: 16px; }
      .summary { break-inside: avoid; }
    }
  `;
}

function buildRows(distributions: DistributionRow[]): string {
  return distributions.map(d => `
    <tr${d.deficit > 0 ? ' class="deficit-row"' : ''}>
      <td class="name-cell">${escapeHtml(d.beneficiary_name)}</td>
      <td>${d.share_percentage.toFixed(2)}%</td>
      <td>${fmt(d.share_amount)}</td>
      <td>${d.advances_paid > 0 ? '-' + fmt(d.advances_paid) : '—'}</td>
      <td>${d.carryforward_deducted > 0 ? '-' + fmt(d.carryforward_deducted) : '—'}</td>
      <td class="net-cell">${d.deficit > 0 ? '0.00' : fmt(d.net_amount)}</td>
      <td>${d.deficit > 0 ? fmt(d.deficit) : '—'}</td>
    </tr>
  `).join('');
}

export function buildDistributionHtml(p: DistributionHtmlParams): string {
  const logoHtml = p.logoUrl
    ? `<img src="${p.logoUrl}" alt="شعار الوقف" style="height:64px;margin:0 auto 8px;display:block;" crossorigin="anonymous" />`
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير توزيع الحصص - ${escapeHtml(p.fiscalYearLabel)}</title>
  <style>${buildStyles()}</style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <h1>${escapeHtml(p.waqfName || 'نظام إدارة الوقف')}</h1>
    <h2>تقرير توزيع حصص المستفيدين</h2>
    ${p.deedNumber ? `<p class="deed">${escapeHtml(p.deedNumber)}</p>` : ''}
  </div>

  <div class="meta">
    <span>السنة المالية: <strong>${escapeHtml(p.fiscalYearLabel || '—')}</strong></span>
    <span>المبلغ المتاح للتوزيع: <strong>${fmt(p.availableAmount)} ر.س</strong></span>
    <span>عدد المستفيدين: <strong>${p.distributions.length}</strong></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>المستفيد</th><th>النسبة</th><th>الحصة</th>
        <th>السُلف</th><th>مرحّل</th><th>الصافي</th><th>فرق مرحّل</th>
      </tr>
    </thead>
    <tbody>
      ${buildRows(p.distributions)}
      <tr class="total-row">
        <td>الإجمالي</td>
        <td>—</td>
        <td>${fmt(p.availableAmount)}</td>
        <td>${p.totalAdvances > 0 ? '-' + fmt(p.totalAdvances) : '—'}</td>
        <td>${p.totalCarryforward > 0 ? '-' + fmt(p.totalCarryforward) : '—'}</td>
        <td>${fmt(p.totalNet)}</td>
        <td>${p.totalDeficit > 0 ? fmt(p.totalDeficit) : '—'}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-card primary">
      <div class="label">صافي المبلغ المطلوب صرفه</div>
      <div class="value" style="color:${PRINT_COLORS.success}">${fmt(p.totalNet)} ر.س</div>
    </div>
    <div class="summary-card info">
      <div class="label">إجمالي التوزيع (شامل الخصومات)</div>
      <div class="value" style="color:${PRINT_COLORS.info}">${fmt(p.totalNet + p.totalAdvances + p.totalCarryforward)} ر.س</div>
    </div>
    ${p.totalAdvances > 0 ? `
    <div class="summary-card danger">
      <div class="label">إجمالي السُلف المخصومة</div>
      <div class="value" style="color:${PRINT_COLORS.danger}">-${fmt(p.totalAdvances)} ر.س</div>
    </div>` : ''}
    ${p.totalDeficit > 0 ? `
    <div class="summary-card warning">
      <div class="label">فروق مرحّلة للسنة القادمة (${p.distributions.filter(d => d.deficit > 0).length} مستفيد)</div>
      <div class="value" style="color:${PRINT_COLORS.warning}">${fmt(p.totalDeficit)} ر.س</div>
    </div>` : ''}
  </div>

  <p class="footer">تمت الطباعة بتاريخ ${new Date().toLocaleDateString('ar-SA')} — ${escapeHtml(p.waqfName || 'نظام إدارة الوقف')}</p>
</body>
</html>`;
}
