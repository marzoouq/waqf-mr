/**
 * هوك صفحة التقارير المالية للمستفيد — محسّن: يستخدم useBeneficiaryFinancials المشترك
 */
import { useMemo, useCallback } from 'react';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { useBeneficiaryFinancials } from '@/hooks/page/beneficiary/useBeneficiaryFinancials';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { defaultNotify } from '@/lib/notify';
import { buildMonthlyData } from '@/utils/financial/buildMonthlyData';


export const useFinancialReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const handleRetry = useRetryQueries(['beneficiary-dashboard']);

  const { data: dashData, isLoading, isError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  // هوك مشترك (#1)
  const fin = useBeneficiaryFinancials(dashData, fiscalYearId);

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

  const monthlyData = useMemo(() => {
    const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return (dashData?.monthly_income ?? [])
      .map(item => {
        const fy = dashData?.fiscal_year;
        const year = fy?.start_date?.substring(0, 4) || '';
        const monthStr = monthNames[item.month - 1] || String(item.month).padStart(2, '0');
        return { month: `${year}-${monthStr}`, income: safeNumber(item.total) };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [dashData?.monthly_income, dashData?.fiscal_year]);

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
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [fiscalYear, fin, currentBeneficiary, myShare, pdfWaqfInfo]);

  return {
    isLoading, isError, handleRetry,
    isAccountMissing: fin.isAccountMissing, selectedFY, currentBeneficiary,
    incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
    handleDownloadPDF,
  };
};
