/**
 * تقرير الحسابات الختامية — PDF
 */
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_RED, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { safeNumber } from '@/utils/format/safeNumber';
import { fmt } from '@/utils/format/format';

export const generateAccountsPDF = async (data: {
  contracts: Array<{ contract_number: string; tenant_name: string; rent_amount: number; status: string; start_date?: string | null }>;
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
  /** بداية السنة المالية الحالية. null في وضع "كل السنوات" — يُخفي عمود "النوع" وقسم تقسيم المتأخرات. */
  fiscalYearStartDate?: string | null;
  overdueFromPreviousAmount?: number;
  overdueInYearAmount?: number;
}, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  const showOrigin = data.fiscalYearStartDate != null;
  const classifyOrigin = (startDate?: string | null): 'inYear' | 'fromPrevious' | 'unknown' => {
    if (!showOrigin || !startDate) return 'unknown';
    return startDate < (data.fiscalYearStartDate as string) ? 'fromPrevious' : 'inYear';
  };
  const originLabel = (k: ReturnType<typeof classifyOrigin>) =>
    k === 'fromPrevious' ? 'مُرحّل' : k === 'inYear' ? 'جديد' : '—';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('الحسابات الختامية'), 105, startY + 5, { align: 'center' });

  // العقود
  doc.setFontSize(13);
  doc.text(rs('العقود'), 105, startY + 18, { align: 'center' });
  const contractHead = showOrigin
    ? ['رقم العقد', 'المستأجر', 'النوع', 'الإيجار السنوي', 'الإيجار الشهري']
    : ['رقم العقد', 'المستأجر', 'الإيجار السنوي', 'الإيجار الشهري'];
  let countInYear = 0, countFromPrevious = 0;
  const contractBody = data.contracts.map(c => {
    const origin = classifyOrigin(c.start_date);
    if (origin === 'inYear') countInYear++;
    else if (origin === 'fromPrevious') countFromPrevious++;
    const monthly = fmt(Math.round(safeNumber(c.rent_amount) / 12), 0);
    const annual = fmt(safeNumber(c.rent_amount));
    return reshapeRow(
      showOrigin
        ? [c.contract_number, c.tenant_name, originLabel(origin), annual, monthly]
        : [c.contract_number, c.tenant_name, annual, monthly],
    );
  });
  const contractFoot = showOrigin
    ? [reshapeRow(['الإجمالي', `${data.contracts.length} عقد`, `مُرحّل: ${countFromPrevious} / جديد: ${countInYear}`, '', ''])]
    : [reshapeRow(['الإجمالي', `${data.contracts.length} عقد`, '', ''])];
  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(contractHead)],
    body: contractBody,
    foot: contractFoot,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = getLastAutoTableY(doc, 90) + 10;

  // الإيرادات
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

  // المصروفات
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

  // التوزيع — التسلسل المالي الهرمي
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
  distributionRows.push(['إجمالي الدخل', `+${fmt(data.totalIncome)}`]);
  if (corpusPrev > 0) {
    distributionRows.push(['الإجمالي الشامل', fmt(gt)]);
  }
  distributionRows.push(
    ['(-) المصروفات التشغيلية', `(${fmt(regularExp)})`],
    ['الصافي بعد المصاريف', fmt(netAfterExp)],
    ['(-) ضريبة القيمة المضافة', `(${fmt(data.vatAmount || 0)})`],
    ['الصافي بعد الضريبة', fmt(netAfterVat)],
  );
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

  // حصص المستفيدين
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

  finalizePdf(doc, fontFamily, 'accounts-report.pdf', waqfInfo);
};
