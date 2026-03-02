import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';

/* ───── تقرير توزيع الحصص ───── */
export const generateDistributionsPDF = async (data: {
  fiscalYearLabel: string;
  availableAmount: number;
  distributions: Array<{
    beneficiary_name: string;
    share_percentage: number;
    share_amount: number;
    advances_paid: number;
    carryforward_deducted: number;
    net_amount: number;
    deficit: number;
  }>;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير توزيع الحصص', 105, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`السنة المالية: ${data.fiscalYearLabel}`, 105, startY + 14, { align: 'center' });

  // ملخص مالي
  const totalAdvances = data.distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = data.distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalNet = data.distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalDeficit = data.distributions.reduce((s, d) => s + d.deficit, 0);

  const summaryRows = [
    ['المبلغ المتاح للتوزيع', `${data.availableAmount.toLocaleString()} ر.س`],
    ['إجمالي السُلف المخصومة', `(${totalAdvances.toLocaleString()}) ر.س`],
    ['إجمالي المرحّل المخصوم', `(${totalCarryforward.toLocaleString()}) ر.س`],
    ['صافي التوزيع الفعلي', `${totalNet.toLocaleString()} ر.س`],
  ];
  if (totalDeficit > 0) {
    summaryRows.push(['فروق مرحّلة للسنة القادمة', `${totalDeficit.toLocaleString()} ر.س`]);
  }

  autoTable(doc, {
    startY: startY + 20,
    head: [['البند', 'المبلغ']],
    body: summaryRows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = getLastAutoTableY(doc, 80) + 10;

  // جدول التوزيع التفصيلي
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text('تفاصيل التوزيع', 105, y, { align: 'center' });

  const bodyRows = data.distributions.map(d => [
    d.beneficiary_name,
    `${Number(d.share_percentage).toFixed(6)}%`,
    d.share_amount.toLocaleString(),
    d.advances_paid > 0 ? `(${d.advances_paid.toLocaleString()})` : '—',
    d.carryforward_deducted > 0 ? `(${d.carryforward_deducted.toLocaleString()})` : '—',
    d.net_amount.toLocaleString(),
    d.deficit > 0 ? d.deficit.toLocaleString() : '—',
  ]);

  const totalShareAmt = data.distributions.reduce((s, d) => s + d.share_amount, 0);

  autoTable(doc, {
    startY: y + 6,
    head: [['المستفيد', 'النسبة', 'الحصة', 'السُلف', 'المرحّل', 'الصافي', 'فرق مرحّل']],
    body: bodyRows,
    foot: [[
      'الإجمالي', '100%',
      totalShareAmt.toLocaleString(),
      totalAdvances > 0 ? `(${totalAdvances.toLocaleString()})` : '—',
      totalCarryforward > 0 ? `(${totalCarryforward.toLocaleString()})` : '—',
      totalNet.toLocaleString(),
      totalDeficit > 0 ? totalDeficit.toLocaleString() : '—',
    ]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body') {
        const deficit = data.distributions[hookData.row.index]?.deficit ?? 0;
        if (deficit > 0) {
          hookData.cell.styles.fillColor = [255, 240, 240];
        }
      }
    },
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`distributions-report-${data.fiscalYearLabel}.pdf`);
};

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
  waqfCorpusManual?: number;
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

  let y = getLastAutoTableY(doc, 90) + 10;

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

  y = getLastAutoTableY(doc, 140) + 10;

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

  y = getLastAutoTableY(doc, 190) + 10;

  // Distribution - Full hierarchical sequence
  const corpusPrev = data.waqfCorpusPrevious || 0;
  const gt = data.grandTotal || (data.totalIncome + corpusPrev);
  const regularExp = data.totalExpenses;
  const netAfterExp = data.netAfterExpenses ?? (gt - regularExp);
  const netAfterVat = data.netAfterVat ?? (netAfterExp - (data.vatAmount || 0));
  const zakatAmt = data.zakatAmount || 0;
  const netAfterZakatVal = data.netAfterZakat || (netAfterVat - zakatAmt);
  const avail = data.availableAmount ?? (data.waqfRevenue - (data.waqfCorpusManual || 0));
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
    ['(-) رقبة الوقف للعام الحالي', `(${(data.waqfCorpusManual || 0).toLocaleString()})`],
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

  y = getLastAutoTableY(doc, 240) + 10;

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
