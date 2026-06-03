/**
 * هوك صفحة الحسابات الختامية — محسّن: يستخدم useEndUserFinancials المشترك
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uiNotify } from '@/lib/notify';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useMyShare } from '@/hooks/domain/financial/useMyShare';
import { useEndUserDashboardData } from '@/hooks/application/dashboard/useEndUserDashboardData';
import { useEndUserFinancials } from '@/hooks/application/dashboard/useEndUserFinancials';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { safeNumber } from '@/utils/format/safeNumber';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';


export function useAccountsViewPage() {
  const handleRetry = useRetryQueries(['beneficiary-dashboard']);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const navigate = useNavigate();

  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const { data: contracts = [] } = useContractsSafeByFiscalYear(isFyReady(fiscalYearId) ? fiscalYearId : 'all');

  const { data: dashData, isLoading: finLoading, isError: finError } = useEndUserDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  // هوك مشترك بدل ~20 سطر مكرر (#1)
  const fin = useEndUserFinancials(dashData, fiscalYearId);
  const remainingBalance = Math.max(0, fin.availableAmount - fin.distributionsAmount);

  const { currentBeneficiary, myShare } = useMyShare({
    beneficiaries: fin.beneficiaries as Array<{ id: string; name: string; share_percentage: number; user_id?: string | null }>,
    availableAmount: fin.availableAmount,
    serverMyShare: dashData?.my_share,
  });

  const handleExportPdf = useCallback(async () => {
    try {
      const { generateAccountsPDF } = await import('@/utils/pdf');
      await generateAccountsPDF({
        contracts: contracts.filter(c => c.status === 'active').map(c => ({
          contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
          rent_amount: safeNumber(c.rent_amount), status: c.status ?? '',
        })),
        incomeBySource: fin.incomeBySource, expensesByType: fin.expensesByTypeExcludingVat,
        totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses, netRevenue: fin.netAfterZakat,
        adminShare: fin.adminShare, waqifShare: fin.waqifShare, waqfRevenue: fin.waqfRevenue,
        beneficiaries: fin.beneficiaries.map(b => ({ name: b.name ?? 'غير معروف', share_percentage: safeNumber(b.share_percentage) })),
        vatAmount: fin.vatAmount, zakatAmount: fin.zakatAmount, waqfCorpusPrevious: fin.waqfCorpusPrevious,
        grandTotal: fin.grandTotal, netAfterExpenses: fin.netAfterExpenses, netAfterVat: fin.netAfterVat,
        waqfCorpusManual: fin.waqfCorpusManual, distributionsAmount: fin.distributionsAmount,
        availableAmount: fin.availableAmount, remainingBalance,
      }, pdfWaqfInfo);
      uiNotify.success('تم تصدير الحسابات الختامية بنجاح');
    } catch {
      uiNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [contracts, fin, remainingBalance, pdfWaqfInfo]);

  return {
    finLoading, finError,
    isAccountMissing: fin.isAccountMissing, selectedFY, currentBeneficiary,
    totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
    netAfterZakat: fin.netAfterZakat, availableAmount: fin.availableAmount, myShare,
    remainingBalance,
    handleRetry, handleExportPdf, navigate,
  };
}
