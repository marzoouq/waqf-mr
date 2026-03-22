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

// إعادة تصدير findAccountByFY من موقعها الجديد للتوافق مع الاختبارات
export { findAccountByFY } from '@/utils/findAccountByFY';

export function useAccountsPage() {
  // 1. جلب البيانات
  const data = useAccountsData();

  // 2. العمليات والإعدادات (تحتاج أن تكون قبل الحسابات لأنها تحتوي على state الإعدادات)
  // ملاحظة: القيم المالية تُمرر كأصفار هنا لكن useAccountsActions يستخدم paramsRef
  // الذي يُحدّث تلقائياً في كل render بالقيم المحسوبة الفعلية من calc
  const actions = useAccountsActions({
    selectedFY: data.selectedFY,
    fiscalYear: data.selectedFY?.label || '',
    fiscalYearId: data.fiscalYearId,
    accounts: data.accounts,
    totalIncome: 0, // سيتم تحديثها عبر paramsRef في render التالي
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

  // مزامنة القيم المحسوبة الفعلية من calc إلى paramsRef في useAccountsActions
  // هذا يضمن أن buildAccountData و handleExportPdf يستخدمان القيم الحقيقية وليس الأصفار الأولية
  actions.paramsRef.current = {
    ...actions.paramsRef.current,
    totalIncome: calc.totalIncome,
    totalExpenses: calc.totalExpenses,
    adminShare: calc.adminShare,
    waqifShare: calc.waqifShare,
    waqfRevenue: calc.waqfRevenue,
    netAfterExpenses: calc.netAfterExpenses,
    netAfterVat: calc.netAfterVat,
    netAfterZakat: calc.netAfterZakat,
    grandTotal: calc.grandTotal,
    availableAmount: calc.availableAmount,
    remainingBalance: calc.remainingBalance,
    incomeBySource: calc.incomeBySource,
    expensesByType: calc.expensesByType,
  };

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
