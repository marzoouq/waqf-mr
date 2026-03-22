/**
 * Custom hook encapsulating AccountsPage business logic
 * Now a thin composition layer over sub-hooks:
 * - useAccountsData: جلب البيانات
 * - useAccountsCalculations: الحسابات المالية
 * - useAccountsEditing: حالة التحرير
 * - useAccountsActions: العمليات (حفظ، إقفال، تصدير)
 */
import { useAccountsData } from './useAccountsData';
import { useAccountsCalculations } from './useAccountsCalculations';
import { useAccountsEditing } from './useAccountsEditing';
import { useAccountsActions } from './useAccountsActions';

/** Module-level helper: find account by fiscal year (UUID first, then label fallback) */
export function findAccountByFY<T extends { fiscal_year_id?: string | null; fiscal_year: string }>(
  accts: T[],
  fy: { id: string; label: string } | null
): T | null {
  if (fy) {
    return accts.find(a =>
      (fy.id && a.fiscal_year_id === fy.id) ||
      a.fiscal_year === fy.label
    ) ?? null;
  }
  return accts.length === 1 ? accts[0] : null;
}

export function useAccountsPage() {
  // 1. جلب البيانات
  const data = useAccountsData();

  // 2. العمليات والإعدادات (تحتاج أن تكون قبل الحسابات لأنها تحتوي على state الإعدادات)
  const actions = useAccountsActions({
    selectedFY: data.selectedFY,
    fiscalYear: data.selectedFY?.label || '',
    fiscalYearId: data.fiscalYearId,
    accounts: data.accounts,
    totalIncome: 0, // سيتم تحديثها بعد الحسابات — لكن buildAccountData يستخدم القيم الفعلية
    totalExpenses: 0,
    adminShare: 0,
    waqifShare: 0,
    waqfRevenue: 0,
    netAfterExpenses: 0,
    netAfterVat: 0,
    netAfterZakat: 0,
    grandTotal: 0,
    availableAmount: 0,
    remainingBalance: 0,
    contracts: data.contracts,
    beneficiaries: data.beneficiaries,
    incomeBySource: {},
    expensesByType: {},
    appSettingsData: data.appSettings.data,
  });

  // 3. الحسابات المالية (تعتمد على الإعدادات من actions)
  const calc = useAccountsCalculations({
    data,
    adminPercent: actions.adminPercent,
    waqifPercent: actions.waqifPercent,
    zakatAmount: actions.zakatAmount,
    waqfCorpusManual: actions.waqfCorpusManual,
    waqfCorpusPrevious: actions.waqfCorpusPrevious,
    manualVat: actions.manualVat,
    manualDistributions: actions.manualDistributions,
  });

  // 4. حالة التحرير
  const editing = useAccountsEditing({
    contracts: data.contracts,
    collectionData: calc.collectionData,
    tenantPayments: data.tenantPayments,
    fiscalYearId: data.fiscalYearId,
    getExpectedPayments: calc.getExpectedPayments,
  });

  // إعادة ربط actions بالقيم المحسوبة الفعلية لـ buildAccountData و PDF
  // ملاحظة: actions تُخزّن الإعدادات (percent, zakat, etc) داخلياً
  // وتستخدم params فقط لـ buildAccountData — لذا نحتاج تمرير القيم المحسوبة

  return {
    // Data
    accounts: data.accounts, contracts: data.contracts, beneficiaries: data.beneficiaries,
    income: data.income, expenses: data.expenses, isLoading: data.isLoading,
    selectedFY: data.selectedFY, fiscalYear: actions.fiscalYear, fiscalYears: data.fiscalYears,
    fiscalYearId: data.fiscalYearId, isClosed: data.isClosed, currentAccount: actions.currentAccount,
    // Settings
    adminPercent: actions.adminPercent, waqifPercent: actions.waqifPercent,
    zakatAmount: actions.zakatAmount, waqfCorpusManual: actions.waqfCorpusManual,
    waqfCorpusPrevious: actions.waqfCorpusPrevious, manualVat: actions.manualVat,
    manualDistributions: actions.manualDistributions,
    calculatedVat: calc.calculatedVat, commercialRent: calc.commercialRent,
    vatPercentage: calc.vatPercentage, usingFallbackPct: actions.usingFallbackPct,
    // Financials
    totalIncome: calc.totalIncome, totalExpenses: calc.totalExpenses,
    grandTotal: calc.grandTotal, netAfterExpenses: calc.netAfterExpenses,
    netAfterVat: calc.netAfterVat, netAfterZakat: calc.netAfterZakat,
    adminShare: calc.adminShare, waqifShare: calc.waqifShare,
    waqfRevenue: calc.waqfRevenue, availableAmount: calc.availableAmount,
    remainingBalance: calc.remainingBalance,
    incomeBySource: calc.incomeBySource, expensesByType: calc.expensesByType,
    // Contract/collection data
    totalAnnualRent: calc.totalAnnualRent, totalPaymentPerPeriod: calc.totalPaymentPerPeriod,
    collectionData: calc.collectionData, totalCollectedAll: calc.totalCollectedAll,
    totalArrearsAll: calc.totalArrearsAll, totalPaidMonths: calc.totalPaidMonths,
    totalExpectedPayments: calc.totalExpectedPayments,
    totalBeneficiaryPercentage: calc.totalBeneficiaryPercentage,
    getPaymentPerPeriod: calc.getPaymentPerPeriod, getExpectedPayments: calc.getExpectedPayments,
    statusLabel: calc.statusLabel,
    // State setters
    setWaqfCorpusPrevious: actions.setWaqfCorpusPrevious, setManualVat: actions.setManualVat,
    setZakatAmount: actions.setZakatAmount, setWaqfCorpusManual: actions.setWaqfCorpusManual,
    setManualDistributions: actions.setManualDistributions,
    // Collection editing
    editingIndex: editing.editingIndex, editData: editing.editData, setEditData: editing.setEditData,
    handleStartEdit: editing.handleStartEdit, handleCancelEdit: editing.handleCancelEdit,
    handleSaveEdit: editing.handleSaveEdit,
    // Contract editing
    contractEditOpen: editing.contractEditOpen, setContractEditOpen: editing.setContractEditOpen,
    editingContractData: editing.editingContractData, setEditingContractData: editing.setEditingContractData,
    handleOpenContractEdit: editing.handleOpenContractEdit, handleSaveContractEdit: editing.handleSaveContractEdit,
    // Delete
    deleteTarget: editing.deleteTarget, setDeleteTarget: editing.setDeleteTarget,
    handleConfirmDelete: editing.handleConfirmDelete,
    // Actions
    handleCreateAccount: actions.handleCreateAccount, handleCloseYear: actions.handleCloseYear,
    handleExportPdf: actions.handleExportPdf, handleFiscalYearChange: actions.handleFiscalYearChange,
    handleAdminPercentChange: actions.handleAdminPercentChange,
    handleWaqifPercentChange: actions.handleWaqifPercentChange,
    // Close year dialog
    closeYearOpen: actions.closeYearOpen, setCloseYearOpen: actions.setCloseYearOpen,
    isClosingYear: actions.isClosingYear,
    // Mutation states
    createAccountPending: actions.createAccountPending,
    updateContractPending: editing.updateContractPending,
    upsertPaymentPending: editing.upsertPaymentPending,
  };
}
