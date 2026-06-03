// autoTable يُحمّل ديناميكياً داخل كل دالة لمنع تحميل vendor-pdf مبكراً
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt } from '@/utils/format/format';

interface YearTotalsBlock {
  income: number;
  expenses: number;
  net: number;
  netAfterExpenses?: number;
  netAfterZakat?: number;
  waqfRevenue?: number;
}

export interface YearComparisonPdfData {
  year1Label: string;
  year2Label: string;
  year1: YearTotalsBlock;
  year2: YearTotalsBlock;
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
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily: f, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(f, 'bold');
  doc.setFontSize(16);
  doc.text(rs('تقرير المقارنة السنوية'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(f, 'normal');
  doc.text(rs(`${data.year1Label}  ←→  ${data.year2Label}`), 105, startY + 14, { align: 'center' });

  // 1. Summary comparison — يدعم 3 صفوف صافي منفصلة عند توفّر البيانات
  const fmtPctLocal = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  const hasBreakdown =
    data.year1.netAfterExpenses !== undefined && data.year1.netAfterZakat !== undefined && data.year1.waqfRevenue !== undefined;
  const body: (string | number)[][] = [
    reshapeRow(['إجمالي الدخل', fmt(data.year1.income), fmt(data.year2.income), fmtPctLocal(data.incomeChange)]) as (string | number)[],
    reshapeRow(['إجمالي المصروفات', fmt(data.year1.expenses), fmt(data.year2.expenses), fmtPctLocal(data.expenseChange)]) as (string | number)[],
  ];
  if (hasBreakdown) {
    const ne1 = data.year1.netAfterExpenses!, ne2 = data.year2.netAfterExpenses!;
    const nz1 = data.year1.netAfterZakat!,    nz2 = data.year2.netAfterZakat!;
    const wr1 = data.year1.waqfRevenue!,      wr2 = data.year2.waqfRevenue!;
    const ch = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b)) * 100 : 0;
    body.push(reshapeRow(['صافي بعد المصروفات', fmt(ne1), fmt(ne2), fmtPctLocal(ch(ne2, ne1))]));
    body.push(reshapeRow(['صافي بعد الزكاة',    fmt(nz1), fmt(nz2), fmtPctLocal(ch(nz2, nz1))]));
    body.push(reshapeRow(['ريع الوقف',          fmt(wr1), fmt(wr2), fmtPctLocal(ch(wr2, wr1))]));
  } else {
    body.push(reshapeRow(['صافي الدخل', fmt(data.year1.net), fmt(data.year2.net), fmtPctLocal(data.netChange)]));
  }
  autoTable(doc, {
    startY: startY + 22,
    head: [reshapeRow(['المؤشر', data.year1Label, data.year2Label, 'التغير'])],
    body,
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

  finalizePdf(doc, f, `year-comparison-${data.year1Label}-vs-${data.year2Label}.pdf`, waqfInfo);
};
