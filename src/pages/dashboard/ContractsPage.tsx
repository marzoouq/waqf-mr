import { lazy, Suspense } from 'react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { FileText, Plus, CalendarDays, Receipt, BarChart3 } from 'lucide-react';
import { ExportMenu } from '@/components/common';
import { ContractFormDialog, ContractDeleteDialog, BulkRenewDialog, ContractsTabContent } from '@/components/contracts';
import { canModifyFiscalYear } from '@/utils/auth/permissions';
import { useContractsPage } from '@/hooks/page/admin/contracts/useContractsPage';
import { ContractsProvider } from '@/contexts/ContractsContext';
import { Skeleton } from '@/components/ui/skeleton';

// تبويبات ثانوية — تُحمّل عند الطلب فقط
const CollectionReport = lazy(() => import('@/components/contracts/CollectionReport'));
const PaymentInvoicesTab = lazy(() => import('@/components/contracts/PaymentInvoicesTab'));
const MonthlyAccrualTable = lazy(() => import('@/components/contracts/MonthlyAccrualTable'));

const TabFallback = () => <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

const ContractsPage = () => {
  // موجة 17 — كل المنطق + side-effect hooks في useContractsPage
  const ctx = useContractsPage();
  const {
    contracts, properties, paymentInvoices, fiscalYearId, fiscalYears, isClosed,
    isLoading, isPending, role, isMobile,
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
                { value: 'invoices', label: 'فواتير الدفعات' }, { value: 'collection', label: 'تقرير التحصيل' },
              ]} />
            ) : (
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="contracts" className="gap-2"><FileText className="w-4 h-4" />العقود</TabsTrigger>
                <TabsTrigger value="accruals" className="gap-2"><CalendarDays className="w-4 h-4" />الاستحقاقات</TabsTrigger>
                <TabsTrigger value="invoices" className="gap-2"><Receipt className="w-4 h-4" />فواتير الدفعات</TabsTrigger>
                <TabsTrigger value="collection" className="gap-2"><BarChart3 className="w-4 h-4" />تقرير التحصيل</TabsTrigger>
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
            <TabsContent value="invoices"><Suspense fallback={<TabFallback />}><PaymentInvoicesTab fiscalYearId={fiscalYearId} isClosed={!canModifyFiscalYear(role, isClosed)} /></Suspense></TabsContent>
            <TabsContent value="collection"><Suspense fallback={<TabFallback />}><CollectionReport contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYears={fiscalYears} fiscalYearId={fiscalYearId} /></Suspense></TabsContent>
          </Tabs>

          <ContractFormDialog open={isOpen} onOpenChange={setIsOpen} editingContract={editingContract} properties={properties}
            activeContracts={contracts} onSubmit={handleFormSubmit} onReset={resetForm} isPending={isPending} initialFormData={formInitialData} />

          <BulkRenewDialog
            open={bulkRenewOpen} onOpenChange={setBulkRenewOpen}
            contracts={expiredContracts} selectedIds={selectedForRenewal}
            isRenewing={bulkRenewing} onConfirm={handleBulkRenew}
          />

          <ContractDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
        </div>
      </DashboardLayout>
    </ContractsProvider>
  );
};

export default ContractsPage;
