/**
 * Custom hook encapsulating AccountsPage business logic.
 * Composition layer over sub-hooks (data/settings/calculations/editing/actions/extras/exports).
 */
import { useAccountsData } from '@/hooks/domain/financial/useAccountsData';
import { useAccountsSettings } from '@/hooks/domain/financial/useAccountsSettings';
import { useAccountsCalculations } from '@/hooks/domain/financial/useAccountsCalculations';
import { useAccountsEditing } from '@/hooks/domain/financial/useAccountsEditing';
import { useAccountsActions } from '@/hooks/domain/financial/useAccountsActions';
import { useAccountsExtras } from './useAccountsExtras';
import { useAccountsExports } from './useAccountsExports';

export function useAccountsPage() {

  // 1. جلب البيانات
  const data = useAccountsData();

  // 2. الإعدادات والنسب — مستخرجة هنا لتمريرها مباشرة للحسابات والعمليات
  const settings = useAccountsSettings({
    selectedFY: data.selectedFY,
    accounts: data.accounts,
  });

  // 3. الحسابات المالية — تعتمد على الإعدادات الحقيقية
  const calc = useAccountsCalculations({
    data,
    adminPercent: settings.adminPercent,
    waqifPercent: settings.waqifPercent,
    zakatAmount: settings.zakatAmount,
    waqfCorpusManual: settings.waqfCorpusManual,
    waqfCorpusPrevious: settings.waqfCorpusPrevious,
    manualVat: settings.manualVat,
    manualDistributions: settings.manualDistributions,
    isClosed: data.isClosed,
  });

  // 4. حالة التحرير
  const editing = useAccountsEditing({
    contracts: data.contracts,
    collectionData: calc.collectionData,
    getExpectedPayments: calc.getExpectedPayments,
  });

  const fiscalYearStartDate = data.selectedFY?.start_date ?? null;

  // 5. بيانات إقفال السنة — تُحسب قبل الإجراءات لتُمرَّر إليها كقيم مستقرة
  const extras = useAccountsExtras(data.fiscalYearId, fiscalYearStartDate);
  const { totalBenPct, unpaidInvoices, pendingAdvances, overdueSplit } = extras;

  // 6. العمليات — تستقبل overdueSplit كقيم مستقرة (لا mutable ref)
  const actions = useAccountsActions({
    selectedFY: data.selectedFY,
    fiscalYear: settings.fiscalYear,
    fiscalYearId: data.fiscalYearId,
    accounts: data.accounts,
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
    contracts: data.contracts,
    beneficiaries: data.beneficiaries,
    incomeBySource: calc.incomeBySource,
    expensesByType: calc.expensesByType,
    manualVat: settings.manualVat,
    manualDistributions: settings.manualDistributions,
    zakatAmount: settings.zakatAmount,
    waqfCorpusManual: settings.waqfCorpusManual,
    waqfCorpusPrevious: settings.waqfCorpusPrevious,
    fiscalYearStartDate,
    overdueFromPreviousAmount: overdueSplit.prev,
    overdueInYearAmount: overdueSplit.cur,
  });

  // 7. تصديرات CSV/PDF — مستخرجة في hook منفصل
  const fiscalYearLabel = data.selectedFY?.label || settings.fiscalYear || '';
  const { handleExportCsv, handleExportDisclosurePdf, handleExportDistributionPdf } = useAccountsExports({
    fiscalYearLabel,
    fiscalYearShortLabel: data.selectedFY?.label || '',
    totalIncome: calc.totalIncome,
    totalExpenses: calc.totalExpenses,
    netAfterExpenses: calc.netAfterExpenses,
    netAfterVat: calc.netAfterVat,
    netAfterZakat: calc.netAfterZakat,
    grandTotal: calc.grandTotal,
    adminShare: calc.adminShare,
    waqifShare: calc.waqifShare,
    waqfRevenue: calc.waqfRevenue,
    availableAmount: calc.availableAmount,
    remainingBalance: calc.remainingBalance,
    manualVat: settings.manualVat,
    zakatAmount: settings.zakatAmount,
    waqfCorpusManual: settings.waqfCorpusManual,
    waqfCorpusPrevious: settings.waqfCorpusPrevious,
    manualDistributions: settings.manualDistributions,
    adminPercent: settings.adminPercent,
    waqifPercent: settings.waqifPercent,
    incomeBySource: calc.incomeBySource,
    expensesByType: calc.expensesByType,
    beneficiaries: data.beneficiaries,
    totalBenPct,
  });

  return {
    // Data
    accounts: data.accounts, contracts: data.contracts, beneficiaries: data.beneficiaries,
    income: data.income, expenses: data.expenses, isLoading: data.isLoading,
    selectedFY: data.selectedFY, fiscalYear: settings.fiscalYear, fiscalYears: data.fiscalYears,
    fiscalYearId: data.fiscalYearId, fiscalYearStartDate, isClosed: data.isClosed, currentAccount: settings.currentAccount,
    // Settings
    adminPercent: settings.adminPercent, waqifPercent: settings.waqifPercent,
    zakatAmount: settings.zakatAmount, waqfCorpusManual: settings.waqfCorpusManual,
    waqfCorpusPrevious: settings.waqfCorpusPrevious, manualVat: settings.manualVat,
    manualDistributions: settings.manualDistributions,
    calculatedVat: calc.calculatedVat, commercialRent: calc.commercialRent,
    vatPercentage: calc.vatPercentage, usingFallbackPct: settings.usingFallbackPct,
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
    totalBeneficiaryPercentage: totalBenPct,
    unpaidInvoices, pendingAdvances,
    getPaymentPerPeriod: calc.getPaymentPerPeriod, getExpectedPayments: calc.getExpectedPayments,
    statusLabel: calc.statusLabel,
    // State setters
    setWaqfCorpusPrevious: settings.setWaqfCorpusPrevious, setManualVat: settings.setManualVat,
    setZakatAmount: settings.setZakatAmount, setWaqfCorpusManual: settings.setWaqfCorpusManual,
    setManualDistributions: settings.setManualDistributions,
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
    handleExportPdf: actions.handleExportPdf,
    handleExportDisclosurePdf,
    handleExportDistributionPdf,
    handleExportCsv,
    handleFiscalYearChange: settings.handleFiscalYearChange,
    handleAdminPercentChange: settings.handleAdminPercentChange,
    handleWaqifPercentChange: settings.handleWaqifPercentChange,
    // Close year dialog
    closeYearOpen: actions.closeYearOpen, setCloseYearOpen: actions.setCloseYearOpen,
    isClosingYear: actions.isClosingYear,
    // Mutation states
    createAccountPending: actions.createAccountPending,
    updateContractPending: editing.updateContractPending,
    upsertPaymentPending: editing.upsertPaymentPending,
  };
}
