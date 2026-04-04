/**
 * هوك بيانات صفحة "حصتي من الريع"
 * يجمع: البيانات المالية، التوزيعات، السُلف، الفروق المرحّلة، PDF handlers
 * #9: يستخدم RPC get_beneficiary_dashboard كمصدر موثوق لـ my_share
 */
import { safeNumber } from '@/utils/safeNumber';
import { useQueryClient } from '@tanstack/react-query';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useMyBeneficiaryFinance } from '@/hooks/financial/useAdvanceRequests';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useNavigate } from 'react-router-dom';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { useMySharePdfHandlers } from '@/hooks/page/beneficiary/useMySharePdfHandlers';
import { isFyReady } from '@/constants/fiscalYearIds';


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
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries, availableAmount, serverMyShare: dashData?.my_share,
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
