/**
 * هوك بيانات صفحة "حصتي من الريع"
 * يجمع: البيانات المالية، التوزيعات، السُلف، الفروق المرحّلة، PDF handlers
 * #9: يستخدم RPC get_beneficiary_dashboard كمصدر موثوق لـ my_share
 */
import { safeNumber } from '@/utils/safeNumber';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useMyBeneficiaryFinance } from '@/hooks/financial/useAdvanceRequests';
import { useContractsSafeByFiscalYear } from '@/hooks/data/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { useNavigate } from 'react-router-dom';
import { useBeneficiaryDashboardData } from '@/hooks/page/useBeneficiaryDashboardData';
import { useMySharePdfHandlers } from '@/hooks/page/useMySharePdfHandlers';


export const useMySharePage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const selectedFY = fiscalYear;

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['income'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
    queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
    queryClient.invalidateQueries({ queryKey: ['total-beneficiary-percentage'] });
  };

  const {
    beneficiaries, currentAccount, isAccountMissing,
    totalIncome, totalExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
    vatAmount, zakatAmount, netAfterExpenses, availableAmount,
    incomeBySource, expensesByTypeExcludingVat,
    isLoading: finLoading, isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  // #9: جلب my_share من RPC الخادم
  const { data: dashData } = useBeneficiaryDashboardData(
    fiscalYearId !== '__none__' ? fiscalYearId : undefined,
  );

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries, availableAmount, serverMyShare: dashData?.my_share,
  });

  const { data: distributions = [], isLoading: distLoading } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id, fiscalYearId],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      let query = supabase
        .from('distributions')
        .select('*, account:accounts(id, fiscal_year, fiscal_year_id)')
        .eq('beneficiary_id', currentBeneficiary.id);
      if (fiscalYearId && fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query.order('date', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

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
    ? distributions.filter(d => d.account_id === currentAccount.id)
    : (fiscalYearId && fiscalYearId !== 'all'
        ? distributions.filter(d => d.fiscal_year_id === fiscalYearId)
        : distributions);

  const totalReceived = filteredDistributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const pendingAmount = filteredDistributions
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  // PDF handlers — مستخرجة في هوك فرعي
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
