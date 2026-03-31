/**
 * هوك بيانات صفحة "حصتي من الريع"
 * يجمع: البيانات المالية، التوزيعات، السُلف، الفروق المرحّلة، PDF handlers
 * #9: يستخدم RPC get_beneficiary_dashboard كمصدر موثوق لـ my_share
 */
import { useState } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateMySharePDF, generateDistributionsPDF, generateComprehensiveBeneficiaryPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useMyBeneficiaryFinance } from '@/hooks/financial/useAdvanceRequests';
import { useContractsSafeByFiscalYear } from '@/hooks/data/useContracts';
import { useMyShare } from '@/hooks/financial/useMyShare';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { printShareReport } from '@/utils/printShareReport';
import { useNavigate } from 'react-router-dom';
import { useBeneficiaryDashboardData } from '@/hooks/page/useBeneficiaryDashboardData';


export const useMySharePage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const selectedFY = fiscalYear;
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['income'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
    queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
    queryClient.invalidateQueries({ queryKey: ['total-beneficiary-percentage'] });
  };

  const {
    beneficiaries,
    currentAccount,
    isAccountMissing,
    totalIncome,
    totalExpenses,
    netAfterVat,
    netAfterZakat,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    vatAmount,
    zakatAmount,
    netAfterExpenses,
    availableAmount,
    incomeBySource,
    expensesByTypeExcludingVat,
    isLoading: finLoading,
    isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  // #9: جلب my_share من RPC الخادم كمصدر موثوق واحد
  const { data: dashData } = useBeneficiaryDashboardData(
    fiscalYearId !== '__none__' ? fiscalYearId : undefined,
  );

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({
    beneficiaries,
    availableAmount,
    serverMyShare: dashData?.my_share,
  });

  const { data: distributions = [], isLoading: distLoading } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id, fiscalYearId],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      let query = supabase
        .from('distributions')
        .select('*, account:accounts(id, fiscal_year, fiscal_year_id)')
        .eq('beneficiary_id', currentBeneficiary.id);

      // #16: فلتر بالسنة المالية في الاستعلام بدلاً من جلب الكل
      if (fiscalYearId && fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

  // سُلف وترحيلات المستفيد — استعلام مدمج واحد بدل 4
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

  // فلترة التوزيعات بالسنة المالية
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

  // PDF helpers
  const withPdfLoading = (fn: () => Promise<void>) => async () => {
    if (isPdfLoading) return;
    setIsPdfLoading(true);
    try { await fn(); } finally { setIsPdfLoading(false); }
  };

  const handleDownloadPDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) { toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية'); return; }
    try {
      const advAmt = paidAdvancesTotal;
      const afterAdv = Math.max(0, myShare - advAmt);
      const actualCf = Math.min(carryforwardBalance, afterAdv);
      await generateMySharePDF({
        beneficiaryName: currentBeneficiary.name ?? 'غير معروف',
        sharePercentage: currentBeneficiary.share_percentage ?? 0,
        myShare,
        totalReceived,
        pendingAmount,
        netRevenue: netAfterZakat,
        adminShare,
        waqifShare,
        beneficiariesShare,
        paidAdvances: advAmt,
        carryforwardDeducted: Math.round(actualCf * 100) / 100,
        fiscalYear: selectedFY?.label,
        distributions: filteredDistributions.map(d => ({
          date: d.date, fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount), status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch { toast.error('حدث خطأ أثناء تصدير PDF'); }
  });

  const handleDownloadDistributionsPDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) { toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية'); return; }
    try {
      const advances = paidAdvancesTotal;
      const afterAdvances = Math.max(0, myShare - advances);
      const actualCarryforward = Math.min(carryforwardBalance, afterAdvances);
      const rawNet = myShare - advances - actualCarryforward;
      const net = Math.max(0, rawNet);
      const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;
      await generateDistributionsPDF({
        fiscalYearLabel: selectedFY?.label || '',
        availableAmount: myShare,
        distributions: [{
          beneficiary_name: currentBeneficiary.name ?? 'غير معروف',
          share_percentage: currentBeneficiary.share_percentage ?? 0,
          share_amount: myShare, advances_paid: advances,
          carryforward_deducted: Math.round(actualCarryforward * 100) / 100,
          net_amount: net, deficit,
        }],
      }, pdfWaqfInfo);
      toast.success('تم تحميل تقرير التوزيعات بنجاح');
    } catch { toast.error('حدث خطأ أثناء تصدير التقرير'); }
  });

  const handleDownloadComprehensivePDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) { toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية'); return; }
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary.name ?? 'غير معروف',
        fiscalYear: selectedFY?.label || '',
        totalIncome, totalExpenses, netAfterExpenses, vatAmount, netAfterVat,
        zakatAmount, netAfterZakat, adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
        availableAmount: beneficiariesShare, myShare, totalReceived, pendingAmount,
        incomeBySource, expensesByType: expensesByTypeExcludingVat,
        contracts: contracts.map(c => ({
          contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
          rent_amount: Number(c.rent_amount), status: c.status ?? '',
        })),
        distributions: filteredDistributions.map(d => ({
          date: d.date, fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount), status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل التقرير الشامل بنجاح');
    } catch { toast.error('حدث خطأ أثناء تصدير التقرير الشامل'); }
  });

  const handlePrintReport = () => {
    if (!currentBeneficiary) return;
    printShareReport({
      beneficiaryName: currentBeneficiary.name ?? 'غير معروف',
      beneficiariesShare, myShare, paidAdvancesTotal, carryforwardBalance,
      fiscalYearLabel: selectedFY?.label, filteredDistributions,
    });
  };

  return {
    // حالة التحميل
    isLoading: finLoading || distLoading || pctLoading,
    isError: finError,
    handleRetry,
    // بيانات المستفيد
    currentBeneficiary,
    isAccountMissing,
    isClosed,
    // أرقام
    myShare,
    totalReceived,
    pendingAmount,
    paidAdvancesTotal,
    carryforwardBalance,
    beneficiariesShare,
    // جداول
    filteredDistributions,
    myAdvances,
    myCarryforwards,
    // سُلف
    advancesEnabled,
    advanceSettings,
    fiscalYearId,
    selectedFY,
    // PDF
    isPdfLoading,
    handleDownloadPDF,
    handleDownloadDistributionsPDF,
    handleDownloadComprehensivePDF,
    handlePrintReport,
    // تنقل
    navigate,
  };
};
