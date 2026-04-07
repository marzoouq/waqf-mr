/**
 * هوك صفحة الحسابات الختامية — محسّن: يعتمد على RPC المستفيد
 */
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultNotify } from '@/lib/notify';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { generateAccountsPDF } from '@/utils/pdf';
import { safeNumber } from '@/utils/format/safeNumber';
import { toSourceRecord, toExpenseRecord } from '@/utils/financial/recordConverters';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';

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

export function useAccountsViewPage() {
  const handleRetry = useRetryQueries(['beneficiary-dashboard']);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const navigate = useNavigate();

  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const { data: contracts = [] } = useContractsSafeByFiscalYear(fiscalYearId ?? 'all');

  // RPC واحد بدل useFinancialSummary
  const { data: dashData, isLoading: finLoading, isError: finError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const account = dashData?.account;
  const isAccountMissing = !account && !!fiscalYearId && fiscalYearId !== 'all';
  const totalIncome = safeNumber(dashData?.total_income);
  const totalExpenses = safeNumber(dashData?.total_expenses);
  const netAfterExpenses = safeNumber(account?.net_after_expenses);
  const waqfCorpusPrevious = safeNumber(account?.waqf_corpus_previous);
  const vatAmount = safeNumber(account?.vat_amount);
  const netAfterVat = safeNumber(account?.net_after_vat);
  const zakatAmount = safeNumber(account?.zakat_amount);
  const netAfterZakat = netAfterVat - zakatAmount;
  const adminShare = safeNumber(account?.admin_share);
  const waqifShare = safeNumber(account?.waqif_share);
  const waqfRevenue = safeNumber(account?.waqf_revenue);
  const waqfCorpusManual = safeNumber(account?.waqf_corpus_manual);
  const distributionsAmount = safeNumber(account?.distributions_amount);
  const grandTotal = totalIncome + waqfCorpusPrevious;
  const availableAmount = safeNumber(dashData?.available_amount);
  const remainingBalance = availableAmount - distributionsAmount;

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

  const handleExportPdf = useCallback(async () => {
    try {
      await generateAccountsPDF({
        contracts: contracts.filter(c => c.status === 'active').map(c => ({
          contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
          rent_amount: safeNumber(c.rent_amount), status: c.status ?? '',
        })),
        incomeBySource, expensesByType: expensesByTypeExcludingVat,
        totalIncome, totalExpenses, netRevenue: netAfterZakat,
        adminShare, waqifShare, waqfRevenue,
        beneficiaries: beneficiaries.map(b => ({ name: b.name ?? 'غير معروف', share_percentage: safeNumber(b.share_percentage) })),
        vatAmount, zakatAmount, waqfCorpusPrevious, grandTotal,
        netAfterExpenses, netAfterVat, waqfCorpusManual,
        distributionsAmount, availableAmount, remainingBalance,
      }, pdfWaqfInfo);
      defaultNotify.success('تم تصدير الحسابات الختامية بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [contracts, incomeBySource, expensesByTypeExcludingVat, totalIncome, totalExpenses, netAfterZakat, adminShare, waqifShare, waqfRevenue, beneficiaries, vatAmount, zakatAmount, waqfCorpusPrevious, grandTotal, netAfterExpenses, netAfterVat, waqfCorpusManual, distributionsAmount, availableAmount, remainingBalance, pdfWaqfInfo]);

  return {
    finLoading, finError,
    isAccountMissing, selectedFY, currentBeneficiary,
    totalIncome, totalExpenses, netAfterZakat, availableAmount, myShare,
    handleRetry, handleExportPdf, navigate,
  };
}
