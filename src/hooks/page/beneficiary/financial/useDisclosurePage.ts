/**
 * هوك بيانات صفحة الإفصاح السنوي
 * محسّن: يستخدم useBeneficiaryFinancials المشترك + useCallback للـ PDF
 * #13 — نسب الحصص من RPC | #21 — lazy fetch للعقود
 */
import { useCallback } from 'react';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useMyDistributions } from '@/hooks/data/beneficiaries/useMyDistributions';
import { safeNumber } from '@/utils/format/safeNumber';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { defaultNotify } from '@/lib/notify';
import { useBeneficiaryDashboardData } from '@/hooks/page/beneficiary';
import { useBeneficiaryFinancials } from '@/hooks/page/beneficiary';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { filterDistributionsByFiscalYear, summarizeDistributions } from '@/utils/financial/distributionSummary';
import { toGregorianShort } from '@/utils/format/date';
import { isFyReady } from '@/constants/fiscalYearIds';


export const useDisclosurePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();
  const handleRetry = useRetryQueries(['beneficiary-dashboard', 'my-distributions']);

  // Realtime: انعكاس فوري لتعديلات بيانات الإفصاح
  useDashboardRealtime(
    'disclosure-realtime',
    ['accounts', 'income', 'expenses', 'distributions', 'fiscal_years'],
    true,
    [['disclosure'], ['beneficiary-dashboard']],
  );

  const { data: dashData, isLoading: finLoading, isError: finError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  // هوك مشترك (#1)
  const fin = useBeneficiaryFinancials(dashData, fiscalYearId);

  // #13 — نسب الحصص من RPC بدل الحساب المحلي
  const adminPct = safeNumber(dashData?.admin_share_pct);
  const waqifPct = safeNumber(dashData?.waqif_share_pct);

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries: fin.beneficiaries as Array<{ id: string; name: string; share_percentage: number; user_id?: string | null }>,
    availableAmount: fin.availableAmount,
    serverMyShare: dashData?.my_share,
  });
  const beneficiariesShare = fin.availableAmount;

  // العقود مطلوبة لـ DisclosureContractsSection في الـ UI
  const { data: contracts = [], isLoading: contractsLoading } = useContractsSafeByFiscalYear(fiscalYearId);

  const fiscalYear = selectedFY?.label || '';
  const gregorianFiscalYear = selectedFY
    ? `${toGregorianShort(selectedFY.start_date)}م — ${toGregorianShort(selectedFY.end_date)}م`
    : fiscalYear;

  const { data: distributions = [] } = useMyDistributions(
    currentBeneficiary?.id,
    fiscalYearId,
  );

  // دوال مشتركة (#3, #4)
  const filteredDistributions = filterDistributionsByFiscalYear(distributions, !!fin.account, fiscalYearId);
  const { totalReceived, pendingAmount } = summarizeDistributions(filteredDistributions);

  // لف بـ useCallback (#17)
  const handleDownloadPDF = useCallback(async () => {
    try {
      const { generateDisclosurePDF } = await import('@/utils/pdf');
      await generateDisclosurePDF({
        fiscalYear: gregorianFiscalYear,
        beneficiaryName: currentBeneficiary?.name || '',
        sharePercentage: currentBeneficiary?.share_percentage || 0,
        myShare, totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
        netRevenue: fin.netAfterZakat,
        adminShare: fin.adminShare, waqifShare: fin.waqifShare, adminPct, waqifPct, beneficiariesShare,
        incomeBySource: fin.incomeBySource, expensesByType: fin.expensesByTypeExcludingVat,
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [gregorianFiscalYear, currentBeneficiary, myShare, fin, adminPct, waqifPct, beneficiariesShare, pdfWaqfInfo]);

  const handleDownloadComprehensivePDF = useCallback(async () => {
    try {
      const { generateComprehensiveBeneficiaryPDF } = await import('@/utils/pdf');
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary?.name || '',
        fiscalYear: gregorianFiscalYear, totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
        netAfterExpenses: fin.netAfterExpenses, vatAmount: fin.vatAmount, netAfterVat: fin.netAfterVat,
        zakatAmount: fin.zakatAmount, netAfterZakat: fin.netAfterZakat,
        adminShare: fin.adminShare, waqifShare: fin.waqifShare, adminPct, waqifPct,
        waqfRevenue: fin.waqfRevenue, waqfCorpusManual: fin.waqfCorpusManual,
        availableAmount: beneficiariesShare, myShare, totalReceived, pendingAmount,
        incomeBySource: fin.incomeBySource, expensesByType: fin.expensesByTypeExcludingVat,
        contracts: contracts.map(c => ({
          contract_number: c.contract_number ?? '',
          tenant_name: c.tenant_name ?? '',
          rent_amount: safeNumber(c.rent_amount),
          status: c.status ?? '',
        })),
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: d.account?.fiscal_year || '-',
          amount: safeNumber(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل التقرير الشامل بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير التقرير الشامل');
    }
  }, [currentBeneficiary, gregorianFiscalYear, fin, adminPct, waqifPct, beneficiariesShare, myShare, totalReceived, pendingAmount, contracts, filteredDistributions, pdfWaqfInfo]);

  return {
    // توحيد loading states (#37)
    isLoading: finLoading || pctLoading || contractsLoading,
    isError: finError, isAccountMissing: fin.isAccountMissing,
    selectedFY, handleRetry, contracts,
    totalIncome: fin.totalIncome, totalExpenses: fin.totalExpenses,
    vatAmount: fin.vatAmount, zakatAmount: fin.zakatAmount, waqfCorpusManual: fin.waqfCorpusManual,
    waqfCorpusPrevious: fin.waqfCorpusPrevious, grandTotal: fin.grandTotal,
    netAfterExpenses: fin.netAfterExpenses, netAfterVat: fin.netAfterVat, netAfterZakat: fin.netAfterZakat,
    adminShare: fin.adminShare, waqifShare: fin.waqifShare, adminPct, waqifPct, beneficiariesShare,
    incomeBySource: fin.incomeBySource, expensesByTypeExcludingVat: fin.expensesByTypeExcludingVat,
    currentBeneficiary, myShare, totalReceived, pendingAmount, gregorianFiscalYear,
    handleDownloadPDF, handleDownloadComprehensivePDF,
  };
};
