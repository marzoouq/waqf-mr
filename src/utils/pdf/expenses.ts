import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
} from './core';

export const generateIncomePDF = async (income: Array<{ source: string; amount: number; date: string; notes?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير الدخل', 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'المصدر', 'المبلغ', 'التاريخ', 'ملاحظات']],
    body: income.map((item, i) => [
      i + 1,
      item.source,
      `${Number(item.amount).toLocaleString()} ر.س`,
      item.date,
      item.notes || '-',
    ]),
    foot: [['', 'الإجمالي', `${total.toLocaleString()} ر.س`, '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('income-report.pdf');
};

export const generateExpensesPDF = async (expenses: Array<{ expense_type: string; amount: number; date: string; description?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير المصروفات', 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'النوع', 'المبلغ', 'التاريخ', 'الوصف']],
    body: expenses.map((item, i) => [
      i + 1,
      item.expense_type,
      `${Number(item.amount).toLocaleString()} ر.س`,
      item.date,
      item.description || '-',
    ]),
    foot: [['', 'الإجمالي', `${total.toLocaleString()} ر.س`, '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('expenses-report.pdf');
};
