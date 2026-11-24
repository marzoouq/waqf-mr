// autoTable is dynamically imported inside each function
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
  fmtDate,
} from '../core/core';
import { fmt } from '@/utils/format/format';

export const generateIncomePDF = async (income: Array<{ source: string; amount: number; date: string; notes?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo, fiscalYearLabel?: string) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير الدخل'), 105, startY + 5, { align: 'center' });

  if (fiscalYearLabel) doc.text(fiscalYearLabel, 105, startY + 12, { align: 'center' });
  autoTable(doc, {
    startY: startY + 20,
    head: [reshapeRow(['#', 'المصدر', 'المبلغ', 'التاريخ', 'ملاحظات'])],
    body: income.map((item, i) => reshapeRow([
      i + 1,
      item.source,
      `${fmt(Number(item.amount))} ر.س`,
      fmtDate(item.date),
      item.notes || '-',
    ])),
    foot: [reshapeRow(['', 'الإجمالي', `${fmt(total)} ر.س`, '', ''])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  return finalizePdf(doc, fontFamily, `income-report-${fiscalYearLabel ?? 'all'}.pdf`, waqfInfo);
};

export const generateExpensesPDF = async (expenses: Array<{ expense_type: string; amount: number; date: string; description?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo, fiscalYearLabel?: string) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير المصروفات'), 105, startY + 5, { align: 'center' });

  if (fiscalYearLabel) doc.text(fiscalYearLabel, 105, startY + 12, { align: 'center' });
  autoTable(doc, {
    startY: startY + 20,
    head: [reshapeRow(['#', 'النوع', 'المبلغ', 'التاريخ', 'الوصف'])],
    body: expenses.map((item, i) => reshapeRow([
      i + 1,
      item.expense_type,
      `${fmt(Number(item.amount))} ر.س`,
      fmtDate(item.date),
      item.description || '-',
    ])),
    foot: [reshapeRow(['', 'الإجمالي', `${fmt(total)} ر.س`, '', ''])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  return finalizePdf(doc, fontFamily, `expenses-report-${fiscalYearLabel ?? 'all'}.pdf`, waqfInfo);
};
