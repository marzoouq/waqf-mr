/** أقسام الجداول المالية للتقرير السنوي المُجمَّع */
import type jsPDF from 'jspdf';
import type { CellHookData } from 'jspdf-autotable';
import {
  TABLE_HEAD_GREEN, baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '../../core/core';
import { getLastAutoTableY } from '../../core/pdfHelpers';
import { fmt } from '@/utils/format/format';
import type { AggregatedAnnualPdfData } from './types';

type AutoTable = (typeof import('jspdf-autotable'))['default'];

export const sectionTitle = (doc: jsPDF, f: string, title: string, y: number) => {
  doc.setFont(f, 'bold');
  doc.setFontSize(13);
  doc.text(rs(title), 192, y, { align: 'right' });
};

export function renderQuickIndicators(doc: jsPDF, autoTable: AutoTable, f: string, data: AggregatedAnnualPdfData, y: number): number {
  sectionTitle(doc, f, 'أولاً: مؤشرات سريعة', y);
  autoTable(doc, {
    startY: y + 4,
    head: [reshapeRow(['البند', 'القيمة'])],
    body: [
      reshapeRow(['عدد العقارات', String(data.counts.properties)]),
      reshapeRow(['العقود النشطة', String(data.counts.activeContracts)]),
      reshapeRow(['عدد المستفيدين', String(data.counts.beneficiaries)]),
      reshapeRow(['الوحدات المؤجَّرة', `${data.counts.rentedUnits} / ${data.counts.totalUnits}`]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
  });
  return getLastAutoTableY(doc) + 8;
}

export function renderFinancialSequence(doc: jsPDF, autoTable: AutoTable, f: string, data: AggregatedAnnualPdfData, y: number): number {
  sectionTitle(doc, f, 'ثانياً: التسلسل المالي الكامل', y);
  const seqRows: (string | number)[][] = [
    ['إجمالي الدخل', `+${fmt(data.totalIncome)}`],
    ['(-) المصروفات التشغيلية', `(${fmt(data.totalExpenses)})`],
    ['الصافي بعد المصاريف', fmt(data.netAfterExpenses)],
    ['(-) ضريبة القيمة المضافة', `(${fmt(data.vatAmount)})`],
    ['الصافي بعد الضريبة', fmt(data.netAfterVat)],
  ];
  if (data.zakatAmount > 0) {
    seqRows.push(['(-) الزكاة', `(${fmt(data.zakatAmount)})`]);
    seqRows.push(['الصافي بعد الزكاة', fmt(data.netAfterZakat)]);
  }
  if (data.adminShare > 0) seqRows.push([`(-) حصة الناظر (${data.adminPct}%)`, `(${fmt(data.adminShare)})`]);
  if (data.waqifShare > 0) seqRows.push([`(-) حصة الواقف (${data.waqifPct}%)`, `(${fmt(data.waqifShare)})`]);
  seqRows.push(['ريع الوقف', fmt(data.waqfRevenue)]);
  if (data.waqfCorpusManual > 0) seqRows.push(['(-) رقبة الوقف للعام الحالي', `(${fmt(data.waqfCorpusManual)})`]);
  if (data.waqfCorpusPrevious > 0) seqRows.push(['(+) فائض رقبة الوقف المُرحَّل', `+${fmt(data.waqfCorpusPrevious)}`]);
  seqRows.push(['المتاح للتوزيع', fmt(data.availableAmount)]);
  if (data.distributionsAmount > 0) seqRows.push(['(-) التوزيعات المُنفَّذة', `(${fmt(data.distributionsAmount)})`]);
  seqRows.push(['الرصيد المتبقي', fmt(data.remainingBalance)]);

  autoTable(doc, {
    startY: y + 4,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: seqRows.map(r => reshapeRow(r)),
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, f),
    ...baseTableStyles(f),
    didParseCell: (h: CellHookData) => {
      if (h.section === 'body' && h.row.index === seqRows.length - 1) {
        h.cell.styles.fontStyle = 'bold';
        h.cell.styles.fillColor = [235, 252, 235];
      }
    },
  });
  return getLastAutoTableY(doc) + 8;
}

export function renderKeyValueTable(doc: jsPDF, autoTable: AutoTable, f: string, title: string, headers: [string, string], entries: [string, number][], y: number): number {
  sectionTitle(doc, f, title, y);
  autoTable(doc, {
    startY: y + 4,
    head: [reshapeRow(headers)],
    body: entries.map(([k, v]) => reshapeRow([k, fmt(v)])),
    theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
  });
  return getLastAutoTableY(doc) + 8;
}

export function renderBeneficiaries(doc: jsPDF, autoTable: AutoTable, f: string, data: AggregatedAnnualPdfData, y: number): number {
  sectionTitle(doc, f, 'خامساً: المستفيدون والأنصبة', y);
  autoTable(doc, {
    startY: y + 4,
    head: [reshapeRow(['المستفيد', 'النسبة %', 'الحصة المحسوبة'])],
    body: data.beneficiaries.map(b => reshapeRow([b.name, `${b.share_percentage}%`, fmt(b.computedShare)])),
    theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
  });
  return getLastAutoTableY(doc) + 8;
}

export function renderDistributions(doc: jsPDF, autoTable: AutoTable, f: string, data: AggregatedAnnualPdfData, y: number): number {
  sectionTitle(doc, f, 'سادساً: التوزيعات المنفَّذة', y);
  autoTable(doc, {
    startY: y + 4,
    head: [reshapeRow(['التاريخ', 'المستفيد', 'المبلغ', 'الحالة'])],
    body: data.distributions.map(d =>
      reshapeRow([d.date, d.beneficiary, fmt(d.amount), d.status === 'paid' ? 'مدفوع' : d.status]),
    ),
    theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
  });
  return getLastAutoTableY(doc) + 8;
}

export function renderYoY(doc: jsPDF, autoTable: AutoTable, f: string, data: AggregatedAnnualPdfData, y: number): number {
  if (!data.yoy) return y;
  sectionTitle(doc, f, `سابعاً: مقارنة مع السنة السابقة (${data.yoy.prevLabel})`, y);
  autoTable(doc, {
    startY: y + 4,
    head: [reshapeRow(['البند', 'السنة السابقة', 'السنة الحالية', 'الفرق'])],
    body: [
      reshapeRow(['إجمالي الدخل', fmt(data.yoy.prevIncome), fmt(data.totalIncome), fmt(data.totalIncome - data.yoy.prevIncome)]),
      reshapeRow(['إجمالي المصروفات', fmt(data.yoy.prevExpenses), fmt(data.totalExpenses), fmt(data.totalExpenses - data.yoy.prevExpenses)]),
      reshapeRow(['الصافي بعد الزكاة', fmt(data.yoy.prevNetAfterZakat), fmt(data.netAfterZakat), fmt(data.netAfterZakat - data.yoy.prevNetAfterZakat)]),
    ],
    theme: 'grid', ...headStyles(TABLE_HEAD_GREEN, f), ...baseTableStyles(f),
  });
  return getLastAutoTableY(doc) + 8;
}

export function writeNarrative(
  doc: jsPDF,
  f: string,
  title: string,
  items: Array<{ title: string; content: string; propertyName?: string }>,
  color: [number, number, number],
  yStart: number,
): number {
  let y = yStart;
  if (!items.length) return y;
  if (y > 250) { doc.addPage(); y = 25; }
  doc.setFont(f, 'bold'); doc.setFontSize(13);
  doc.setTextColor(...color);
  doc.text(rs(title), 192, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 7;
  items.forEach((item, idx) => {
    if (y > 265) { doc.addPage(); y = 25; }
    doc.setFont(f, 'bold'); doc.setFontSize(11);
    const prefix = item.propertyName ? `${item.propertyName}: ` : '';
    doc.text(rs(`${idx + 1}. ${prefix}${item.title}`), 192, y, { align: 'right' });
    y += 6;
    if (item.content) {
      doc.setFont(f, 'normal'); doc.setFontSize(10);
      const lines = doc.splitTextToSize(item.content, 174);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 25; }
        doc.text(rs(line), 192, y, { align: 'right' });
        y += 5;
      });
    }
    y += 3;
  });
  return y + 4;
}
