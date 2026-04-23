// autoTable يُحمّل ديناميكياً داخل الدالة لمنع تحميل vendor-pdf مبكراً
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt } from '@/utils/format/format';

export interface ReportData {
  fiscalYear: string;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  adminPct?: number;
  waqifPct?: number;
  expensesByType: Array<{ type: string; amount: number }>;
  incomeBySource: Array<{ source: string; amount: number }>;
  beneficiaries: Array<{
    name: string;
    percentage: number;
    amount: number;
  }>;
}

export const generateAnnualReportPDF = async (data: ReportData, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير الوقف السنوي'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: [
      reshapeRow([{ content: rs('-- الإيرادات --'), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 252, 231] } }]),
      ...data.incomeBySource.map(i => reshapeRow([`  ${i.source}`, `+${fmt(i.amount)}`])),
      reshapeRow([{ content: rs('إجمالي الإيرادات'), styles: { fontStyle: 'bold' } }, { content: `+${fmt(data.totalIncome)}`, styles: { fontStyle: 'bold' } }]),
      reshapeRow([{ content: rs('-- المصروفات --'), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226] } }]),
      ...data.expensesByType.map(e => reshapeRow([`  ${e.type}`, `-${fmt(e.amount)}`])),
      reshapeRow([{ content: rs('إجمالي المصروفات'), styles: { fontStyle: 'bold' } }, { content: `(${fmt(data.totalExpenses)})`, styles: { fontStyle: 'bold' } }]),
      reshapeRow(['صافي الريع', fmt(data.netRevenue)]),
      reshapeRow([`حصة الناظر (${data.adminPct ?? 10}%)`, fmt(data.adminShare)]),
      reshapeRow([`حصة الواقف (${data.waqifPct ?? 5}%)`, fmt(data.waqifShare)]),
      reshapeRow(['ريع المستفيدين', fmt(data.waqfRevenue)]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  const finalY = getLastAutoTableY(doc, 100);

  doc.setFontSize(14);
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('توزيع حصص المستفيدين'), 105, finalY + 15, { align: 'center' });

  autoTable(doc, {
    startY: finalY + 22,
    head: [reshapeRow(['اسم المستفيد', 'المبلغ المستحق (ر.س)'])],
    body: data.beneficiaries.map(b => reshapeRow([
      b.name,
      fmt(b.amount),
    ])),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  finalizePdf(doc, fontFamily, `waqf-report-${data.fiscalYear}.pdf`, waqfInfo);
};
