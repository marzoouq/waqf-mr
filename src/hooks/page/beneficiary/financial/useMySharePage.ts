/**
 * هوك بيانات صفحة حصتي من الريع
 * محسّن: يعتمد على useEndUserFinancials المشترك + بيانات السُلف من RPC
 */
import { useCallback, useMemo } from 'react';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { useContractsForPdf } from '@/hooks/data/contracts';
import { useMyShare } from '@/hooks/domain/financial/useMyShare';
import { useEndUserDashboardData } from '@/hooks/application/dashboard/useEndUserDashboardData';
import { useMySharePdfHandlers } from '@/hooks/page/beneficiary';
import { useEndUserFinancials } from '@/hooks/application/dashboard/useEndUserFinancials';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { filterDistributionsByFiscalYear, summarizeDistributions } from '@/utils/financial/distribution/distributionSummary';
import { isFyReady } from '@/constants/fiscalYearIds';
import { safeNumber } from '@/utils/format/safeNumber';
import type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';


export const useMySharePage = () => {
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const selectedFY = fiscalYear;
  const handleRetry = useRetryQueries(['beneficiary-dashboard', 'my-distributions']);

  // Realtime: انعكاس فوري لتعديلات الناظر/المحاسب على حصة المستفيد
  useDashboardRealtime(
    'my-share-realtime',
    ['accounts', 'distributions', 'advance_requests', 'advance_carryforward', 'beneficiaries', 'fiscal_years'],
    true,
    [['my-share'], ['beneficiary-dashboard'], ['my-distributions']],
  );

  const { data: dashData, isLoading: finLoading, isError: finError } = useEndUserDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const fin = useEndUserFinancials(dashData, fiscalYearId);

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

  // إصلاح C-01: افتراضي enabled=false لمنع ظهور زر السلفة قبل تحميل الإعدادات
  const advanceSettings = dashData?.advance_settings ?? { enabled: false, min_amount: 500, max_percentage: 50 };
  const advancesEnabled = advanceSettings.enabled ?? false;
  const beneficiariesShare = fin.availableAmount;
  // #12: is share estimated (active year)
  const myShareIsEstimated = dashData?.my_share_is_estimated ?? false;

  // تصفية التوزيعات عبر الدالة المشتركة (تحترم وجود الحساب والسنة المحددة)
  const filteredDistributions = filterDistributionsByFiscalYear(distributions, !!fin.account, fiscalYearId);
  const localSummary = summarizeDistributions(filteredDistributions);
  // إصلاح اتساق #3: عند غياب الحساب (سنة نشطة) قد تكون filteredDistributions فارغة
  // فنعتمد على total_received من RPC كمصدر مرجعي. عند وجود توزيعات محلية نُفضّلها لدقة الفلترة.
  const serverTotalReceived = safeNumber(dashData?.total_received);
  const totalReceived = filteredDistributions.length > 0 ? localSummary.totalReceived : serverTotalReceived;
  const { pendingAmount } = localSummary;

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
