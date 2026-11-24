import { stampAfterContent } from '@/utils/pdf/core/approvalStamp';
// autoTable is dynamically imported inside each function
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
  fmtDate,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { fmt } from '@/utils/format/format';

// ترجمة حالات التوزيع
const distributionStatusLabel = (s: string): string => {
  switch (s) {
    case 'paid': return 'مستلم';
    case 'pending': return 'معلق';
    case 'partial': return 'جزئي';
    case 'cancelled': return 'ملغي';
    default: return s;
  }
};

export const generateMySharePDF = async (data: {
  beneficiaryName: string;
  sharePercentage: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  beneficiariesShare: number;
  distributions: Array<{ date: string; fiscalYear: string; amount: number; status: string }>;
  adminPct?: number;
  waqifPct?: number;
  paidAdvances?: number;
  carryforwardDeducted?: number;
  fiscalYear?: string;
}, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير حصتي من الريع'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`المستفيد: ${data.beneficiaryName}`), 105, startY + 16, { align: 'center' });

  // بنود الجدول الأساسية
  const bodyRows = [
    reshapeRow(['إجمالي ريع الوقف', `${fmt(data.netRevenue)} ر.س`]),
    reshapeRow(['نسبتي من الريع', `${data.sharePercentage}%`]),
    reshapeRow([`(-) حصة الناظر (${data.adminPct ?? 10}%)`, `${fmt(data.adminShare)} ر.س`]),
    reshapeRow([`(-) حصة الواقف (${data.waqifPct ?? 5}%)`, `${fmt(data.waqifShare)} ر.س`]),
    reshapeRow(['صافي ريع المستفيدين', `${fmt(data.beneficiariesShare)} ر.س`]),
    reshapeRow(['حصتي المستحقة', `${fmt(data.myShare)} ر.س`]),
    reshapeRow(['المبالغ المستلمة', `${fmt(data.totalReceived)} ر.س`]),
    reshapeRow(['المبالغ المعلقة', `${fmt(data.pendingAmount)} ر.س`]),
  ];

  // بنود السُلف والمرحّل (تظهر فقط إذا > 0)
  const advances = data.paidAdvances ?? 0;
  const cf = data.carryforwardDeducted ?? 0;
  if (advances > 0) {
    bodyRows.push(reshapeRow(['(-) السُلف المصروفة', `(${fmt(advances)}) ر.س`]));
  }
  if (cf > 0) {
    bodyRows.push(reshapeRow(['(-) فروق مرحّلة مخصومة', `(${fmt(cf)}) ر.س`]));
  }
  if (advances > 0 || cf > 0) {
    const net = Math.max(0, data.myShare - advances - cf);
    bodyRows.push(reshapeRow([{ content: rs('صافي المبلغ المستحق'), styles: { fontStyle: 'bold' as const } }, { content: `${fmt(net)} ر.س`, styles: { fontStyle: 'bold' as const } }]));
  }

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البيان', 'القيمة'])],
    body: bodyRows,
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  if (data.distributions.length > 0) {
    const finalY = getLastAutoTableY(doc, 105) + 15;
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(14);
    doc.text(rs('سجل التوزيعات'), 105, finalY, { align: 'center' });

    autoTable(doc, {
      startY: finalY + 8,
      head: [reshapeRow(['التاريخ', 'السنة المالية', 'المبلغ', 'الحالة'])],
      body: data.distributions.map(d => reshapeRow([
        fmtDate(d.date),
        d.fiscalYear,
        `${fmt(d.amount)} ر.س`,
        distributionStatusLabel(d.status),
      ])),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, fontFamily),
      ...baseTableStyles(fontFamily),
    });
  }

  stampAfterContent(doc, fontFamily, waqfInfo);
  finalizePdf(doc, fontFamily, `my-share-${data.beneficiaryName}-${data.fiscalYear || 'all'}.pdf`, waqfInfo);
};

export const generateDisclosurePDF = async (data: {
  fiscalYear: string;
  beneficiaryName: string;
  sharePercentage: number;
  myShare: number;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  adminPct?: number;
  waqifPct?: number;
  beneficiariesShare: number;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  /** التسلسل المعتمد كما في الشاشة — قيم الخادم تمرّ كما هي */
  waqfCorpusPrevious?: number;
  grandTotal?: number;
  netAfterExpenses?: number;
  vatAmount?: number;
  netAfterVat?: number;
  zakatAmount?: number;
  waqfRevenue?: number;
  waqfCorpusManual?: number;
}, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('الإفصاح السنوي'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });

  // Income
  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['المصدر', 'المبلغ (ر.س)'])],
    body: [
      ...Object.entries(data.incomeBySource).map(([source, amount]) => reshapeRow([source, `+${fmt(amount)}`])),
      reshapeRow([{ content: rs('إجمالي الإيرادات'), styles: { fontStyle: 'bold' } }, { content: `+${fmt(data.totalIncome)}`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = getLastAutoTableY(doc, 90) + 10;

  // Expenses
  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['النوع', 'المبلغ (ر.س)'])],
    body: [
      ...Object.entries(data.expensesByType).map(([type, amount]) => reshapeRow([type, `-${fmt(amount)}`])),
      reshapeRow([{ content: rs('إجمالي المصروفات التشغيلية'), styles: { fontStyle: 'bold' } }, { content: `-${fmt(data.totalExpenses)}`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = getLastAutoTableY(doc, 150) + 10;

  // Distribution
  autoTable(doc, {
    startY: y,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: [
      ...buildDisclosureSequenceRows(data).map(r => reshapeRow(r)),
      reshapeRow([{ content: rs('حصتي المستحقة'), styles: { fontStyle: 'bold' } }, { content: `${fmt(data.myShare)} ر.س`, styles: { fontStyle: 'bold' } }]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  stampAfterContent(doc, fontFamily, waqfInfo);
  finalizePdf(doc, fontFamily, `disclosure-${data.fiscalYear}.pdf`, waqfInfo);
};

/** التسلسل المالي للإفصاح بنفس ترتيب الشاشة: المصروفات والضريبة بندان مستقلان بلا دمج */
export const buildDisclosureSequenceRows = (d: {
  totalIncome: number; totalExpenses: number; netRevenue: number;
  adminShare: number; waqifShare: number; adminPct?: number; waqifPct?: number; beneficiariesShare: number;
  waqfCorpusPrevious?: number; grandTotal?: number; netAfterExpenses?: number; vatAmount?: number;
  netAfterVat?: number; zakatAmount?: number; waqfRevenue?: number; waqfCorpusManual?: number;
}): string[][] => {
  const rows: string[][] = [['إجمالي الإيرادات', `+${fmt(d.totalIncome)}`]];
  if ((d.waqfCorpusPrevious ?? 0) > 0) {
    rows.push(['(+) رقبة الوقف المرحّلة من العام السابق', `+${fmt(d.waqfCorpusPrevious ?? 0)}`]);
    if (d.grandTotal !== undefined) rows.push(['الإجمالي الشامل', fmt(d.grandTotal)]);
  }
  rows.push(['(-) المصروفات التشغيلية', `(${fmt(d.totalExpenses)})`]);
  if (d.netAfterExpenses !== undefined) rows.push(['الصافي بعد المصاريف', fmt(d.netAfterExpenses)]);
  if (d.vatAmount !== undefined) rows.push(['(-) ضريبة القيمة المضافة', `(${fmt(d.vatAmount)})`]);
  if (d.netAfterVat !== undefined) rows.push(['الصافي بعد الضريبة', fmt(d.netAfterVat)]);
  if ((d.zakatAmount ?? 0) > 0) rows.push(['(-) الزكاة', `(${fmt(d.zakatAmount ?? 0)})`]);
  rows.push(['صافي الريع', fmt(d.netRevenue)]);
  rows.push([`(-) حصة الناظر (${d.adminPct ?? 10}%)`, `(${fmt(d.adminShare)})`]);
  rows.push([`(-) حصة الواقف (${d.waqifPct ?? 5}%)`, `(${fmt(d.waqifShare)})`]);
  if (d.waqfRevenue !== undefined) rows.push(['ريع الوقف', fmt(d.waqfRevenue)]);
  if ((d.waqfCorpusManual ?? 0) > 0) rows.push(['(-) رقبة الوقف للعام الحالي', `(${fmt(d.waqfCorpusManual ?? 0)})`]);
  rows.push(['المتاح للتوزيع على المستفيدين', fmt(d.beneficiariesShare)]);
  return rows;
};
