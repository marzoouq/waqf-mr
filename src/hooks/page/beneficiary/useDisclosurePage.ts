/**
 * هوك بيانات صفحة الإفصاح السنوي
 * محسّن: يعتمد على RPC المستفيد بدل useFinancialSummary لتقليل طلبات الشبكة
 */
import { useMemo } from 'react';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { safeNumber } from '@/utils/format/safeNumber';
import { generateDisclosurePDF, generateComprehensiveBeneficiaryPDF } from '@/utils/pdf';
import { defaultNotify } from '@/lib/notify';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { isFyReady } from '@/constants/fiscalYearIds';

/** تنسيق تاريخ ميلادي بصيغة يوم/شهر/سنة */
function toGregorianShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${Number(parts[2])}/${Number(parts[1])}/${parts[0]}`;
  } catch {
    return dateStr;
  }
}

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

export const useDisclosurePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const handleRetry = useRetryQueries(['beneficiary-dashboard', 'my-distributions']);

  // RPC واحد بدل useFinancialSummary (5 استعلامات)
  const { data: dashData, isLoading: finLoading, isError: finError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const totalIncome = safeNumber(dashData?.total_income);
  const totalExpenses = safeNumber(dashData?.total_expenses);
  const account = dashData?.account;
  const isAccountMissing = !account && !!fiscalYearId && fiscalYearId !== 'all';
  const vatAmount = safeNumber(account?.vat_amount);
  const zakatAmount = safeNumber(account?.zakat_amount);
  const waqfCorpusManual = safeNumber(account?.waqf_corpus_manual);
  const waqfCorpusPrevious = safeNumber(account?.waqf_corpus_previous);
  const netAfterExpenses = safeNumber(account?.net_after_expenses);
  const netAfterVat = safeNumber(account?.net_after_vat);
  const adminShare = safeNumber(account?.admin_share);
  const waqifShare = safeNumber(account?.waqif_share);
  const waqfRevenue = safeNumber(account?.waqf_revenue);
  const grandTotal = totalIncome + waqfCorpusPrevious;
  const netAfterZakat = netAfterVat - zakatAmount;
  const adminPct = totalIncome > 0 ? Math.round((adminShare / (netAfterVat - zakatAmount)) * 100) : 0;
  const waqifPct = totalIncome > 0 ? Math.round((waqifShare / (netAfterVat - zakatAmount)) * 100) : 0;
  const availableAmount = safeNumber(dashData?.available_amount);

  const incomeBySource = useMemo(() => toSourceRecord(dashData?.income_by_source ?? []), [dashData?.income_by_source]);
  const expensesByTypeExcludingVat = useMemo(() => toExpenseRecord(dashData?.expenses_by_type_excluding_vat ?? []), [dashData?.expenses_by_type_excluding_vat]);

  const beneficiaries = useMemo(() => {
    if (!dashData?.beneficiary) return [];
    return [dashData.beneficiary];
  }, [dashData?.beneficiary]);

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries: beneficiaries as Array<{ id: string; name: string; share_percentage: number; user_id?: string | null }>,
    availableAmount,
    serverMyShare: dashData?.my_share,
  });
  const beneficiariesShare = availableAmount;

  const { data: contracts = [], isLoading: contractsLoading } = useContractsSafeByFiscalYear(fiscalYearId);

  const fiscalYear = selectedFY?.label || '';
  const gregorianFiscalYear = selectedFY
    ? `${toGregorianShort(selectedFY.start_date)}م — ${toGregorianShort(selectedFY.end_date)}م`
    : fiscalYear;

  const { data: distributions = [] } = useMyDistributions(
    currentBeneficiary?.id,
    fiscalYearId,
  );

  const filteredDistributions = dashData?.account
    ? distributions
    : (fiscalYearId && fiscalYearId !== 'all'
        ? distributions.filter(d => d.fiscal_year_id === fiscalYearId)
        : distributions);

  const totalReceived = filteredDistributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const pendingAmount = filteredDistributions
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const handleDownloadPDF = async () => {
    try {
      await generateDisclosurePDF({
        fiscalYear: gregorianFiscalYear,
        beneficiaryName: currentBeneficiary?.name || '',
        sharePercentage: currentBeneficiary?.share_percentage || 0,
        myShare, totalIncome, totalExpenses, netRevenue: netAfterZakat,
        adminShare, waqifShare, adminPct, waqifPct, beneficiariesShare,
        incomeBySource, expensesByType: expensesByTypeExcludingVat,
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const handleDownloadComprehensivePDF = async () => {
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary?.name || '',
        fiscalYear: gregorianFiscalYear, totalIncome, totalExpenses,
        netAfterExpenses, vatAmount, netAfterVat, zakatAmount, netAfterZakat,
        adminShare, waqifShare, adminPct, waqifPct, waqfRevenue, waqfCorpusManual,
        availableAmount: beneficiariesShare, myShare, totalReceived, pendingAmount,
        incomeBySource, expensesByType: expensesByTypeExcludingVat,
        contracts: contracts.map(c => ({
          contract_number: c.contract_number ?? '',
          tenant_name: c.tenant_name ?? '',
          rent_amount: safeNumber(c.rent_amount),
          status: c.status ?? '',
        })),
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: d.account?.fiscal_year || '-',
          amount: safeNumber(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل التقرير الشامل بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير التقرير الشامل');
    }
  };

  return {
    finLoading, finError, pctLoading, contractsLoading, isAccountMissing,
    selectedFY, handleRetry,
    totalIncome, totalExpenses, vatAmount, zakatAmount, waqfCorpusManual,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, adminPct, waqifPct, beneficiariesShare,
    incomeBySource, expensesByTypeExcludingVat,
    currentBeneficiary, myShare, totalReceived, pendingAmount, gregorianFiscalYear,
    contracts,
    handleDownloadPDF, handleDownloadComprehensivePDF,
  };
};
