import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
} from './core';

interface ReportData {
  fiscalYear: string;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
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
  doc.text('تقرير الوقف السنوي', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [['البند', 'المبلغ (ر.س)']],
    body: [
      [{ content: '-- الإيرادات --', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 252, 231] } }],
      ...data.incomeBySource.map(i => [`  ${i.source}`, `+${i.amount.toLocaleString()}`]),
      [{ content: 'إجمالي الإيرادات', styles: { fontStyle: 'bold' } }, { content: `+${data.totalIncome.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      [{ content: '-- المصروفات --', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226] } }],
      ...data.expensesByType.map(e => [`  ${e.type}`, `-${e.amount.toLocaleString()}`]),
      [{ content: 'إجمالي المصروفات', styles: { fontStyle: 'bold' } }, { content: `(${data.totalExpenses.toLocaleString()})`, styles: { fontStyle: 'bold' } }],
      ['صافي الريع', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%)', data.adminShare.toLocaleString()],
      ['حصة الواقف (5%)', data.waqifShare.toLocaleString()],
      ['ريع المستفيدين', data.waqfRevenue.toLocaleString()],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

  doc.setFontSize(14);
  doc.setFont(fontFamily, 'bold');
  doc.text('توزيع حصص المستفيدين', 105, finalY + 15, { align: 'center' });

  autoTable(doc, {
    startY: finalY + 22,
    head: [['اسم المستفيد', 'النسبة %', 'المبلغ (ر.س)']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${b.percentage}%`,
      b.amount.toLocaleString(),
    ]),
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
  doc.text('كشف حساب المستفيد', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${fiscalYear}`, 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [['البيان', 'القيمة']],
    body: [
      ['اسم المستفيد', beneficiaryName],
      ['نسبة الحصة', `${sharePercentage}%`],
      ['مبلغ الحصة', `${shareAmount.toLocaleString()} ر.س`],
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
  doc.text('الإفصاح السنوي الشامل', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, startY + 16, { align: 'center' });

  // 1. Full Financial Hierarchy
  const hierarchyRows: string[][] = [];
  if (data.waqfCorpusPrevious > 0) {
    hierarchyRows.push(['رقبة الوقف المرحلة من العام السابق', `+${data.waqfCorpusPrevious.toLocaleString()}`]);
  }
  hierarchyRows.push(
    ['إجمالي الإيرادات', `+${data.totalIncome.toLocaleString()}`],
  );
  if (data.waqfCorpusPrevious > 0) {
    hierarchyRows.push(['الإجمالي الشامل', data.grandTotal.toLocaleString()]);
  }
  hierarchyRows.push(
    ['(-) المصروفات التشغيلية', `(${data.totalExpenses.toLocaleString()})`],
    ['الصافي بعد المصاريف', data.netAfterExpenses.toLocaleString()],
    ['(-) ضريبة القيمة المضافة', `(${data.vatAmount.toLocaleString()})`],
    ['الصافي بعد الضريبة', data.netAfterVat.toLocaleString()],
  );
  if (data.zakatAmount > 0) {
    hierarchyRows.push(
      ['(-) الزكاة', `(${data.zakatAmount.toLocaleString()})`],
      ['الصافي بعد الزكاة', data.netAfterZakat.toLocaleString()],
    );
  }
  hierarchyRows.push(
    [`(-) حصة الناظر (${data.adminPct}%)`, `(${data.adminShare.toLocaleString()})`],
    [`(-) حصة الواقف (${data.waqifPct}%)`, `(${data.waqifShare.toLocaleString()})`],
    ['ريع الوقف', data.waqfRevenue.toLocaleString()],
  );
  if (data.waqfCorpusManual > 0) {
    hierarchyRows.push(['(-) رقبة الوقف للعام الحالي', `(${data.waqfCorpusManual.toLocaleString()})`]);
  }
  hierarchyRows.push(
    ['المبلغ المتاح للتوزيع', data.availableAmount.toLocaleString()],
    ['(-) التوزيعات الفعلية', `(${data.distributionsAmount.toLocaleString()})`],
    ['الرصيد المتبقي', data.remainingBalance.toLocaleString()],
  );

  autoTable(doc, {
    startY: startY + 24,
    head: [['البند', 'المبلغ (ر.س)']],
    body: hierarchyRows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 138) + 12;

  // 2. Income by source
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text('تفصيل الإيرادات حسب المصدر', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['المصدر', 'المبلغ (ر.س)']],
    body: Object.entries(data.incomeBySource).map(([s, a]) => [s, `+${a.toLocaleString()}`]),
    foot: [['الإجمالي', `+${data.totalIncome.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 188) + 12;

  // 3. Expenses by type
  doc.setFont(fontFamily, 'bold');
  doc.text('تفصيل المصروفات حسب النوع', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['النوع', 'المبلغ (ر.س)']],
    body: Object.entries(data.expensesByType).map(([t, a]) => [t, `-${a.toLocaleString()}`]),
    foot: [['الإجمالي', `-${data.totalExpenses.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 238) + 12;

  // 4. Beneficiary distributions
  const totalBenPct = data.beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);
  const totalBenAmt = data.beneficiaries.reduce((s, b) => s + Number(b.amount), 0);
  doc.setFont(fontFamily, 'bold');
  doc.text('التوزيعات الفعلية للمستفيدين', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['المستفيد', 'النسبة %', 'المبلغ (ر.س)']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${Number(b.share_percentage).toFixed(6)}%`,
      b.amount.toLocaleString(),
    ]),
    foot: [['الإجمالي', `${totalBenPct.toFixed(6)}%`, totalBenAmt.toLocaleString()]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`annual-disclosure-${data.fiscalYear}.pdf`);
};
