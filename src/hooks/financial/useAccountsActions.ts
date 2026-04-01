/**
 * عمليات صفحة الحسابات — منسّق يجمع الإعدادات والإقفال والتصدير
 * الـ hooks الفرعية: useAccountsSettings, useCloseYear
 */
import { useState, useRef } from 'react';
import { useCreateAccount } from '@/hooks/financial/useAccounts';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { logger } from '@/lib/logger';
import { useAccountsSettings } from './useAccountsSettings';
import { useCloseYear } from './useCloseYear';
import type { Account, Contract, Beneficiary } from '@/types/database';

interface ActionsParams {
  selectedFY: { id: string; label: string; status: string } | null;
  fiscalYear: string;
  fiscalYearId: string | undefined;
  accounts: Account[];
  totalIncome: number;
  totalExpenses: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  grandTotal: number;
  availableAmount: number;
  remainingBalance: number;
  contracts: Contract[];
  beneficiaries: Beneficiary[];
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  appSettingsData: Record<string, string> | undefined;
}

export function useAccountsActions(params: ActionsParams) {
  const createAccount = useCreateAccount();

  // paramsRef يُحدّث من useAccountsPage بقيم calc الفعلية
  const paramsRef = useRef(params);

  // إعدادات مفصولة
  const settings = useAccountsSettings({
    accounts: params.accounts,
    selectedFY: params.selectedFY,
  });

  // بناء بيانات الحساب
  const buildAccountData = () => {
    const p = paramsRef.current;
    return {
      fiscal_year: p.selectedFY?.label || settings.fiscalYear,
      fiscal_year_id: p.selectedFY?.id || '',
      total_income: p.totalIncome,
      total_expenses: p.totalExpenses,
      admin_share: p.adminShare,
      waqif_share: p.waqifShare,
      waqf_revenue: p.waqfRevenue,
      vat_amount: settings.manualVat,
      distributions_amount: settings.manualDistributions,
      net_after_expenses: p.netAfterExpenses,
      net_after_vat: p.netAfterVat,
      zakat_amount: settings.zakatAmount,
      waqf_corpus_manual: settings.waqfCorpusManual,
      waqf_corpus_previous: settings.waqfCorpusPrevious,
    };
  };

  // إقفال السنة — مفصول
  const closeYear = useCloseYear({
    selectedFY: params.selectedFY,
    buildAccountData,
    waqfCorpusManual: settings.waqfCorpusManual,
  });

  const handleCreateAccount = async () => {
    try {
      await createAccount.mutateAsync(buildAccountData());
      const p = paramsRef.current;
      notifyAllBeneficiaries(
        'تحديث الحسابات الختامية',
        `تم تحديث الحسابات الختامية للسنة المالية ${p.selectedFY?.label || settings.fiscalYear}`,
        'info', '/beneficiary/accounts',
      );
      if (settings.manualDistributions > 0) {
        notifyAllBeneficiaries(
          'تحديث التوزيعات المالية',
          `تم تحديث توزيعات الأرباح للسنة المالية ${p.selectedFY?.label || settings.fiscalYear}. يرجى مراجعة حصتك`,
          'info', '/beneficiary/my-share',
        );
      }
    } catch (err) {
      logger.error('خطأ في حفظ الحسابات:', err instanceof Error ? err.message : err);
      defaultNotify.error('خطأ في حفظ الحسابات');
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const p = paramsRef.current;
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
        vatAmount: settings.manualVat,
        distributionsAmount: settings.manualDistributions,
        waqfCorpusManual: settings.waqfCorpusManual,
        zakatAmount: settings.zakatAmount,
        netAfterZakat: p.netAfterZakat,
        waqfCorpusPrevious: settings.waqfCorpusPrevious,
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

  return {
    // الإعدادات
    ...settings,
    isExportingPdf,
    // Ref للقيم المالية
    paramsRef,
    // Handlers
    handleCreateAccount, handleExportPdf,
    // Close year
    ...closeYear,
    createAccountPending: createAccount.isPending,
  };
}
