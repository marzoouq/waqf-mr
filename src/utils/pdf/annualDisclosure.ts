// autoTable يُحمّل ديناميكياً
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';

export const generateAnnualDisclosurePDF = async (data: {
  fiscalYear: string;
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  grandTotal: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  availableAmount: number;
  distributionsAmount: number;
  remainingBalance: number;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  beneficiaries: Array<{ name: string; share_percentage: number; amount: number }>;
  adminPct: number;
  waqifPct: number;
}, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('الإفصاح السنوي الشامل'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });

  // 1. التسلسل المالي الكامل
  const hierarchyRows: (string | number)[][] = [];
  if (data.waqfCorpusPrevious > 0) {
    hierarchyRows.push(['رقبة الوقف المرحلة من العام السابق', `+${fmt(data.waqfCorpusPrevious)}`]);
  }
  hierarchyRows.push(['إجمالي الإيرادات', `+${fmt(data.totalIncome)}`]);
  if (data.waqfCorpusPrevious > 0) {
    hierarchyRows.push(['الإجمالي الشامل', fmt(data.grandTotal)]);
  }
  hierarchyRows.push(
    ['(-) المصروفات التشغيلية', `(${fmt(data.totalExpenses)})`],
    ['الصافي بعد المصاريف', fmt(data.netAfterExpenses)],
    ['(-) ضريبة القيمة المضافة', `(${fmt(data.vatAmount)})`],
    ['الصافي بعد الضريبة', fmt(data.netAfterVat)],
  );
  if (data.zakatAmount > 0) {
    hierarchyRows.push(
      ['(-) الزكاة', `(${fmt(data.zakatAmount)})`],
      ['الصافي بعد الزكاة', fmt(data.netAfterZakat)],
    );
  }
  hierarchyRows.push(
    [`(-) حصة الناظر (${data.adminPct}%)`, `(${fmt(data.adminShare)})`],
    [`(-) حصة الواقف (${data.waqifPct}%)`, `(${fmt(data.waqifShare)})`],
    ['ريع الوقف', fmt(data.waqfRevenue)],
  );
  if (data.waqfCorpusManual > 0) {
    hierarchyRows.push(['(-) رقبة الوقف للعام الحالي', `(${fmt(data.waqfCorpusManual)})`]);
  }
  hierarchyRows.push(
    ['المبلغ المتاح للتوزيع', fmt(data.availableAmount)],
    ['(-) التوزيعات الفعلية', `(${fmt(data.distributionsAmount)})`],
    ['الرصيد المتبقي', fmt(data.remainingBalance)],
  );

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البند', 'المبلغ (ر.س)'])],
    body: hierarchyRows.map(r => reshapeRow(r)),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = getLastAutoTableY(doc, 138) + 12;

  // 2. الإيرادات حسب المصدر
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text(rs('تفصيل الإيرادات حسب المصدر'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المصدر', 'المبلغ (ر.س)'])],
    body: Object.entries(data.incomeBySource).map(([s, a]) => reshapeRow([s, `+${fmt(a)}`])),
    foot: [reshapeRow(['الإجمالي', `+${fmt(data.totalIncome)}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = getLastAutoTableY(doc, 188) + 12;

  // 3. المصروفات حسب النوع
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('تفصيل المصروفات حسب النوع'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['النوع', 'المبلغ (ر.س)'])],
    body: Object.entries(data.expensesByType).map(([t, a]) => reshapeRow([t, `-${fmt(a)}`])),
    foot: [reshapeRow(['الإجمالي', `-${fmt(data.totalExpenses)}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = getLastAutoTableY(doc, 238) + 12;

  // 4. التوزيعات الفعلية
  const totalBenPct = data.beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);
  const totalBenAmt = data.beneficiaries.reduce((s, b) => s + Number(b.amount), 0);
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('التوزيعات الفعلية للمستفيدين'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المستفيد', 'النسبة %', 'المبلغ (ر.س)'])],
    body: data.beneficiaries.map(b => reshapeRow([
      b.name,
      `${Number(b.share_percentage).toFixed(6)}%`,
      fmt(b.amount),
    ])),
    foot: [reshapeRow(['الإجمالي', `${totalBenPct.toFixed(6)}%`, fmt(totalBenAmt)])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  finalizePdf(doc, fontFamily, `annual-disclosure-${data.fiscalYear}.pdf`, waqfInfo);
};
