/**
 * هوك صفحة الحسابات الختامية — يستخرج كل المنطق من AccountsViewPage
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useBeneficiaryDashboardData } from '@/hooks/data/beneficiaries/useBeneficiaryDashboardData';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { generateAccountsPDF } from '@/utils/pdf';
import { safeNumber } from '@/utils/format/safeNumber';
import { isFyReady } from '@/constants/fiscalYearIds';

export function useAccountsViewPage() {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['accounts'] }), [queryClient]);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const navigate = useNavigate();

  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const { data: contracts = [] } = useContractsSafeByFiscalYear(fiscalYearId ?? 'all');

  const {
    beneficiaries, isAccountMissing,
    totalIncome, totalExpenses, netAfterExpenses, waqfCorpusPrevious,
    vatAmount, netAfterVat, zakatAmount, netAfterZakat,
    adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
    distributionsAmount, grandTotal, availableAmount,
    incomeBySource, expensesByTypeExcludingVat, remainingBalance,
    isLoading: finLoading, isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { data: dashData } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );
  const { currentBeneficiary, myShare } = useMyShare({
    beneficiaries, availableAmount, serverMyShare: dashData?.my_share,
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
      toast.success('تم تصدير الحسابات الختامية بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [contracts, incomeBySource, expensesByTypeExcludingVat, totalIncome, totalExpenses, netAfterZakat, adminShare, waqifShare, waqfRevenue, beneficiaries, vatAmount, zakatAmount, waqfCorpusPrevious, grandTotal, netAfterExpenses, netAfterVat, waqfCorpusManual, distributionsAmount, availableAmount, remainingBalance, pdfWaqfInfo]);

  return {
    // حالات التحميل والخطأ
    finLoading, finError,
    // بيانات Guards
    isAccountMissing, selectedFY, currentBeneficiary,
    // بيانات الملخص
    totalIncome, totalExpenses, netAfterZakat, availableAmount, myShare,
    // دوال الإجراءات
    handleRetry, handleExportPdf, navigate,
  };
}
