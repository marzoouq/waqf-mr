// PDF للمقارنة التاريخية متعددة السنوات (2–4 سنوات)
// autoTable يُحمّل ديناميكياً داخل الدالة لمنع تحميل vendor-pdf مبكراً
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt } from '@/utils/format/format';

export interface MultiYearComparisonEntry {
  label: string;
  income: number;
  expenses: number;
  net: number; // معنى موحَّد: waqfRevenue إن وُجد، وإلا income−expenses
  vatAmount?: number;
  zakatAmount?: number;
  adminShare?: number;
  waqifShare?: number;
  distributionsAmount?: number;
  expensesByType?: Array<{ name: string; value: number }>;
}

export interface MultiYearComparisonPdfData {
  years: MultiYearComparisonEntry[];
}

const pct = (a: number, b: number) => {
  if (!b) return '—';
  const v = ((a - b) / Math.abs(b)) * 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
};

export const generateMultiYearComparisonPDF = async (
  data: MultiYearComparisonPdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const years = data.years.slice(0, 4);
  if (years.length < 2) return;
  const { default: autoTable } = await import('jspdf-autotable');
  const orientation = years.length > 2 ? 'landscape' : 'portrait';
  const { doc, fontFamily: f, startY } = await createPdfDocument(waqfInfo, orientation);

  doc.setFont(f, 'bold');
  doc.setFontSize(16);
  const pageW = doc.internal.pageSize.width;
  doc.text(rs('تقرير المقارنة التاريخية'), pageW / 2, startY + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(f, 'normal');
  doc.text(
    rs(years.map(y => y.label).join('  ←→  ')),
    pageW / 2,
    startY + 14,
    { align: 'center' },
  );

  // الجدول الأساسي: المؤشر × السنوات + التغير بين الأولى والأخيرة
  const showChange = years.length >= 2;
  const head = ['المؤشر', ...years.map(y => y.label), ...(showChange ? ['التغير'] : [])];

  const rows: Array<{ label: string; pick: (e: MultiYearComparisonEntry) => number }> = [
    { label: 'إجمالي الدخل', pick: e => e.income },
    { label: 'إجمالي المصروفات', pick: e => e.expenses },
    { label: 'الصافي (ريع الوقف)', pick: e => e.net },
    { label: 'ضريبة القيمة المضافة', pick: e => e.vatAmount ?? 0 },
    { label: 'الزكاة', pick: e => e.zakatAmount ?? 0 },
    { label: 'حصة الناظر', pick: e => e.adminShare ?? 0 },
    { label: 'حصة الواقف', pick: e => e.waqifShare ?? 0 },
    { label: 'التوزيعات', pick: e => e.distributionsAmount ?? 0 },
  ];

  autoTable(doc, {
    startY: startY + 22,
    head: [reshapeRow(head)],
    body: rows.map(r => {
      const vals = years.map(y => r.pick(y));
      const first = vals[0] ?? 0;
      const last = vals[vals.length - 1] ?? 0;
      return reshapeRow([
        r.label,
        ...vals.map(v => fmt(v)),
        ...(showChange ? [pct(last, first)] : []),
      ]);
    }),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
  });

  let y = getLastAutoTableY(doc, startY + 80) + 10;

  // أقسام توزيع المصروفات لكل سنة لها بيانات
  for (const yr of years) {
    if (!yr.expensesByType || yr.expensesByType.length === 0) continue;
    if (y > doc.internal.pageSize.height - 60) {
      doc.addPage();
      y = 25;
    }
    doc.setFont(f, 'bold');
    doc.setFontSize(13);
    doc.text(rs(`توزيع المصروفات — ${yr.label}`), pageW / 2, y, { align: 'center' });
    const total = yr.expensesByType.reduce((s, e) => s + e.value, 0);
    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['النوع', 'المبلغ (ر.س)', 'النسبة'])],
      body: yr.expensesByType.map(e => reshapeRow([
        e.name,
        fmt(e.value),
        `${total > 0 ? ((e.value / total) * 100).toFixed(1) : 0}%`,
      ])),
      foot: [reshapeRow(['الإجمالي', fmt(total), '100%'])],
      theme: 'striped',
      ...headStyles(TABLE_HEAD_RED, f),
      ...footStyles(TABLE_HEAD_RED, f),
      ...baseTableStyles(f),
    });
    y = getLastAutoTableY(doc, y + 40) + 10;
  }

  const fileLabel = years.map(y => y.label).join('-vs-');
  finalizePdf(doc, f, `historical-comparison-${fileLabel}.pdf`, waqfInfo);
};
