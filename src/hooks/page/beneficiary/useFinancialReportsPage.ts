/**
 * هوك صفحة التقارير المالية للمستفيد — يستخرج البيانات والحسابات
 */
import { useMemo, useCallback } from 'react';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { toast } from 'sonner';

export const useFinancialReportsPage = () => {
  const queryClient = useQueryClient();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  }, [queryClient]);

  const {
    income, beneficiaries, currentAccount, isAccountMissing,
    totalIncome, totalExpenses, netAfterZakat, adminShare, waqifShare, waqfRevenue,
    availableAmount, incomeBySource, expensesByTypeExcludingVat,
    isLoading, isError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { data: dashData } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );
  const { currentBeneficiary, myShare } = useMyShare({
    beneficiaries, availableAmount, serverMyShare: dashData?.my_share,
  });
  const beneficiariesShare = availableAmount;

  const incomeVsExpenses = useMemo(() => [
    { name: 'الإيرادات', value: totalIncome, fill: 'hsl(var(--success))' },
    { name: 'المصروفات', value: totalExpenses, fill: 'hsl(var(--destructive))' },
  ], [totalIncome, totalExpenses]);

  const expensesPieData = useMemo(() => Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value })), [expensesByTypeExcludingVat]);
  const incomePieData = useMemo(() => Object.entries(incomeBySource).map(([name, value]) => ({ name, value })), [incomeBySource]);

  const distributionData = useMemo(() => [
    { name: 'حصتي', value: myShare, fill: 'hsl(var(--primary))' },
    { name: 'باقي المستفيدين', value: Math.max(0, beneficiariesShare - myShare), fill: 'hsl(var(--info))' },
  ], [myShare, beneficiariesShare]);

  const fiscalYear = currentAccount?.fiscal_year || selectedFY?.label || '';

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    income.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) {
        months[month] = (months[month] || 0) + Number(item.amount);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, income: total }));
  }, [income]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      const { generateAnnualReportPDF } = await import('@/utils/pdf');
      await generateAnnualReportPDF({
        fiscalYear,
        totalIncome, totalExpenses,
        netRevenue: netAfterZakat, adminShare, waqifShare, waqfRevenue,
        expensesByType: Object.entries(expensesByTypeExcludingVat).map(([type, amount]) => ({ type, amount })),
        incomeBySource: Object.entries(incomeBySource).map(([source, amount]) => ({ source, amount })),
        beneficiaries: currentBeneficiary ? [{
          name: currentBeneficiary.name ?? 'غير معروف',
          percentage: Number(currentBeneficiary.share_percentage ?? 0),
          amount: myShare,
        }] : [],
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [fiscalYear, totalIncome, totalExpenses, netAfterZakat, adminShare, waqifShare, waqfRevenue, expensesByTypeExcludingVat, incomeBySource, currentBeneficiary, myShare, pdfWaqfInfo]);

  return {
    isLoading, isError, handleRetry,
    isAccountMissing, selectedFY, currentBeneficiary,
    incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
    handleDownloadPDF,
  };
};
