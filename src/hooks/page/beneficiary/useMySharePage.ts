/**
 * هوك بيانات صفحة "حصتي من الريع"
 * محسّن: يعتمد على useBeneficiaryFinancials المشترك + بيانات السُلف من RPC (#16)
 */
import { useCallback, useMemo } from 'react';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { useMySharePdfHandlers } from '@/hooks/page/beneficiary/useMySharePdfHandlers';
import { useBeneficiaryFinancials } from '@/hooks/page/beneficiary/useBeneficiaryFinancials';
import { filterDistributionsByFiscalYear, summarizeDistributions } from '@/utils/financial/distributionSummary';
import { isFyReady } from '@/constants/fiscalYearIds';
import { supabase } from '@/integrations/supabase/client';
import { safeNumber } from '@/utils/format/safeNumber';
import type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';


export const useMySharePage = () => {
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const selectedFY = fiscalYear;
  const handleRetry = useRetryQueries(['beneficiary-dashboard', 'my-distributions']);

  const { data: dashData, isLoading: finLoading, isError: finError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  // هوك مشترك بدل ~20 سطر مكرر
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

  // #16 — سُلف وترحيلات من RPC مباشرة بدل useMyBeneficiaryFinance
  const myAdvances = useMemo(
    () => (dashData?.my_advances ?? []) as unknown as AdvanceRequest[],
    [dashData?.my_advances],
  );
  const paidAdvancesTotal = safeNumber(dashData?.paid_advances_total);
  const carryforwardBalance = safeNumber(dashData?.carryforward_balance);
  const myCarryforwards = useMemo(
    () => (dashData?.my_carryforwards ?? []) as unknown as AdvanceCarryforward[],
    [dashData?.my_carryforwards],
  );

  // إعدادات السُلف من RPC مباشرة — بدون useAppSettings (#38)
  const advanceSettings = dashData?.advance_settings ?? { enabled: true, min_amount: 500, max_percentage: 50 };
  const advancesEnabled = advanceSettings.enabled ?? true;
  const beneficiariesShare = fin.availableAmount;
  const isClosed = selectedFY?.status === 'closed';

  // فلترة التوزيعات عبر دالة مشتركة (#3, #4)
  const filteredDistributions = filterDistributionsByFiscalYear(distributions, !!fin.account, fiscalYearId);
  const { totalReceived, pendingAmount } = summarizeDistributions(filteredDistributions);

  // #21 — جلب العقود عند طلب PDF فقط (lazy fetch)
  const fetchContracts = useCallback(async () => {
    const { data } = await supabase
      .from('contracts')
      .select('contract_number, tenant_name, rent_amount, status')
      .order('created_at', { ascending: false });
    return data ?? [];
  }, []);

  // PDF handlers
  const pdf = useMySharePdfHandlers({
    currentBeneficiary: currentBeneficiary ?? null, isClosed: !!isClosed, myShare, totalReceived, pendingAmount,
    netAfterZakat: fin.netAfterZakat, adminShare: fin.adminShare, waqifShare: fin.waqifShare,
    beneficiariesShare, paidAdvancesTotal,
    carryforwardBalance, totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
    netAfterExpenses: fin.netAfterExpenses, vatAmount: fin.vatAmount,
    netAfterVat: fin.netAfterVat, zakatAmount: fin.zakatAmount, waqfRevenue: fin.waqfRevenue,
    waqfCorpusManual: fin.waqfCorpusManual, incomeBySource: fin.incomeBySource,
    expensesByTypeExcludingVat: fin.expensesByTypeExcludingVat, filteredDistributions,
    contracts: [], // يُجلب lazily عند الحاجة
    fiscalYearLabel: selectedFY?.label,
    fetchContracts, // #21
  });

  return {
    // تحسين isLoading: تجاهل pctLoading عند وجود serverMyShare (#40)
    isLoading: finLoading || distLoading || (!dashData?.my_share && pctLoading),
    isError: finError,
    handleRetry,
    currentBeneficiary, isAccountMissing: fin.isAccountMissing, isClosed,
    myShare, totalReceived, pendingAmount, paidAdvancesTotal,
    carryforwardBalance, beneficiariesShare,
    filteredDistributions, myAdvances, myCarryforwards,
    advancesEnabled, advanceSettings, fiscalYearId, selectedFY,
    ...pdf,
  };
};
