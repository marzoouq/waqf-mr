/**
 * هوك بيانات صفحة "حصتي من الريع"
 * يجمع الـ hooks الفرعية: useMyShareDistributions, useMySharePdf
 */
import { useQueryClient } from '@tanstack/react-query';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useMyBeneficiaryFinance } from '@/hooks/financial/useAdvanceRequests';
import { useContractsSafeByFiscalYear } from '@/hooks/data/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { useNavigate } from 'react-router-dom';
import { useBeneficiaryDashboardData } from '@/hooks/page/useBeneficiaryDashboardData';
import { useMyShareDistributions } from './useMyShareDistributions';
import { useMySharePdf } from './useMySharePdf';


export const useMySharePage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pdfWaqfInfo = usePdfWaqfInfo();
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

  const { data: dashData } = useBeneficiaryDashboardData(
    fiscalYearId !== '__none__' ? fiscalYearId : undefined,
  );

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries, availableAmount, serverMyShare: dashData?.my_share,
  });

  // التوزيعات — hook مفصول
  const { filteredDistributions, totalReceived, pendingAmount, isLoading: distLoading } =
    useMyShareDistributions(currentBeneficiary?.id ?? undefined, fiscalYearId, currentAccount ?? undefined);

  // سُلف وترحيلات
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

  // PDF — hook مفصول
  const pdf = useMySharePdf({
    currentBeneficiary: currentBeneficiary ?? null, isClosed, myShare, totalReceived, pendingAmount,
    paidAdvancesTotal, carryforwardBalance, beneficiariesShare,
    netAfterZakat, adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
    totalIncome, totalExpenses, netAfterExpenses, vatAmount, netAfterVat,
    zakatAmount, availableAmount, incomeBySource,
    expensesByType: expensesByTypeExcludingVat,
    contracts: contracts.map(c => ({
      contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
      rent_amount: Number(c.rent_amount), status: c.status ?? '',
    })),
    filteredDistributions,
    fiscalYearLabel: selectedFY?.label,
    pdfWaqfInfo,
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
