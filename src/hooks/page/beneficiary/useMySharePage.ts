/**
 * هوك بيانات صفحة "حصتي من الريع"
 * محسّن: يعتمد على RPC المستفيد بدل useFinancialSummary
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyBeneficiaryFinance } from '@/hooks/data/financial/useAdvanceRequests';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useNavigate } from 'react-router-dom';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { useMySharePdfHandlers } from '@/hooks/page/beneficiary/useMySharePdfHandlers';
import { isFyReady } from '@/constants/fiscalYearIds';

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

export const useMySharePage = () => {
  const navigate = useNavigate();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const selectedFY = fiscalYear;
  const handleRetry = useRetryQueries(['beneficiary-dashboard', 'my-distributions']);

  // RPC واحد بدل useFinancialSummary (5 استعلامات)
  const { data: dashData, isLoading: finLoading, isError: finError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const account = dashData?.account;
  const currentAccount = account ? { id: 'rpc', fiscal_year: selectedFY?.label || '' } : null;
  const isAccountMissing = !account && !!fiscalYearId && fiscalYearId !== 'all';
  const totalIncome = safeNumber(dashData?.total_income);
  const totalExpenses = safeNumber(dashData?.total_expenses);
  const netAfterExpenses = safeNumber(account?.net_after_expenses);
  const vatAmount = safeNumber(account?.vat_amount);
  const netAfterVat = safeNumber(account?.net_after_vat);
  const zakatAmount = safeNumber(account?.zakat_amount);
  const netAfterZakat = netAfterVat - zakatAmount;
  const adminShare = safeNumber(account?.admin_share);
  const waqifShare = safeNumber(account?.waqif_share);
  const waqfRevenue = safeNumber(account?.waqf_revenue);
  const waqfCorpusManual = safeNumber(account?.waqf_corpus_manual);
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

  const { data: distributions = [], isLoading: distLoading } = useMyDistributions(
    currentBeneficiary?.id,
    fiscalYearId,
  );

  // سُلف وترحيلات المستفيد
  const effectiveFyId = fiscalYearId === 'all' ? undefined : fiscalYearId;
  const { data: benFinance } = useMyBeneficiaryFinance(currentBeneficiary?.id ?? undefined, effectiveFyId);
  const myAdvances = benFinance?.myAdvances ?? [];
  const paidAdvancesTotal = benFinance?.paidAdvancesTotal ?? 0;
  const carryforwardBalance = benFinance?.carryforwardBalance ?? 0;
  const myCarryforwards = benFinance?.myCarryforwards ?? [];
  const { data: contracts = [] } = useContractsSafeByFiscalYear(fiscalYearId);

  const { getJsonSetting } = useAppSettings();
  const advanceSettings = getJsonSetting('advance_settings', { enabled: true, min_amount: 500, max_percentage: 50 });
  const advancesEnabled = advanceSettings.enabled;
  const beneficiariesShare = availableAmount;
  const isClosed = selectedFY?.status === 'closed';

  // فلترة التوزيعات
  const filteredDistributions = currentAccount
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

  // PDF handlers
  const pdf = useMySharePdfHandlers({
    currentBeneficiary: currentBeneficiary ?? null, isClosed: !!isClosed, myShare, totalReceived, pendingAmount,
    netAfterZakat, adminShare, waqifShare, beneficiariesShare, paidAdvancesTotal,
    carryforwardBalance, totalIncome, totalExpenses, netAfterExpenses, vatAmount,
    netAfterVat, zakatAmount, waqfRevenue, waqfCorpusManual, incomeBySource,
    expensesByTypeExcludingVat, filteredDistributions, contracts,
    fiscalYearLabel: selectedFY?.label,
  });

  return {
    isLoading: finLoading || distLoading || pctLoading,
    isError: finError,
    handleRetry,
    currentBeneficiary, isAccountMissing, isClosed,
    myShare, totalReceived, pendingAmount, paidAdvancesTotal,
    carryforwardBalance, beneficiariesShare,
    filteredDistributions, myAdvances, myCarryforwards,
    advancesEnabled, advanceSettings, fiscalYearId, selectedFY,
    ...pdf,
    navigate,
  };
};
