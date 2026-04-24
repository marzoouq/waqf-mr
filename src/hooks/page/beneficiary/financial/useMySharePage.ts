/**
 * هوك بيانات صفحة حصتي من الريع
 * محسّن: يعتمد على useBeneficiaryFinancials المشترك + بيانات السُلف من RPC
 */
import { useCallback, useMemo } from 'react';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { useContractsForPdf } from '@/hooks/data/contracts';
import { useMyShare } from '@/hooks/computed/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/page/beneficiary';
import { useMySharePdfHandlers } from '@/hooks/page/beneficiary';
import { useBeneficiaryFinancials } from '@/hooks/page/beneficiary';
import { filterDistributionsByFiscalYear, summarizeDistributions } from '@/utils/financial/distributionSummary';
import { isFyReady } from '@/constants/fiscalYearIds';
import { safeNumber } from '@/utils/format/safeNumber';
import type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';


export const useMySharePage = () => {
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const selectedFY = fiscalYear;
  const handleRetry = useRetryQueries(['beneficiary-dashboard', 'my-distributions']);

  const { data: dashData, isLoading: finLoading, isError: finError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const fin = useBeneficiaryFinancials(dashData, fiscalYearId);

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries: fin.beneficiaries as Array<{ id: string; name: string; share_percentage: number; user_id?: string | null }>,
    availableAmount: fin.availableAmount,
    serverMyShare: dashData?.my_share,
  });

  const { data: distributions = [], isLoading: distLoading } = useMyDistributions(
    currentBeneficiary?.id,
    fiscalYearId,
  );

  const myAdvances = useMemo(
    // RPC dashboard response — cast مبرر، النوع يأتي من BeneficiaryDashboardData
    () => (dashData?.my_advances ?? []) as unknown as AdvanceRequest[],
    [dashData?.my_advances],
  );
  const paidAdvancesTotal = safeNumber(dashData?.paid_advances_total);
  const carryforwardBalance = safeNumber(dashData?.carryforward_balance);
  const myCarryforwards = useMemo(
    // RPC dashboard response — cast مبرر
    () => (dashData?.my_carryforwards ?? []) as unknown as AdvanceCarryforward[],
    [dashData?.my_carryforwards],
  );

  const advanceSettings = dashData?.advance_settings ?? { enabled: true, min_amount: 500, max_percentage: 50 };
  // #64 fix: default false instead of true to prevent advances without settings
  const advancesEnabled = advanceSettings.enabled ?? false;
  const beneficiariesShare = fin.availableAmount;
  const isClosed = selectedFY?.status === 'closed';
  // #12: is share estimated (active year)
  const myShareIsEstimated = dashData?.my_share_is_estimated ?? false;

  // تصفية التوزيعات عبر الدالة المشتركة (تحترم وجود الحساب والسنة المحددة)
  const filteredDistributions = filterDistributionsByFiscalYear(distributions, !!fin.account, fiscalYearId);
  const { totalReceived, pendingAmount } = summarizeDistributions(filteredDistributions);

  // جلب العقود lazily فقط عند الحاجة لتصدير PDF — عبر data hook (التزام v7)
  const fetchContractsForPdf = useContractsForPdf();
  const fetchContracts = useCallback(
    () => fetchContractsForPdf(fiscalYearId),
    [fetchContractsForPdf, fiscalYearId],
  );

  const pdf = useMySharePdfHandlers({
    currentBeneficiary: currentBeneficiary ?? null, isClosed: !!isClosed, myShare, totalReceived, pendingAmount,
    netAfterZakat: fin.netAfterZakat, adminShare: fin.adminShare, waqifShare: fin.waqifShare,
    beneficiariesShare, paidAdvancesTotal,
    carryforwardBalance, totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
    netAfterExpenses: fin.netAfterExpenses, vatAmount: fin.vatAmount,
    netAfterVat: fin.netAfterVat, zakatAmount: fin.zakatAmount, waqfRevenue: fin.waqfRevenue,
    waqfCorpusManual: fin.waqfCorpusManual, incomeBySource: fin.incomeBySource,
    expensesByTypeExcludingVat: fin.expensesByTypeExcludingVat, filteredDistributions,
    contracts: [],
    fiscalYearLabel: selectedFY?.label,
    fetchContracts,
  });

  return {
    // #63 fix: check undefined instead of falsy to handle my_share = 0 on active year
    isLoading: finLoading || distLoading || (dashData?.my_share === undefined && pctLoading),
    isError: finError,
    handleRetry,
    currentBeneficiary, isAccountMissing: fin.isAccountMissing, isClosed,
    myShare, myShareIsEstimated, totalReceived, pendingAmount, paidAdvancesTotal,
    carryforwardBalance, beneficiariesShare,
    filteredDistributions, myAdvances, myCarryforwards,
    advancesEnabled, advanceSettings, fiscalYearId, selectedFY,
    ...pdf,
  };
};
