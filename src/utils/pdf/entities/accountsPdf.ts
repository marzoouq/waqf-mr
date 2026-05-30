/**
 * تقرير الحسابات الختامية — PDF
 * Helpers (صفوف التوزيع وصفوف المستفيدين) في accountsPdf.helpers.ts.
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
import { buildDistributionRows, buildBeneficiaryRows } from './accountsPdf.helpers';

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

  const showOrigin = data.fiscalYearStartDate !== null && data.fiscalYearStartDate !== undefined;
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

  // المتأخرات حسب السنة المالية — يظهر فقط عند توفر بداية السنة ووجود متأخرات
  const overduePrev = data.overdueFromPreviousAmount || 0;
  const overdueCur = data.overdueInYearAmount || 0;
  if (showOrigin && (overduePrev > 0 || overdueCur > 0)) {
    doc.setFont(fontFamily, 'bold');
    doc.text(rs('المتأخرات حسب السنة المالية'), 105, y, { align: 'center' });
    autoTable(doc, {
      startY: y + 6,
      head: [reshapeRow(['البند', 'المبلغ'])],
      body: [
        reshapeRow(['من سنوات سابقة', `-${fmt(overduePrev)}`]),
        reshapeRow(['هذه السنة', `-${fmt(overdueCur)}`]),
      ],
      foot: [reshapeRow(['الإجمالي', `-${fmt(overduePrev + overdueCur)}`])],
      theme: 'striped',
      ...headStyles(TABLE_HEAD_RED, fontFamily),
      ...footStyles(TABLE_HEAD_RED, fontFamily),
      ...baseTableStyles(fontFamily),
    });
    y = getLastAutoTableY(doc, y + 30) + 10;
  }


  // التوزيع — التسلسل المالي الهرمي (صفوف مبنية في helper)
  const distributionRows = buildDistributionRows({
    totalIncome: data.totalIncome,
    totalExpenses: data.totalExpenses,
    vatAmount: data.vatAmount,
    zakatAmount: data.zakatAmount,
    netAfterExpenses: data.netAfterExpenses,
    netAfterVat: data.netAfterVat,
    netAfterZakat: data.netAfterZakat,
    adminShare: data.adminShare,
    waqifShare: data.waqifShare,
    waqfRevenue: data.waqfRevenue,
    waqfCorpusManual: data.waqfCorpusManual,
    waqfCorpusPrevious: data.waqfCorpusPrevious,
    grandTotal: data.grandTotal,
    availableAmount: data.availableAmount,
    distributionsAmount: data.distributionsAmount,
    remainingBalance: data.remainingBalance,
  });

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
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('حصص المستفيدين'), 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [reshapeRow(['المستفيد', 'النسبة', 'المبلغ'])],
    body: buildBeneficiaryRows(data.beneficiaries, data.distributionsAmount || 0).map(r => reshapeRow(r)),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  finalizePdf(doc, fontFamily, 'accounts-report.pdf', waqfInfo);
};
