import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Lock } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { useAccountsPage } from '@/hooks/useAccountsPage';

import AccountsSettingsBar from '@/components/accounts/AccountsSettingsBar';
import AccountsSummaryCards from '@/components/accounts/AccountsSummaryCards';
import AccountsContractsTable from '@/components/accounts/AccountsContractsTable';
import AccountsCollectionTable from '@/components/accounts/AccountsCollectionTable';
import AccountsIncomeTable from '@/components/accounts/AccountsIncomeTable';
import AccountsExpensesTable from '@/components/accounts/AccountsExpensesTable';
import AccountsDistributionTable from '@/components/accounts/AccountsDistributionTable';
import AccountsBeneficiariesTable from '@/components/accounts/AccountsBeneficiariesTable';
import AccountsSavedTable from '@/components/accounts/AccountsSavedTable';
import AccountsDialogs from '@/components/accounts/AccountsDialogs';
import CloseYearDialog from '@/components/accounts/CloseYearDialog';

const AccountsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const page = useAccountsPage();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة ومتابعة الحسابات السنوية</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {page.isClosed && (
              <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
                <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية الناظر
              </span>
            )}
            <ExportMenu onExportPdf={page.handleExportPdf} />
            <Button onClick={page.handleCreateAccount} className="gradient-primary gap-2" disabled={page.createAccountPending}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إنشاء حساب ختامي</span>
            </Button>
            {page.selectedFY && page.selectedFY.status === 'active' && (
              <Button variant="destructive" size="sm" onClick={() => page.setCloseYearOpen(true)} className="gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">إقفال السنة</span>
              </Button>
            )}
          </div>
        </div>

        <AccountsSettingsBar
          fiscalYear={page.fiscalYear}
          adminPercent={page.adminPercent}
          waqifPercent={page.waqifPercent}
          waqfCorpusPrevious={page.waqfCorpusPrevious}
          manualVat={page.manualVat}
          zakatAmount={page.zakatAmount}
          waqfCorpusManual={page.waqfCorpusManual}
          manualDistributions={page.manualDistributions}
          calculatedVat={page.calculatedVat}
          commercialRent={page.commercialRent}
          vatPercentage={page.vatPercentage}
          onFiscalYearChange={page.handleFiscalYearChange}
          onAdminPercentChange={page.handleAdminPercentChange}
          onWaqifPercentChange={page.handleWaqifPercentChange}
          onWaqfCorpusPreviousChange={page.setWaqfCorpusPrevious}
          onManualVatChange={page.setManualVat}
          onZakatAmountChange={page.setZakatAmount}
          onWaqfCorpusManualChange={page.setWaqfCorpusManual}
          onManualDistributionsChange={page.setManualDistributions}
        />

        {page.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : (
        <AccountsSummaryCards
          waqfCorpusPrevious={page.waqfCorpusPrevious}
          totalIncome={page.totalIncome}
          grandTotal={page.grandTotal}
          totalExpenses={page.totalExpenses}
          netAfterExpenses={page.netAfterExpenses}
          manualVat={page.manualVat}
          netAfterVat={page.netAfterVat}
          zakatAmount={page.zakatAmount}
          adminPercent={page.adminPercent}
          adminShare={page.adminShare}
          waqifPercent={page.waqifPercent}
          waqifShare={page.waqifShare}
          waqfRevenue={page.waqfRevenue}
          waqfCorpusManual={page.waqfCorpusManual}
          manualDistributions={page.manualDistributions}
          remainingBalance={page.remainingBalance}
        />
        )}

        <AccountsContractsTable
          contracts={page.contracts}
          getPaymentPerPeriod={page.getPaymentPerPeriod}
          getExpectedPayments={page.getExpectedPayments}
          totalPaymentPerPeriod={page.totalPaymentPerPeriod}
          totalAnnualRent={page.totalAnnualRent}
          statusLabel={page.statusLabel}
          onEditContract={page.handleOpenContractEdit}
          onDeleteContract={(id, name) => page.setDeleteTarget({ type: 'contract', id, name })}
        />

        <AccountsCollectionTable
          contracts={page.contracts}
          collectionData={page.collectionData}
          editingIndex={page.editingIndex}
          editData={page.editData}
          setEditData={page.setEditData}
          onStartEdit={page.handleStartEdit}
          onCancelEdit={page.handleCancelEdit}
          onSaveEdit={page.handleSaveEdit}
          totalExpectedPayments={page.totalExpectedPayments}
          totalPaidMonths={page.totalPaidMonths}
          totalCollectedAll={page.totalCollectedAll}
          totalArrearsAll={page.totalArrearsAll}
          isUpdatePending={page.updateContractPending}
          isUpsertPending={page.upsertPaymentPending}
        />

        <AccountsIncomeTable
          incomeCount={page.income.length}
          incomeBySource={page.incomeBySource}
          totalIncome={page.totalIncome}
        />

        <AccountsExpensesTable
          expensesCount={page.expenses.length}
          expensesByType={page.expensesByType}
          totalExpenses={page.totalExpenses}
        />

        <AccountsDistributionTable
          waqfCorpusPrevious={page.waqfCorpusPrevious}
          totalIncome={page.totalIncome}
          grandTotal={page.grandTotal}
          totalExpenses={page.totalExpenses}
          netAfterExpenses={page.netAfterExpenses}
          manualVat={page.manualVat}
          netAfterVat={page.netAfterVat}
          zakatAmount={page.zakatAmount}
          netAfterZakat={page.netAfterZakat}
          adminPercent={page.adminPercent}
          adminShare={page.adminShare}
          waqifPercent={page.waqifPercent}
          waqifShare={page.waqifShare}
          waqfRevenue={page.waqfRevenue}
          waqfCorpusManual={page.waqfCorpusManual}
          availableAmount={page.availableAmount}
          manualDistributions={page.manualDistributions}
          remainingBalance={page.remainingBalance}
        />

        <AccountsBeneficiariesTable
          beneficiaries={page.beneficiaries}
          manualDistributions={page.manualDistributions}
          totalBeneficiaryPercentage={page.totalBeneficiaryPercentage}
        />

        <AccountsSavedTable
          accounts={page.accounts}
          isLoading={page.isLoading}
          onDeleteAccount={(id, name) => page.setDeleteTarget({ type: 'account', id, name })}
        />

        <AccountsDialogs
          deleteTarget={page.deleteTarget}
          setDeleteTarget={page.setDeleteTarget}
          onConfirmDelete={page.handleConfirmDelete}
          contractEditOpen={page.contractEditOpen}
          setContractEditOpen={page.setContractEditOpen}
          editingContractData={page.editingContractData}
          setEditingContractData={page.setEditingContractData}
          onSaveContractEdit={page.handleSaveContractEdit}
          isUpdatePending={page.updateContractPending}
        />

        <CloseYearDialog
          open={page.closeYearOpen}
          onOpenChange={page.setCloseYearOpen}
          onConfirm={page.handleCloseYear}
          isClosing={page.isClosingYear}
          fyLabel={page.selectedFY?.label}
          waqfCorpusManual={page.waqfCorpusManual}
        />
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
