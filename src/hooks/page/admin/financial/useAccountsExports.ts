/**
 * معالجات التصدير (CSV + PDF) لصفحة الحسابات.
 * مستخرج من useAccountsPage للحفاظ على حد 200 سطر.
 */
import { useCallback } from 'react';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { uiNotify } from '@/lib/notify';

interface ExportsInput {
  fiscalYearLabel: string;
  fiscalYearShortLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  grandTotal: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  availableAmount: number;
  remainingBalance: number;
  manualVat: number;
  zakatAmount: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  manualDistributions: number;
  adminPercent: number;
  waqifPercent: number;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  beneficiaries: Array<{ name?: string | null; share_percentage?: number | null }>;
  totalBenPct: number;
}

export function useAccountsExports(input: ExportsInput) {
  const pdfWaqfInfo = usePdfWaqfInfo();

  const handleExportCsv = useCallback(() => {
    const csv = buildCsv([{
      'السنة المالية': input.fiscalYearShortLabel || '-',
      'إجمالي الإيرادات': input.totalIncome,
      'إجمالي المصروفات': input.totalExpenses,
      'صافي بعد المصروفات': input.netAfterExpenses,
      'الضريبة': input.manualVat,
      'الزكاة': input.zakatAmount,
      'حصة الناظر': input.adminShare,
      'حصة الواقف': input.waqifShare,
      'ريع الوقف': input.waqfRevenue,
      'رقبة الوقف': input.waqfCorpusManual,
      'المتاح للتوزيع': input.availableAmount,
    }]);
    downloadCsv(csv, `حسابات-${input.fiscalYearShortLabel || 'عام'}.csv`);
  }, [input]);

  const handleExportDisclosurePdf = useCallback(async () => {
    try {
      const { generateAnnualDisclosurePDF } = await import('@/utils/pdf');
      await generateAnnualDisclosurePDF({
        fiscalYear: input.fiscalYearLabel,
        totalIncome: input.totalIncome,
        totalExpenses: input.totalExpenses,
        waqfCorpusPrevious: input.waqfCorpusPrevious,
        grandTotal: input.grandTotal,
        netAfterExpenses: input.netAfterExpenses,
        vatAmount: input.manualVat,
        netAfterVat: input.netAfterVat,
        zakatAmount: input.zakatAmount,
        netAfterZakat: input.netAfterZakat,
        adminShare: input.adminShare,
        waqifShare: input.waqifShare,
        waqfRevenue: input.waqfRevenue,
        waqfCorpusManual: input.waqfCorpusManual,
        availableAmount: input.availableAmount,
        distributionsAmount: input.manualDistributions,
        remainingBalance: input.remainingBalance,
        incomeBySource: input.incomeBySource,
        expensesByType: input.expensesByType,
        beneficiaries: input.beneficiaries.map(b => ({
          name: b.name ?? 'غير معروف',
          share_percentage: Number(b.share_percentage ?? 0),
          amount: input.totalBenPct > 0
            ? (input.availableAmount * Number(b.share_percentage ?? 0)) / input.totalBenPct
            : 0,
        })),
        adminPct: input.adminPercent,
        waqifPct: input.waqifPercent,
      }, pdfWaqfInfo);
      uiNotify.success('تم تصدير الإفصاح السنوي');
    } catch {
      uiNotify.error('تعذّر تصدير الإفصاح السنوي');
    }
  }, [input, pdfWaqfInfo]);

  const handleExportDistributionPdf = useCallback(async () => {
    try {
      const { generateDistributionsPDF } = await import('@/utils/pdf');
      const distributions = input.beneficiaries.map(b => {
        const pct = Number(b.share_percentage ?? 0);
        const amount = input.totalBenPct > 0
          ? (input.availableAmount * pct) / input.totalBenPct
          : 0;
        return {
          beneficiary_name: b.name ?? 'غير معروف',
          share_percentage: pct,
          share_amount: amount,
          advances_paid: 0,
          carryforward_deducted: 0,
          net_amount: amount,
          deficit: 0,
        };
      });
      await generateDistributionsPDF({
        fiscalYearLabel: input.fiscalYearLabel,
        availableAmount: input.availableAmount,
        distributions,
      }, pdfWaqfInfo);
      uiNotify.success('تم تصدير تقرير توزيع الحصص');
    } catch {
      uiNotify.error('تعذّر تصدير تقرير توزيع الحصص');
    }
  }, [input, pdfWaqfInfo]);

  return { handleExportCsv, handleExportDisclosurePdf, handleExportDistributionPdf };
}
