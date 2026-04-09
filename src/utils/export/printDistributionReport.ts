/**
 * طباعة تقرير التوزيع الشامل مباشرة من المتصفح بتنسيق رسمي
 * ملاحظة: لا يستورد toast — يُرجع false عند فشل فتح النافذة والطبقة المستدعية تتولى الإشعار
 */
import { fmt } from '@/utils/format/format';

/** ألوان تقرير الطباعة — مركزية لتسهيل التعديل */
const PRINT_COLORS = {
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Distribution {
  beneficiary_name: string;
  share_percentage: number;
  share_amount: number;
  advances_paid: number;
  carryforward_deducted: number;
  net_amount: number;
  deficit: number;
}

interface PrintDistributionParams {
  fiscalYearLabel: string;
  availableAmount: number;
  distributions: Distribution[];
  waqfName?: string;
  deedNumber?: string;
  logoUrl?: string;
}

/**
 * @returns true عند النجاح، false إذا تعذر فتح النافذة
 */
export function printDistributionReport(params: PrintDistributionParams): boolean {
  const { fiscalYearLabel, availableAmount, distributions, waqfName, deedNumber, logoUrl } = params;

  const totalNet = distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalAdvances = distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalDeficit = distributions.reduce((s, d) => s + d.deficit, 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="شعار الوقف" style="height:64px;margin:0 auto 8px;display:block;" crossorigin="anonymous" />`
    : '';

  const rows = distributions.map(d => `
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

  printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير توزيع الحصص - ${escapeHtml(fiscalYearLabel)}</title>
  <style>
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
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <h1>${escapeHtml(waqfName || 'نظام إدارة الوقف')}</h1>
    <h2>تقرير توزيع حصص المستفيدين</h2>
    ${deedNumber ? `<p class="deed">${escapeHtml(deedNumber)}</p>` : ''}
  </div>

  <div class="meta">
    <span>السنة المالية: <strong>${escapeHtml(fiscalYearLabel || '—')}</strong></span>
    <span>المبلغ المتاح للتوزيع: <strong>${fmt(availableAmount)} ر.س</strong></span>
    <span>عدد المستفيدين: <strong>${distributions.length}</strong></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>المستفيد</th>
        <th>النسبة</th>
        <th>الحصة</th>
        <th>السُلف</th>
        <th>مرحّل</th>
        <th>الصافي</th>
        <th>فرق مرحّل</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td>الإجمالي</td>
        <td>—</td>
        <td>${fmt(availableAmount)}</td>
        <td>${totalAdvances > 0 ? '-' + fmt(totalAdvances) : '—'}</td>
        <td>${totalCarryforward > 0 ? '-' + fmt(totalCarryforward) : '—'}</td>
        <td>${fmt(totalNet)}</td>
        <td>${totalDeficit > 0 ? fmt(totalDeficit) : '—'}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-card primary">
      <div class="label">صافي المبلغ المطلوب صرفه</div>
      <div class="value" style="color:${PRINT_COLORS.success}">${fmt(totalNet)} ر.س</div>
    </div>
    <div class="summary-card info">
      <div class="label">إجمالي التوزيع (شامل الخصومات)</div>
      <div class="value" style="color:${PRINT_COLORS.info}">${fmt(totalNet + totalAdvances + totalCarryforward)} ر.س</div>
    </div>
    ${totalAdvances > 0 ? `
    <div class="summary-card danger">
      <div class="label">إجمالي السُلف المخصومة</div>
      <div class="value" style="color:${PRINT_COLORS.danger}">-${fmt(totalAdvances)} ر.س</div>
    </div>` : ''}
    ${totalDeficit > 0 ? `
    <div class="summary-card warning">
      <div class="label">فروق مرحّلة للسنة القادمة (${distributions.filter(d => d.deficit > 0).length} مستفيد)</div>
      <div class="value" style="color:${PRINT_COLORS.warning}">${fmt(totalDeficit)} ر.س</div>
    </div>` : ''}
  </div>

  <p class="footer">تمت الطباعة بتاريخ ${new Date().toLocaleDateString('ar-SA')} — ${escapeHtml(waqfName || 'نظام إدارة الوقف')}</p>
</body>
</html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
  // إغلاق النافذة تلقائياً بعد الطباعة أو الإلغاء
  printWindow.onafterprint = () => printWindow.close();
  return true;
}
