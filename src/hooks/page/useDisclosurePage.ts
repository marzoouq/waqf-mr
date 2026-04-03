/**
 * هوك بيانات صفحة الإفصاح السنوي
 */
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useContractsSafeByFiscalYear } from '@/hooks/data/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { safeNumber } from '@/utils/safeNumber';
import { generateDisclosurePDF, generateComprehensiveBeneficiaryPDF } from '@/utils/pdf';
import { toast } from 'sonner';
import { useBeneficiaryDashboardData } from '@/hooks/page/useBeneficiaryDashboardData';
import { isFyReady } from '@/constants/fiscalYearIds';

/** تنسيق تاريخ ميلادي بصيغة يوم/شهر/سنة */
function toGregorianShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${Number(parts[2])}/${Number(parts[1])}/${parts[0]}`;
  } catch {
    return dateStr;
  }
}

export const useDisclosurePage = () => {
  const queryClient = useQueryClient();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear: selectedFY } = useFiscalYear();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['income'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
    queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
    queryClient.invalidateQueries({ queryKey: ['total-beneficiary-percentage'] });
  };

  const {
    beneficiaries, totalIncome, totalExpenses, currentAccount, isAccountMissing,
    vatAmount, zakatAmount, waqfCorpusManual, waqfCorpusPrevious, grandTotal,
    netAfterExpenses, netAfterVat, netAfterZakat, adminShare, waqifShare,
    adminPct, waqifPct, waqfRevenue, incomeBySource, expensesByTypeExcludingVat,
    availableAmount, isLoading: finLoading, isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { data: contracts = [], isLoading: contractsLoading } = useContractsSafeByFiscalYear(fiscalYearId);

  // #9: جلب my_share من RPC الخادم كمصدر موثوق
  const { data: dashData } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );
  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries,
    availableAmount,
    serverMyShare: dashData?.my_share,
  });
  const beneficiariesShare = availableAmount;

  const fiscalYear = currentAccount?.fiscal_year || selectedFY?.label || '';
  const gregorianFiscalYear = selectedFY
    ? `${toGregorianShort(selectedFY.start_date)}م — ${toGregorianShort(selectedFY.end_date)}م`
    : fiscalYear;

  // توزيعات التقرير الشامل
  const { data: distributions = [] } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id, fiscalYearId],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      const { data, error } = await supabase
        .from('distributions')
        .select('*, account:accounts(id, fiscal_year, fiscal_year_id)')
        .eq('beneficiary_id', currentBeneficiary.id)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

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

  const handleDownloadPDF = async () => {
    try {
      await generateDisclosurePDF({
        fiscalYear: gregorianFiscalYear,
        beneficiaryName: currentBeneficiary?.name || '',
        sharePercentage: currentBeneficiary?.share_percentage || 0,
        myShare, totalIncome, totalExpenses, netRevenue: netAfterZakat,
        adminShare, waqifShare, adminPct, waqifPct, beneficiariesShare,
        incomeBySource, expensesByType: expensesByTypeExcludingVat,
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const handleDownloadComprehensivePDF = async () => {
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary?.name || '',
        fiscalYear: gregorianFiscalYear, totalIncome, totalExpenses,
        netAfterExpenses, vatAmount, netAfterVat, zakatAmount, netAfterZakat,
        adminShare, waqifShare, adminPct, waqifPct, waqfRevenue, waqfCorpusManual,
        availableAmount: beneficiariesShare, myShare, totalReceived, pendingAmount,
        incomeBySource, expensesByType: expensesByTypeExcludingVat,
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
      toast.success('تم تحميل التقرير الشامل بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير الشامل');
    }
  };

  return {
    // حالات التحميل والأخطاء
    finLoading, finError, pctLoading, contractsLoading, isAccountMissing,
    selectedFY, handleRetry,
    // بيانات مالية
    totalIncome, totalExpenses, vatAmount, zakatAmount, waqfCorpusManual,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, adminPct, waqifPct, beneficiariesShare,
    incomeBySource, expensesByTypeExcludingVat,
    // مستفيد
    currentBeneficiary, myShare, totalReceived, pendingAmount, gregorianFiscalYear,
    // عقود
    contracts,
    // إجراءات
    handleDownloadPDF, handleDownloadComprehensivePDF,
  };
};
