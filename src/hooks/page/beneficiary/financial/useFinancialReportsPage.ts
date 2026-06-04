/**
 * هوك صفحة التقارير المالية للمستفيد — محسّن: يستخدم useEndUserFinancials المشترك
 */
import { useMemo, useCallback } from 'react';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyShare } from '@/hooks/domain/financial/useMyShare';
import { useEndUserDashboardData } from '@/hooks/application/dashboard/useEndUserDashboardData';
import { useEndUserFinancials } from '@/hooks/application/dashboard/useEndUserFinancials';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { uiNotify } from '@/lib/notify';
import { buildMonthlyData } from '@/utils/financial/buildMonthlyData';


export const useFinancialReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const handleRetry = useRetryQueries(['beneficiary-dashboard']);

  // Realtime: تحديث فوري للتقارير المالية عند تعديل البيانات الإدارية
  useDashboardRealtime(
    'financial-reports-realtime',
    ['income', 'expenses', 'accounts', 'distributions', 'payment_invoices', 'fiscal_years'],
    true,
    [['financial-reports'], ['beneficiary-dashboard']],
  );

  const { data: dashData, isLoading, isError } = useEndUserDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  // هوك مشترك (#1)
  const fin = useEndUserFinancials(dashData, fiscalYearId);

  const { currentBeneficiary, myShare } = useMyShare({
    beneficiaries: fin.beneficiaries as Array<{ id: string; name: string; share_percentage: number; user_id?: string | null }>,
    availableAmount: fin.availableAmount,
    serverMyShare: dashData?.my_share,
  });
  const beneficiariesShare = fin.availableAmount;

  const incomeVsExpenses = useMemo(() => [
    { name: 'الإيرادات', value: fin.totalIncome, fill: 'hsl(var(--success))' },
    { name: 'المصروفات', value: fin.totalExpenses, fill: 'hsl(var(--destructive))' },
  ], [fin.totalIncome, fin.totalExpenses]);

  const expensesPieData = useMemo(() => Object.entries(fin.expensesByTypeExcludingVat).map(([name, value]) => ({ name, value })), [fin.expensesByTypeExcludingVat]);
  const incomePieData = useMemo(() => Object.entries(fin.incomeBySource).map(([name, value]) => ({ name, value })), [fin.incomeBySource]);

  const distributionData = useMemo(() => [
    { name: 'حصتي', value: myShare, fill: 'hsl(var(--primary))' },
    { name: 'باقي المستفيدين', value: Math.max(0, beneficiariesShare - myShare), fill: 'hsl(var(--info))' },
  ], [myShare, beneficiariesShare]);

  const fiscalYear = selectedFY?.label || '';

  const monthlyData = useMemo(
    () => buildMonthlyData(dashData?.monthly_income ?? [], dashData?.monthly_expenses ?? []),
    [dashData?.monthly_income, dashData?.monthly_expenses],
  );

  const handleDownloadPDF = useCallback(async () => {
    try {
      const { generateAnnualReportPDF } = await import('@/utils/pdf');
      await generateAnnualReportPDF({
        fiscalYear,
        totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
        netRevenue: fin.netAfterZakat, adminShare: fin.adminShare, waqifShare: fin.waqifShare,
        waqfRevenue: fin.waqfRevenue,
        expensesByType: Object.entries(fin.expensesByTypeExcludingVat).map(([type, amount]) => ({ type, amount })),
        incomeBySource: Object.entries(fin.incomeBySource).map(([source, amount]) => ({ source, amount })),
        beneficiaries: currentBeneficiary ? [{
          name: currentBeneficiary.name ?? 'غير معروف',
          percentage: Number(currentBeneficiary.share_percentage ?? 0),
          amount: myShare,
        }] : [],
      }, pdfWaqfInfo);
      uiNotify.success(PDF_MESSAGES.downloadSuccess);
    } catch {
      uiNotify.error(PDF_MESSAGES.exportError);
    }
  }, [fiscalYear, fin, currentBeneficiary, myShare, pdfWaqfInfo]);

  return {
    isLoading, isError, handleRetry,
    isAccountMissing: fin.isAccountMissing, selectedFY, currentBeneficiary,
    incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
    handleDownloadPDF,
  };
};
