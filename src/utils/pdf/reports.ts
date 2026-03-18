import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';


interface ReportData {
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
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

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

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`waqf-report-${data.fiscalYear}.pdf`);
};

export const generateBeneficiaryStatementPDF = async (beneficiaryName: string, sharePercentage: number, shareAmount: number, fiscalYear: string, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('كشف حساب المستفيد'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${fiscalYear}`), 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البيان', 'القيمة'])],
    body: [
      reshapeRow(['اسم المستفيد', beneficiaryName]),
      reshapeRow(['نسبة الحصة', `${sharePercentage}%`]),
      reshapeRow(['مبلغ الحصة', `${fmt(shareAmount)} ر.س`]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`statement-${beneficiaryName}-${fiscalYear}.pdf`);
};

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
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('الإفصاح السنوي الشامل'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${data.fiscalYear}`), 105, startY + 16, { align: 'center' });

  // 1. Full Financial Hierarchy
  const hierarchyRows: (string | number)[][] = [];
  if (data.waqfCorpusPrevious > 0) {
    hierarchyRows.push(['رقبة الوقف المرحلة من العام السابق', `+${fmt(data.waqfCorpusPrevious)}`]);
  }
  hierarchyRows.push(
    ['إجمالي الإيرادات', `+${fmt(data.totalIncome)}`],
  );
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

  // 2. Income by source
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

  // 3. Expenses by type
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

  // 4. Beneficiary distributions
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

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`annual-disclosure-${data.fiscalYear}.pdf`);
};
