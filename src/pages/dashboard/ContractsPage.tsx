import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { FileText, Plus, CalendarDays, ArrowLeft, Receipt, BarChart3 } from 'lucide-react';
import { ExportMenu } from '@/components/common';
import { ContractFormDialog, ContractDeleteDialog, BulkRenewDialog, ContractsTabContent, ConfirmRegenerateInvoicesDialog, ConfirmDeleteContractWithPendingDialog } from '@/components/contracts';
import { useContractsPage } from '@/hooks/page/admin/contracts/useContractsPage';
import { ContractsProvider } from '@/contexts/ContractsContext';
import { Skeleton } from '@/components/ui/skeleton';

// تبويبات ثانوية — تُحمّل عند الطلب فقط
const MonthlyAccrualTable = lazy(() => import('@/components/contracts/MonthlyAccrualTable'));

const TabFallback = () => <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

const ContractsPage = () => {
  // موجة 17 — كل المنطق + side-effect hooks في useContractsPage
  const ctx = useContractsPage();
  const {
    contracts, properties, paymentInvoices, fiscalYearId, fiscalYears,
    isLoading, isPending, isMobile,
    isOpen, setIsOpen, editingContract, deleteTarget, setDeleteTarget,
    bulkRenewOpen, setBulkRenewOpen, bulkRenewing, expiredContracts, selectedForRenewal,
    formInitialData, activeTab, setActiveTab,
    resetForm, handleFormSubmit, handleConfirmDelete, handleBulkRenew,
    handleExportPdf, handleExportCsv,
  } = ctx;

  return (
    <ContractsProvider value={ctx}>
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <PageHeaderCard
            title="إدارة العقود" icon={FileText} description="عرض وإدارة عقود الإيجار"
            actions={<>
              <ExportMenu onExportPdf={handleExportPdf} onExportCsv={handleExportCsv} />
              <Button className="gradient-primary gap-2" onClick={() => { resetForm(); setIsOpen(true); }}><Plus className="w-4 h-4" />إضافة عقد</Button>
            </>}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {isMobile ? (
              <NativeSelect value={activeTab} onValueChange={setActiveTab} options={[
                { value: 'contracts', label: 'العقود' }, { value: 'accruals', label: 'الاستحقاقات الشهرية' },
              ]} />
            ) : (
              <TabsList aria-label="حالة العقود" className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="contracts" className="gap-2"><FileText className="w-4 h-4" />العقود</TabsTrigger>
                <TabsTrigger value="accruals" className="gap-2"><CalendarDays className="w-4 h-4" />الاستحقاقات</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="contracts">
              <ContractsTabContent />
            </TabsContent>

            <TabsContent value="accruals">
              <Suspense fallback={<TabFallback />}>
                <MonthlyAccrualTable contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYearId={fiscalYearId} fiscalYear={fiscalYears?.find(fy => fy.id === fiscalYearId) ?? null} />
              </Suspense>
            </TabsContent>
          </Tabs>

          {/* روابط مختصرة لصفحات الاختصاص (بدل التبويبات السابقة) */}
          <Card className="shadow-sm bg-muted/30">
            <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">للفواتير الضريبية وتقرير التحصيل، انتقل إلى صفحات الاختصاص.</span>
              <div className="flex items-center gap-3">
                <Link to="/dashboard/invoices" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Receipt className="w-3.5 h-3.5" /> الفواتير الضريبية <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
                <Link to="/dashboard/income" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <BarChart3 className="w-3.5 h-3.5" /> تقرير التحصيل <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>


          <ContractFormDialog open={isOpen} onOpenChange={setIsOpen} editingContract={editingContract} properties={properties}
            activeContracts={contracts} onSubmit={handleFormSubmit} onReset={resetForm} isPending={isPending} initialFormData={formInitialData} />

          <BulkRenewDialog
            open={bulkRenewOpen} onOpenChange={setBulkRenewOpen}
            contracts={expiredContracts} selectedIds={selectedForRenewal}
            isRenewing={bulkRenewing} onConfirm={handleBulkRenew}
          />

          <ContractDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />

          <ConfirmRegenerateInvoicesDialog
            open={!!ctx.regenConfirmTarget}
            paidCount={ctx.regenConfirmTarget?.paidCount ?? 0}
            pendingCount={ctx.regenConfirmTarget?.pendingCount ?? 0}
            onOpenChange={(open) => { if (!open) ctx.resolveRegenerateConfirm(false); }}
            onConfirm={() => ctx.resolveRegenerateConfirm(true)}
          />

          <ConfirmDeleteContractWithPendingDialog
            open={!!ctx.confirmPendingDelete}
            pendingCount={ctx.confirmPendingDelete?.pendingCount ?? 0}
            contractName={ctx.confirmPendingDelete?.contractName ?? ''}
            onOpenChange={(open) => { if (!open) ctx.resolvePendingDelete(false); }}
            onConfirm={() => ctx.resolvePendingDelete(true)}
          />
        </div>
      </DashboardLayout>
    </ContractsProvider>
  );
};

export default ContractsPage;
