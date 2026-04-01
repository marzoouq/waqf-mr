/**
 * تصدير تقرير الحسابات PDF — مفصول من useAccountsActions
 */
import { useState, type MutableRefObject } from 'react';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import type { Contract, Beneficiary } from '@/types/database';

interface ExportPdfParams {
  paramsRef: MutableRefObject<{
    contracts: Contract[];
    incomeBySource: Record<string, number>;
    expensesByType: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
    netAfterZakat: number;
    adminShare: number;
    waqifShare: number;
    waqfRevenue: number;
    beneficiaries: Beneficiary[];
    grandTotal: number;
    availableAmount: number;
    remainingBalance: number;
  }>;
  getSettings: () => {
    manualVat: number;
    manualDistributions: number;
    waqfCorpusManual: number;
    zakatAmount: number;
    waqfCorpusPrevious: number;
  };
}

export function useExportAccountsPdf({ paramsRef, getSettings }: ExportPdfParams) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const p = paramsRef.current;
      const s = getSettings();
      const { generateAccountsPDF } = await import('@/utils/pdf');
      await generateAccountsPDF({
        contracts: p.contracts,
        incomeBySource: p.incomeBySource,
        expensesByType: p.expensesByType,
        totalIncome: p.totalIncome,
        totalExpenses: p.totalExpenses,
        netRevenue: p.netAfterZakat,
        adminShare: p.adminShare,
        waqifShare: p.waqifShare,
        waqfRevenue: p.waqfRevenue,
        beneficiaries: p.beneficiaries,
        vatAmount: s.manualVat,
        distributionsAmount: s.manualDistributions,
        waqfCorpusManual: s.waqfCorpusManual,
        zakatAmount: s.zakatAmount,
        netAfterZakat: p.netAfterZakat,
        waqfCorpusPrevious: s.waqfCorpusPrevious,
        grandTotal: p.grandTotal,
        availableAmount: p.availableAmount,
        remainingBalance: p.remainingBalance,
      });
      defaultNotify.success('تم تصدير التقرير بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return { isExportingPdf, handleExportPdf };
}
