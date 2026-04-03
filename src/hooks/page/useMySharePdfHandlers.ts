/**
 * هوك PDF handlers لصفحة حصتي — مستخرج من useMySharePage
 */
import { useState } from 'react';
import { generateMySharePDF, generateDistributionsPDF, generateComprehensiveBeneficiaryPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { printShareReport } from '@/utils/printShareReport';

interface PdfHandlersParams {
  currentBeneficiary: { name: string | null; share_percentage: number | null } | null;
  isClosed: boolean;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  beneficiariesShare: number;
  paidAdvancesTotal: number;
  carryforwardBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  incomeBySource: Record<string, number>;
  expensesByTypeExcludingVat: Record<string, number>;
  filteredDistributions: Array<{ date: string; amount: number; status: string; account?: { fiscal_year?: string } | null }>;
  contracts: Array<{ contract_number: string | null; tenant_name: string | null; rent_amount: number | null; status: string | null }>;
  fiscalYearLabel?: string;
}

export const useMySharePdfHandlers = (params: PdfHandlersParams) => {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const pdfWaqfInfo = usePdfWaqfInfo();

  const withPdfLoading = (fn: () => Promise<void>) => async () => {
    if (isPdfLoading) return;
    setIsPdfLoading(true);
    try { await fn(); } finally { setIsPdfLoading(false); }
  };

  const handleDownloadPDF = withPdfLoading(async () => {
    if (!params.currentBeneficiary) return;
    if (!params.isClosed) { defaultNotify.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية'); return; }
    try {
      const advAmt = params.paidAdvancesTotal;
      const afterAdv = Math.max(0, params.myShare - advAmt);
      const actualCf = Math.min(params.carryforwardBalance, afterAdv);
      await generateMySharePDF({
        beneficiaryName: params.currentBeneficiary.name ?? 'غير معروف',
        sharePercentage: params.currentBeneficiary.share_percentage ?? 0,
        myShare: params.myShare,
        totalReceived: params.totalReceived,
        pendingAmount: params.pendingAmount,
        netRevenue: params.netAfterZakat,
        adminShare: params.adminShare,
        waqifShare: params.waqifShare,
        beneficiariesShare: params.beneficiariesShare,
        paidAdvances: advAmt,
        carryforwardDeducted: Math.round(actualCf * 100) / 100,
        fiscalYear: params.fiscalYearLabel,
        distributions: params.filteredDistributions.map(d => ({
          date: d.date, fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount), status: d.status,
        })),
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch { defaultNotify.error('حدث خطأ أثناء تصدير PDF'); }
  });

  const handleDownloadDistributionsPDF = withPdfLoading(async () => {
    if (!params.currentBeneficiary) return;
    if (!params.isClosed) { defaultNotify.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية'); return; }
    try {
      const advances = params.paidAdvancesTotal;
      const afterAdvances = Math.max(0, params.myShare - advances);
      const actualCarryforward = Math.min(params.carryforwardBalance, afterAdvances);
      const rawNet = params.myShare - advances - actualCarryforward;
      const net = Math.max(0, rawNet);
      const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;
      await generateDistributionsPDF({
        fiscalYearLabel: params.fiscalYearLabel || '',
        availableAmount: params.myShare,
        distributions: [{
          beneficiary_name: params.currentBeneficiary.name ?? 'غير معروف',
          share_percentage: params.currentBeneficiary.share_percentage ?? 0,
          share_amount: params.myShare, advances_paid: advances,
          carryforward_deducted: Math.round(actualCarryforward * 100) / 100,
          net_amount: net, deficit,
        }],
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل تقرير التوزيعات بنجاح');
    } catch { defaultNotify.error('حدث خطأ أثناء تصدير التقرير'); }
  });

  const handleDownloadComprehensivePDF = withPdfLoading(async () => {
    if (!params.currentBeneficiary) return;
    if (!params.isClosed) { defaultNotify.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية'); return; }
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: params.currentBeneficiary.name ?? 'غير معروف',
        fiscalYear: params.fiscalYearLabel || '',
        totalIncome: params.totalIncome, totalExpenses: params.totalExpenses,
        netAfterExpenses: params.netAfterExpenses, vatAmount: params.vatAmount,
        netAfterVat: params.netAfterVat, zakatAmount: params.zakatAmount,
        netAfterZakat: params.netAfterZakat, adminShare: params.adminShare,
        waqifShare: params.waqifShare, waqfRevenue: params.waqfRevenue,
        waqfCorpusManual: params.waqfCorpusManual,
        availableAmount: params.beneficiariesShare, myShare: params.myShare,
        totalReceived: params.totalReceived, pendingAmount: params.pendingAmount,
        incomeBySource: params.incomeBySource, expensesByType: params.expensesByTypeExcludingVat,
        contracts: params.contracts.map(c => ({
          contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
          rent_amount: Number(c.rent_amount), status: c.status ?? '',
        })),
        distributions: params.filteredDistributions.map(d => ({
          date: d.date, fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount), status: d.status,
        })),
      }, pdfWaqfInfo);
      defaultNotify.success('تم تحميل التقرير الشامل بنجاح');
    } catch { defaultNotify.error('حدث خطأ أثناء تصدير التقرير الشامل'); }
  });

  const handlePrintReport = () => {
    if (!params.currentBeneficiary) return;
    printShareReport({
      beneficiaryName: params.currentBeneficiary.name ?? 'غير معروف',
      beneficiariesShare: params.beneficiariesShare, myShare: params.myShare,
      paidAdvancesTotal: params.paidAdvancesTotal, carryforwardBalance: params.carryforwardBalance,
      fiscalYearLabel: params.fiscalYearLabel, filteredDistributions: params.filteredDistributions,
    });
  };

  return { isPdfLoading, handleDownloadPDF, handleDownloadDistributionsPDF, handleDownloadComprehensivePDF, handlePrintReport };
};
