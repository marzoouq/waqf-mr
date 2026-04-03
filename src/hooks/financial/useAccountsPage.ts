/**
 * Custom hook encapsulating AccountsPage business logic
 * Composition layer over sub-hooks:
 * - useAccountsData: جلب البيانات
 * - useAccountsSettings: إعدادات النسب والمبالغ
 * - useAccountsCalculations: الحسابات المالية
 * - useAccountsEditing: حالة التحرير
 * - useAccountsActions: العمليات (حفظ، إقفال، تصدير)
 */
import { useMemo } from 'react';
import { useAccountsData } from './useAccountsData';
import { useAccountsSettings } from './useAccountsSettings';
import { useAccountsCalculations } from './useAccountsCalculations';
import { useAccountsEditing } from './useAccountsEditing';
import { useAccountsActions } from './useAccountsActions';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import { useAdvanceRequests } from '@/hooks/financial/useAdvanceRequests';
import { useTotalBeneficiaryPercentage } from '@/hooks/financial/useTotalBeneficiaryPercentage';


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
    isClosed: data.selectedFY?.status === 'closed',
  });

  // 4. حالة التحرير
  const editing = useAccountsEditing({
    contracts: data.contracts,
    collectionData: calc.collectionData,
    getExpectedPayments: calc.getExpectedPayments,
  });

  // 5. العمليات — تستقبل القيم الحقيقية مباشرة (بدون أصفار أو paramsRef خارجي)
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
  });

  // 6. بيانات إقفال السنة — فواتير غير مدفوعة وسلف معلّقة
  const { data: paymentInvoices = [] } = usePaymentInvoices(data.fiscalYearId || 'all');
  const { data: advanceRequests = [] } = useAdvanceRequests(data.fiscalYearId !== 'all' ? data.fiscalYearId : undefined);
  const { data: totalBenPct = 0 } = useTotalBeneficiaryPercentage();

  const unpaidInvoices = useMemo(() =>
    paymentInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').length,
    [paymentInvoices]
  );
  const pendingAdvances = useMemo(() =>
    advanceRequests.filter(r => r.status === 'pending').length,
    [advanceRequests]
  );

  return {
    // Data
    accounts: data.accounts, contracts: data.contracts, beneficiaries: data.beneficiaries,
    income: data.income, expenses: data.expenses, isLoading: data.isLoading,
    selectedFY: data.selectedFY, fiscalYear: settings.fiscalYear, fiscalYears: data.fiscalYears,
    fiscalYearId: data.fiscalYearId, isClosed: data.isClosed, currentAccount: settings.currentAccount,
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
    totalBeneficiaryPercentage: calc.totalBeneficiaryPercentage,
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
    handleExportPdf: actions.handleExportPdf, handleFiscalYearChange: settings.handleFiscalYearChange,
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
