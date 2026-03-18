import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';

export interface YearComparisonPdfData {
  year1Label: string;
  year2Label: string;
  year1: { income: number; expenses: number; net: number };
  year2: { income: number; expenses: number; net: number };
  incomeChange: number;
  expenseChange: number;
  netChange: number;
  expensesByType1: Array<{ name: string; value: number }>;
  expensesByType2: Array<{ name: string; value: number }>;
  monthlyData: Array<{
    month: string;
    income1: number; expenses1: number; net1: number;
    income2: number; expenses2: number; net2: number;
  }>;
}

export const generateYearComparisonPDF = async (data: YearComparisonPdfData, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const f = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, f, waqfInfo);

  doc.setFont(f, 'bold');
  doc.setFontSize(16);
  doc.text(rs('تقرير المقارنة السنوية'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(f, 'normal');
  doc.text(rs(`${data.year1Label}  ←→  ${data.year2Label}`), 105, startY + 14, { align: 'center' });

  // 1. Summary comparison
  const fmtPctLocal = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  autoTable(doc, {
    startY: startY + 22,
    head: [reshapeRow(['المؤشر', data.year1Label, data.year2Label, 'التغير'])],
    body: [
      reshapeRow(['إجمالي الدخل', fmt(data.year1.income), fmt(data.year2.income), fmtPctLocal(data.incomeChange)]),
      reshapeRow(['إجمالي المصروفات', fmt(data.year1.expenses), fmt(data.year2.expenses), fmtPctLocal(data.expenseChange)]),
      reshapeRow(['صافي الدخل', fmt(data.year1.net), fmt(data.year2.net), fmtPctLocal(data.netChange)]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
  });

  let y = getLastAutoTableY(doc, 88) + 12;

  // 2. Monthly comparison table
  doc.setFont(f, 'bold');
  doc.setFontSize(13);
  doc.text(rs('المقارنة الشهرية التفصيلية'), 105, y, { align: 'center' });

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['الشهر', `دخل ${data.year1Label}`, `مصروفات`, `صافي`, `دخل ${data.year2Label}`, `مصروفات`, `صافي`, 'الفرق'])],
    body: data.monthlyData.map(m => {
      const diff = m.net2 - m.net1;
      return reshapeRow([
        m.month,
        fmt(m.income1),
        fmt(m.expenses1),
        fmt(m.net1),
        fmt(m.income2),
        fmt(m.expenses2),
        fmt(m.net2),
        `${diff > 0 ? '+' : ''}${fmt(diff)}`,
      ]);
    }),
    foot: [reshapeRow([
      'الإجمالي',
      fmt(data.year1.income),
      fmt(data.year1.expenses),
      fmt(data.year1.net),
      fmt(data.year2.income),
      fmt(data.year2.expenses),
      fmt(data.year2.net),
      `${(data.year2.net - data.year1.net) > 0 ? '+' : ''}${fmt(data.year2.net - data.year1.net)}`,
    ])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...footStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
    columnStyles: { 0: { cellWidth: 22 } },
  });

  y = getLastAutoTableY(doc, 188) + 12;

  // 3. Expenses by type - Year 1
  doc.setFont(f, 'bold');
  doc.setFontSize(13);
  doc.text(rs(`توزيع المصروفات - ${data.year1Label}`), 105, y, { align: 'center' });

  if (data.expensesByType1.length > 0) {
    const total1 = data.expensesByType1.reduce((s, e) => s + e.value, 0);
    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['النوع', 'المبلغ (ر.س)', 'النسبة'])],
      body: data.expensesByType1.map(e => reshapeRow([
        e.name,
        fmt(e.value),
        `${total1 > 0 ? ((e.value / total1) * 100).toFixed(1) : 0}%`,
      ])),
      foot: [reshapeRow(['الإجمالي', fmt(total1), '100%'])],
      theme: 'striped',
      ...headStyles(TABLE_HEAD_RED, f),
      ...footStyles(TABLE_HEAD_RED, f),
      ...baseTableStyles(f),
    });
    y = getLastAutoTableY(doc, y + 38) + 12;
  }

  // 4. Expenses by type - Year 2
  doc.setFont(f, 'bold');
  doc.setFontSize(13);
  doc.text(rs(`توزيع المصروفات - ${data.year2Label}`), 105, y, { align: 'center' });

  if (data.expensesByType2.length > 0) {
    const total2 = data.expensesByType2.reduce((s, e) => s + e.value, 0);
    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['النوع', 'المبلغ (ر.س)', 'النسبة'])],
      body: data.expensesByType2.map(e => reshapeRow([
        e.name,
        fmt(e.value),
        `${total2 > 0 ? ((e.value / total2) * 100).toFixed(1) : 0}%`,
      ])),
      foot: [reshapeRow(['الإجمالي', fmt(total2), '100%'])],
      theme: 'striped',
      ...headStyles(TABLE_HEAD_RED, f),
      ...footStyles(TABLE_HEAD_RED, f),
      ...baseTableStyles(f),
    });
  }

  addHeaderToAllPages(doc, f, waqfInfo);
  addFooter(doc, f, waqfInfo);
  doc.save(`year-comparison-${data.year1Label}-vs-${data.year2Label}.pdf`);
};
