import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
  fmtDate,
} from './core';
import { fmt } from '@/utils/format';

export const generateIncomePDF = async (income: Array<{ source: string; amount: number; date: string; notes?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo) => {
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير الدخل'), 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
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

  finalizePdf(doc, fontFamily, `income-report-${new Date().toISOString().slice(0, 10)}.pdf`, waqfInfo);
};

export const generateExpensesPDF = async (expenses: Array<{ expense_type: string; amount: number; date: string; description?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo) => {
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير المصروفات'), 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
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

  finalizePdf(doc, fontFamily, `expenses-report-${new Date().toISOString().slice(0, 10)}.pdf`, waqfInfo);
};
