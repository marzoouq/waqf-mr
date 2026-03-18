import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';

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
  doc.text(rs('تقرير توزيع الحصص'), 105, startY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(rs(`السنة المالية: ${data.fiscalYearLabel}`), 105, startY + 14, { align: 'center' });

  // ملخص مالي
  const totalAdvances = data.distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = data.distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalNet = data.distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalDeficit = data.distributions.reduce((s, d) => s + d.deficit, 0);

  const summaryRows = [
    reshapeRow(['المبلغ المتاح للتوزيع', `${fmt(data.availableAmount)} ر.س`]),
    reshapeRow(['إجمالي السُلف المخصومة', `(${fmt(totalAdvances)}) ر.س`]),
    reshapeRow(['إجمالي المرحّل المخصوم', `(${fmt(totalCarryforward)}) ر.س`]),
    reshapeRow(['صافي التوزيع الفعلي', `${fmt(totalNet)} ر.س`]),
  ];
  if (totalDeficit > 0) {
    summaryRows.push(reshapeRow(['فروق مرحّلة للسنة القادمة', `${fmt(totalDeficit)} ر.س`]));
  }

  autoTable(doc, {
    startY: startY + 20,
    head: [reshapeRow(['البند', 'المبلغ'])],
    body: summaryRows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  const y = getLastAutoTableY(doc, 80) + 10;

  // جدول التوزيع التفصيلي
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text(rs('تفاصيل التوزيع'), 105, y, { align: 'center' });

  const bodyRows = data.distributions.map(d => reshapeRow([
    d.beneficiary_name,
    `${safeNumber(d.share_percentage).toFixed(6)}%`,
    fmt(d.share_amount),
    d.advances_paid > 0 ? `(${fmt(d.advances_paid)})` : '—',
    d.carryforward_deducted > 0 ? `(${fmt(d.carryforward_deducted)})` : '—',
    fmt(d.net_amount),
    d.deficit > 0 ? fmt(d.deficit) : '—',
  ]));

  const totalShareAmt = data.distributions.reduce((s, d) => s + d.share_amount, 0);

  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المستفيد', 'النسبة', 'الحصة', 'السُلف', 'المرحّل', 'الصافي', 'فرق مرحّل'])],
    body: bodyRows,
    foot: [reshapeRow([
      'الإجمالي', '100%',
      fmt(totalShareAmt),
      totalAdvances > 0 ? `(${fmt(totalAdvances)})` : '—',
      totalCarryforward > 0 ? `(${fmt(totalCarryforward)})` : '—',
      fmt(totalNet),
      totalDeficit > 0 ? fmt(totalDeficit) : '—',
    ])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    didParseCell: (hookData: CellHookData) => {
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
  doc.text(rs('الحسابات الختامية'), 105, startY + 5, { align: 'center' });

  // Contracts
  doc.setFontSize(13);
  doc.text(rs('العقود'), 105, startY + 18, { align: 'center' });
  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['رقم العقد', 'المستأجر', 'الإيجار السنوي', 'الإيجار الشهري'])],
    body: data.contracts.map(c => reshapeRow([
      c.contract_number,
      c.tenant_name,
      fmt(safeNumber(c.rent_amount)),
      fmt(Math.round(safeNumber(c.rent_amount) / 12), 0),
    ])),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = getLastAutoTableY(doc, 90) + 10;

  // Income
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text(rs('الإيرادات'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المصدر', 'المبلغ'])],
    body: Object.entries(data.incomeBySource).map(([s, a]) => reshapeRow([s, `+${fmt(a)}`])),
    foot: [reshapeRow(['الإجمالي', `+${fmt(data.totalIncome)}`])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = getLastAutoTableY(doc, 140) + 10;

  // Expenses
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('المصروفات'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['النوع', 'المبلغ'])],
    body: Object.entries(data.expensesByType).map(([t, a]) => reshapeRow([t, `-${fmt(a)}`])),
    foot: [reshapeRow(['الإجمالي', `-${fmt(data.totalExpenses)}`])],
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

  const distributionRows: (string | number)[][] = [];
  if (corpusPrev > 0) {
    distributionRows.push(['رقبة الوقف المرحلة من العام السابق', `+${fmt(corpusPrev)}`]);
  }
  distributionRows.push(
    ['إجمالي الدخل', `+${fmt(data.totalIncome)}`],
  );
  if (corpusPrev > 0) {
    distributionRows.push(['الإجمالي الشامل', fmt(gt)]);
  }
  distributionRows.push(
    ['(-) المصروفات التشغيلية', `(${fmt(regularExp)})`],
    ['الصافي بعد المصاريف', fmt(netAfterExp)],
    ['(-) ضريبة القيمة المضافة', `(${fmt(data.vatAmount || 0)})`],
    ['الصافي بعد الضريبة', fmt(netAfterVat)],
  );
  // الزكاة تظهر فقط إذا > 0
  if (zakatAmt > 0) {
    distributionRows.push(
      ['(-) الزكاة', `(${fmt(zakatAmt)})`],
      ['الصافي بعد الزكاة', fmt(netAfterZakatVal)],
    );
  }
  distributionRows.push(
    ['(-) حصة الناظر', `(${fmt(data.adminShare)})`],
    [`الباقي بعد حصة الناظر`, fmt(netAfterZakatVal - data.adminShare)],
    ['(-) حصة الواقف', `(${fmt(data.waqifShare)})`],
    ['ريع الوقف (الإجمالي القابل للتوزيع)', fmt(data.waqfRevenue)],
    ['(-) رقبة الوقف للعام الحالي', `(${fmt(data.waqfCorpusManual || 0)})`],
    ['المبلغ المتاح', fmt(avail)],
    ['(-) التوزيعات', `(${fmt(data.distributionsAmount || 0)})`],
    ['الرصيد المتبقي', fmt(remaining)],
  );

  doc.setFont(fontFamily, 'bold');
  doc.text(rs('التوزيع'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['البند', 'المبلغ'])],
    body: distributionRows.map(r => reshapeRow(r)),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = getLastAutoTableY(doc, 240) + 10;

  // Beneficiaries
  const totalBenPct = data.beneficiaries.reduce((s, b) => s + safeNumber(b.share_percentage), 0);
  const distAmount = data.distributionsAmount || 0;
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('حصص المستفيدين'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المستفيد', 'النسبة', 'المبلغ'])],
    body: data.beneficiaries.map(b => reshapeRow([
      b.name,
      `${safeNumber(b.share_percentage).toFixed(6)}%`,
      totalBenPct > 0 ? fmt(distAmount * safeNumber(b.share_percentage) / totalBenPct) : '0',
    ])),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('accounts-report.pdf');
};
