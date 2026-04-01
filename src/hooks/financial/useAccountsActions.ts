/**
 * عمليات صفحة الحسابات — منسّق يجمع الإعدادات والإقفال والحفظ والتصدير
 * الـ hooks الفرعية: useAccountsSettings, useCloseYear, useCreateAccountAction, useExportAccountsPdf
 */
import { useRef } from 'react';
import { useAccountsSettings } from './useAccountsSettings';
import { useCloseYear } from './useCloseYear';
import { useCreateAccountAction } from './useCreateAccountAction';
import { useExportAccountsPdf } from './useExportAccountsPdf';
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

  // إقفال السنة
  const closeYear = useCloseYear({
    selectedFY: params.selectedFY,
    buildAccountData,
    waqfCorpusManual: settings.waqfCorpusManual,
  });

  // حفظ الحسابات
  const { handleCreateAccount, createAccountPending } = useCreateAccountAction({
    buildAccountData,
    getFiscalYearLabel: () => paramsRef.current.selectedFY?.label || settings.fiscalYear,
    getDistributionsAmount: () => settings.manualDistributions,
  });

  // تصدير PDF
  const { isExportingPdf, handleExportPdf } = useExportAccountsPdf({
    paramsRef,
    getSettings: () => ({
      manualVat: settings.manualVat,
      manualDistributions: settings.manualDistributions,
      waqfCorpusManual: settings.waqfCorpusManual,
      zakatAmount: settings.zakatAmount,
      waqfCorpusPrevious: settings.waqfCorpusPrevious,
    }),
  });

  return {
    ...settings,
    isExportingPdf,
    paramsRef,
    handleCreateAccount,
    handleExportPdf,
    ...closeYear,
    createAccountPending,
  };
}
