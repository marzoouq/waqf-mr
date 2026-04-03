import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Plus, Lock, Wallet } from 'lucide-react';
import { ExportMenu, DeferredRender } from '@/components/common';
import { buildCsv, downloadCsv } from '@/utils/csv';
import { useAccountsPage } from '@/hooks/financial/useAccountsPage';
import { useAuth } from '@/hooks/auth/useAuthContext';

// مكونات أساسية (تُحمّل فوراً)
import { AccountsSettingsBar, AccountsSummaryCards, AccountsContractsTable, AccountsCollectionTable, AccountsDialogs } from '@/components/accounts';

// مكونات مؤجلة — تُحمّل عند الحاجة فقط
const AccountsIncomeTable = lazy(() => import('@/components/accounts/AccountsIncomeTable'));
const AccountsExpensesTable = lazy(() => import('@/components/accounts/AccountsExpensesTable'));
const AccountsDistributionTable = lazy(() => import('@/components/accounts/AccountsDistributionTable'));
const AccountsBeneficiariesTable = lazy(() => import('@/components/accounts/AccountsBeneficiariesTable'));
const AccountsSavedTable = lazy(() => import('@/components/accounts/AccountsSavedTable'));
const CloseYearDialog = lazy(() => import('@/components/accounts/CloseYearDialog'));

const SectionFallback = () => <Skeleton className="h-32 w-full rounded-lg" />;

const AccountsPage = () => {
  const { role } = useAuth();
  const page = useAccountsPage();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="الحسابات الختامية"
          icon={Wallet}
          description="إدارة ومتابعة الحسابات السنوية"
          actions={<>
            {page.isClosed && (
              <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
                <Lock className="w-3 h-3" /> سنة مقفلة - تعديل بصلاحية إدارية
              </span>
            )}
            <ExportMenu onExportPdf={page.handleExportPdf} onExportCsv={() => {
              const csv = buildCsv([{
                'السنة المالية': page.selectedFY?.label || '-',
                'إجمالي الإيرادات': page.totalIncome,
                'إجمالي المصروفات': page.totalExpenses,
                'صافي بعد المصروفات': page.netAfterExpenses,
                'الضريبة': page.manualVat,
                'الزكاة': page.zakatAmount,
                'حصة الناظر': page.adminShare,
                'حصة الواقف': page.waqifShare,
                'ريع الوقف': page.waqfRevenue,
                'رقبة الوقف': page.waqfCorpusManual,
                'المتاح للتوزيع': page.availableAmount,
              }]);
              downloadCsv(csv, `حسابات-${page.selectedFY?.label || 'عام'}.csv`);
            }} />
            <Button onClick={page.handleCreateAccount} className="gradient-primary gap-2" disabled={page.createAccountPending}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إنشاء حساب ختامي</span>
            </Button>
            {role === 'admin' && page.selectedFY && page.selectedFY.status === 'active' && (
              <Button variant="destructive" size="sm" onClick={() => page.setCloseYearOpen(true)} className="gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">إقفال السنة</span>
              </Button>
            )}
          </>}
        />

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
            {Array.from({ length: 14 }).map((_, i) => (
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
          netAfterZakat={page.netAfterZakat}
          adminPercent={page.adminPercent}
          adminShare={page.adminShare}
          waqifPercent={page.waqifPercent}
          waqifShare={page.waqifShare}
          waqfRevenue={page.waqfRevenue}
          waqfCorpusManual={page.waqfCorpusManual}
          manualDistributions={page.manualDistributions}
          remainingBalance={page.remainingBalance}
          isClosed={page.isClosed}
          usingFallbackPct={page.usingFallbackPct}
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

        <DeferredRender delay={600}>
          <Suspense fallback={<SectionFallback />}>
            <AccountsIncomeTable
              incomeCount={page.income.length}
              incomeBySource={page.incomeBySource}
              totalIncome={page.totalIncome}
            />
          </Suspense>
        </DeferredRender>

        <DeferredRender delay={900}>
          <Suspense fallback={<SectionFallback />}>
            <AccountsExpensesTable
              expensesCount={page.expenses.length}
              expensesByType={page.expensesByType}
              totalExpenses={page.totalExpenses}
            />
          </Suspense>
        </DeferredRender>

        <DeferredRender delay={1200}>
          <Suspense fallback={<SectionFallback />}>
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
              isClosed={page.isClosed}
            />
          </Suspense>
        </DeferredRender>

        <DeferredRender delay={1500}>
          <Suspense fallback={<SectionFallback />}>
            <AccountsBeneficiariesTable
              beneficiaries={page.beneficiaries}
              manualDistributions={page.manualDistributions}
              totalBeneficiaryPercentage={page.totalBeneficiaryPercentage}
              availableAmount={page.availableAmount}
              accountId={page.currentAccount?.id}
              fiscalYearId={page.fiscalYearId === 'all' ? undefined : page.fiscalYearId}
              fiscalYearLabel={page.selectedFY?.label}
            />
          </Suspense>
        </DeferredRender>

        <DeferredRender delay={1800}>
          <Suspense fallback={<SectionFallback />}>
            <AccountsSavedTable
              accounts={page.accounts}
              isLoading={page.isLoading}
              onDeleteAccount={(id, name) => page.setDeleteTarget({ type: 'account', id, name })}
            />
          </Suspense>
        </DeferredRender>

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

        <Suspense fallback={null}>
          <CloseYearDialog
            open={page.closeYearOpen}
            onOpenChange={page.setCloseYearOpen}
            onConfirm={page.handleCloseYear}
            isClosing={page.isClosingYear}
            fyLabel={page.selectedFY?.label}
            waqfCorpusManual={page.waqfCorpusManual}
            totalIncome={page.totalIncome}
            totalExpenses={page.totalExpenses}
            netAfterExpenses={page.netAfterExpenses}
            availableAmount={page.availableAmount}
            distributionsAmount={page.manualDistributions}
            hasAccount={!!page.currentAccount}
            pendingAdvances={page.pendingAdvances}
            unpaidInvoices={page.unpaidInvoices}
            beneficiaryPercentage={page.totalBeneficiaryPercentage}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
