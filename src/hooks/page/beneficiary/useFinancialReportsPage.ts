/**
 * هوك صفحة التقارير المالية للمستفيد — محسّن: يعتمد على RPC المستفيد
 */
import { useMemo, useCallback } from 'react';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { defaultNotify } from '@/lib/notify';
import { safeNumber } from '@/utils/format/safeNumber';
import { toSourceRecord, toExpenseRecord } from '@/utils/financial/recordConverters';

/** تحويل مصفوفة source/total إلى Record */
function toSourceRecord(arr: Array<{ source: string; total: number }>): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const item of arr) rec[item.source] = safeNumber(item.total);
  return rec;
}

/** تحويل مصفوفة expense_type/total إلى Record */
function toExpenseRecord(arr: Array<{ expense_type: string; total: number }>): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const item of arr) rec[item.expense_type] = safeNumber(item.total);
  return rec;
}

export const useFinancialReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const handleRetry = useRetryQueries(['beneficiary-dashboard']);

  // RPC واحد بدل useFinancialSummary (5 استعلامات)
  const { data: dashData, isLoading, isError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const account = dashData?.account;
  const isAccountMissing = !account && !!fiscalYearId && fiscalYearId !== 'all';
  const totalIncome = safeNumber(dashData?.total_income);
  const totalExpenses = safeNumber(dashData?.total_expenses);
  const adminShare = safeNumber(account?.admin_share);
  const waqifShare = safeNumber(account?.waqif_share);
  const waqfRevenue = safeNumber(account?.waqf_revenue);
  const netAfterVat = safeNumber(account?.net_after_vat);
  const zakatAmount = safeNumber(account?.zakat_amount);
  const netAfterZakat = netAfterVat - zakatAmount;
  const availableAmount = safeNumber(dashData?.available_amount);

  const incomeBySource = useMemo(() => toSourceRecord(dashData?.income_by_source ?? []), [dashData?.income_by_source]);
  const expensesByTypeExcludingVat = useMemo(() => toExpenseRecord(dashData?.expenses_by_type_excluding_vat ?? []), [dashData?.expenses_by_type_excluding_vat]);

  const beneficiaries = useMemo(() => {
    if (!dashData?.beneficiary) return [];
    return [dashData.beneficiary];
  }, [dashData?.beneficiary]);

  const { currentBeneficiary, myShare } = useMyShare({
    beneficiaries: beneficiaries as Array<{ id: string; name: string; share_percentage: number; user_id?: string | null }>,
    availableAmount,
    serverMyShare: dashData?.my_share,
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

  const fiscalYear = selectedFY?.label || '';

  // استخدام monthly_income من الـ RPC بدل جلب income[] الخام
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
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [fiscalYear, totalIncome, totalExpenses, netAfterZakat, adminShare, waqifShare, waqfRevenue, expensesByTypeExcludingVat, incomeBySource, currentBeneficiary, myShare, pdfWaqfInfo]);

  return {
    isLoading, isError, handleRetry,
    isAccountMissing, selectedFY, currentBeneficiary,
    incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
    handleDownloadPDF,
  };
};
