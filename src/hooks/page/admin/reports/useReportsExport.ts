/**
 * useReportsExport — handlers تصدير PDF لصفحة التقارير
 *
 * يفصل المنطق التصديري عن العرض، ويعتمد dynamic import موحَّد لـ @/utils/pdf
 * بحيث لا تُحمَّل وحدة PDF إلا عند أول طلب تصدير.
 */
import type { PdfWaqfInfo } from '@/utils/pdf/core/core';
import { defaultNotify } from '@/lib/notify';

/** مُحمِّل موحد لوحدة PDF — الاستيراد التالي يأتي من cache المتصفح */
const loadPdfModule = () => import('@/utils/pdf');

interface ChartDatum { name?: string; value: number }
interface DistributionDatum { name?: string; percentage?: number; amount: number }

export interface ReportsExportInput {
  pdfWaqfInfo?: PdfWaqfInfo;
  fiscalYearLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusPrevious: number;
  grandTotal: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  waqfCorpusManual: number;
  availableAmount: number;
  distributionsAmount: number;
  remainingBalance: number;
  adminPct: number;
  waqifPct: number;
  incomeSourceData: ChartDatum[];
  expenseTypeData: ChartDatum[];
  distributionData: DistributionDatum[];
  forensicAuditData: Parameters<Awaited<ReturnType<typeof loadPdfModule>>['generateForensicAuditPDF']>[0];
}

export function useReportsExport(input: ReportsExportInput) {
  const handleExportPDF = async () => {
    const { generateAnnualReportPDF } = await loadPdfModule();
    await generateAnnualReportPDF({
      fiscalYear: input.fiscalYearLabel,
      totalIncome: input.totalIncome,
      totalExpenses: input.totalExpenses,
      netRevenue: input.netRevenue,
      adminShare: input.adminShare,
      waqifShare: input.waqifShare,
      waqfRevenue: input.waqfRevenue,
      expensesByType: input.expenseTypeData.map(d => ({ type: d.name ?? '', amount: d.value })),
      incomeBySource: input.incomeSourceData.map(d => ({ source: d.name ?? '', amount: d.value })),
      beneficiaries: input.distributionData.map(d => ({
        name: d.name ?? 'غير معروف',
        percentage: d.percentage ?? 0,
        amount: d.amount,
      })),
    }, input.pdfWaqfInfo);
  };

  const handleExportDisclosure = async () => {
    const { generateAnnualDisclosurePDF } = await loadPdfModule();
    await generateAnnualDisclosurePDF({
      fiscalYear: input.fiscalYearLabel,
      totalIncome: input.totalIncome,
      totalExpenses: input.totalExpenses,
      waqfCorpusPrevious: input.waqfCorpusPrevious,
      grandTotal: input.grandTotal,
      netAfterExpenses: input.netAfterExpenses,
      vatAmount: input.vatAmount,
      netAfterVat: input.netAfterVat,
      zakatAmount: input.zakatAmount,
      netAfterZakat: input.netAfterZakat,
      adminShare: input.adminShare,
      waqifShare: input.waqifShare,
      waqfRevenue: input.waqfRevenue,
      waqfCorpusManual: input.waqfCorpusManual,
      availableAmount: input.availableAmount,
      distributionsAmount: input.distributionsAmount,
      remainingBalance: input.remainingBalance,
      incomeBySource: Object.fromEntries(input.incomeSourceData.map(d => [d.name ?? '', d.value])),
      expensesByType: Object.fromEntries(input.expenseTypeData.map(d => [d.name ?? '', d.value])),
      beneficiaries: input.distributionData.map(d => ({
        name: d.name ?? 'غير معروف',
        share_percentage: d.percentage ?? 0,
        amount: d.amount,
      })),
      adminPct: input.adminPct,
      waqifPct: input.waqifPct,
    }, input.pdfWaqfInfo);
  };

  const handleExportForensic = async () => {
    try {
      const { generateForensicAuditPDF } = await loadPdfModule();
      await generateForensicAuditPDF(input.forensicAuditData, input.pdfWaqfInfo);
      defaultNotify.success('تم تصدير الفحص الجنائي بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير الفحص الجنائي');
    }
  };

  return { handleExportPDF, handleExportDisclosure, handleExportForensic };
}
