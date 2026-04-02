// autoTable يُحمّل ديناميكياً
import type { CellHookData } from 'jspdf-autotable';
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';

/* ───── تقرير توزيع الحصص ───── */
export const generateDistributionsPDF = async (data: {
  fiscalYearLabel: string;
  availableAmount: number;
  distributions: Array<{
    beneficiary_name: string;
    share_percentage: number;
    share_amount: number;
    advances_paid: number;
    carryforward_deducted: number;
    net_amount: number;
    deficit: number;
  }>;
}, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير توزيع الحصص'), 105, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(rs(`السنة المالية: ${data.fiscalYearLabel}`), 105, startY + 14, { align: 'center' });

  // ملخص مالي
  const totalAdvances = data.distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = data.distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalNet = data.distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalDeficit = data.distributions.reduce((s, d) => s + d.deficit, 0);

  const summaryRows = [
    reshapeRow(['المبلغ المتاح للتوزيع', `${fmt(data.availableAmount)} ر.س`]),
    reshapeRow(['إجمالي السُلف المخصومة', `(${fmt(totalAdvances)}) ر.س`]),
    reshapeRow(['إجمالي المرحّل المخصوم', `(${fmt(totalCarryforward)}) ر.س`]),
    reshapeRow(['صافي التوزيع الفعلي', `${fmt(totalNet)} ر.س`]),
  ];
  if (totalDeficit > 0) {
    summaryRows.push(reshapeRow(['فروق مرحّلة للسنة القادمة', `${fmt(totalDeficit)} ر.س`]));
  }

  autoTable(doc, {
    startY: startY + 20,
    head: [reshapeRow(['البند', 'المبلغ'])],
    body: summaryRows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  const y = getLastAutoTableY(doc, 80) + 10;

  // جدول التوزيع التفصيلي
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text(rs('تفاصيل التوزيع'), 105, y, { align: 'center' });

  const bodyRows = data.distributions.map(d => reshapeRow([
    d.beneficiary_name,
    `${safeNumber(d.share_percentage).toFixed(6)}%`,
    fmt(d.share_amount),
    d.advances_paid > 0 ? `(${fmt(d.advances_paid)})` : '—',
    d.carryforward_deducted > 0 ? `(${fmt(d.carryforward_deducted)})` : '—',
    fmt(d.net_amount),
    d.deficit > 0 ? fmt(d.deficit) : '—',
  ]));

  const totalShareAmt = data.distributions.reduce((s, d) => s + d.share_amount, 0);

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المستفيد', 'النسبة', 'الحصة', 'السُلف', 'المرحّل', 'الصافي', 'فرق مرحّل'])],
    body: bodyRows,
    foot: [reshapeRow([
      'الإجمالي', '100%',
      fmt(totalShareAmt),
      totalAdvances > 0 ? `(${fmt(totalAdvances)})` : '—',
      totalCarryforward > 0 ? `(${fmt(totalCarryforward)})` : '—',
      fmt(totalNet),
      totalDeficit > 0 ? fmt(totalDeficit) : '—',
    ])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    didParseCell: (hookData: CellHookData) => {
      if (hookData.section === 'body') {
        const deficit = data.distributions[hookData.row.index]?.deficit ?? 0;
        if (deficit > 0) {
          hookData.cell.styles.fillColor = [255, 240, 240];
        }
      }
    },
  });

  finalizePdf(doc, fontFamily, `distributions-report-${data.fiscalYearLabel}.pdf`, waqfInfo);
};
