import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
} from './core';

export const generateAccountsPDF = async (data: {
  contracts: Array<{ contract_number: string; tenant_name: string; rent_amount: number; status: string }>;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  beneficiaries: Array<{ name: string; share_percentage: number }>;
  vatAmount?: number;
  distributionsAmount?: number;
  waqfCapital?: number;
  zakatAmount?: number;
  netAfterZakat?: number;
  waqfCorpusPrevious?: number;
  grandTotal?: number;
  netAfterExpenses?: number;
  netAfterVat?: number;
  availableAmount?: number;
  remainingBalance?: number;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('الحسابات الختامية', 105, startY + 5, { align: 'center' });

  // Contracts
  doc.setFontSize(13);
  doc.text('العقود', 105, startY + 18, { align: 'center' });
  autoTable(doc, {
    startY: startY + 24,
    head: [['رقم العقد', 'المستأجر', 'الإيجار السنوي', 'الإيجار الشهري']],
    body: data.contracts.map(c => [
      c.contract_number,
      c.tenant_name,
      `${Number(c.rent_amount).toLocaleString()}`,
      `${Math.round(Number(c.rent_amount) / 12).toLocaleString()}`,
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90) + 10;

  // Income
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text('الإيرادات', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['المصدر', 'المبلغ']],
    body: Object.entries(data.incomeBySource).map(([s, a]) => [s, `+${a.toLocaleString()}`]),
    foot: [['الإجمالي', `+${data.totalIncome.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140) + 10;

  // Expenses
  doc.setFont(fontFamily, 'bold');
  doc.text('المصروفات', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['النوع', 'المبلغ']],
    body: Object.entries(data.expensesByType).map(([t, a]) => [t, `-${a.toLocaleString()}`]),
    foot: [['الإجمالي', `-${data.totalExpenses.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 190) + 10;

  // Distribution - Full hierarchical sequence
  const corpusPrev = data.waqfCorpusPrevious || 0;
  const gt = data.grandTotal || (data.totalIncome + corpusPrev);
  const regularExp = data.totalExpenses;
  const netAfterExp = data.netAfterExpenses ?? (gt - regularExp);
  const netAfterVat = data.netAfterVat ?? (netAfterExp - (data.vatAmount || 0));
  const zakatAmt = data.zakatAmount || 0;
  const netAfterZakatVal = data.netAfterZakat || (netAfterVat - zakatAmt);
  const avail = data.availableAmount ?? (data.waqfRevenue - (data.waqfCapital || 0));
  const remaining = data.remainingBalance ?? (avail - (data.distributionsAmount || 0));

  const distributionRows: string[][] = [];
  if (corpusPrev > 0) {
    distributionRows.push(['رقبة الوقف المرحلة من العام السابق', `+${corpusPrev.toLocaleString()}`]);
  }
  distributionRows.push(
    ['إجمالي الدخل', `+${data.totalIncome.toLocaleString()}`],
  );
  if (corpusPrev > 0) {
    distributionRows.push(['الإجمالي الشامل', gt.toLocaleString()]);
  }
  distributionRows.push(
    ['(-) المصروفات التشغيلية', `(${regularExp.toLocaleString()})`],
    ['الصافي بعد المصاريف', netAfterExp.toLocaleString()],
    ['(-) ضريبة القيمة المضافة', `(${(data.vatAmount || 0).toLocaleString()})`],
    ['الصافي بعد الضريبة', netAfterVat.toLocaleString()],
    ['(-) الزكاة', `(${zakatAmt.toLocaleString()})`],
    ['الصافي بعد الزكاة', netAfterZakatVal.toLocaleString()],
    ['(-) حصة الناظر', `(${data.adminShare.toLocaleString()})`],
    [`الباقي بعد حصة الناظر`, `${(netAfterZakatVal - data.adminShare).toLocaleString()}`],
    ['(-) حصة الواقف', `(${data.waqifShare.toLocaleString()})`],
    ['ريع الوقف (الإجمالي القابل للتوزيع)', data.waqfRevenue.toLocaleString()],
    ['(-) رقبة الوقف للعام الحالي', `(${(data.waqfCapital || 0).toLocaleString()})`],
    ['المبلغ المتاح', avail.toLocaleString()],
    ['(-) التوزيعات', `(${(data.distributionsAmount || 0).toLocaleString()})`],
    ['الرصيد المتبقي', remaining.toLocaleString()],
  );

  doc.setFont(fontFamily, 'bold');
  doc.text('التوزيع', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['البند', 'المبلغ']],
    body: distributionRows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 240) + 10;

  // Beneficiaries
  const totalBenPct = data.beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);
  const distAmount = data.distributionsAmount || 0;
  doc.setFont(fontFamily, 'bold');
  doc.text('حصص المستفيدين', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['المستفيد', 'النسبة', 'المبلغ']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${Number(b.share_percentage).toFixed(6)}%`,
      totalBenPct > 0 ? (distAmount * Number(b.share_percentage) / totalBenPct).toLocaleString() : '0',
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('accounts-report.pdf');
};
