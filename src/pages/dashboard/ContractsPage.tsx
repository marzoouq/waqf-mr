import { lazy, Suspense } from 'react';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { FileText, Plus, CalendarDays, Receipt, BarChart3 } from 'lucide-react';
import { ExportMenu } from '@/components/common';
import { generateContractsPDF } from '@/utils/pdf';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';
import { ContractFormDialog, ContractDeleteDialog, BulkRenewDialog, ContractsTabContent } from '@/components/contracts';
import { getPaymentTypeLabel } from '@/utils/financial/contractHelpers';
import { safeNumber } from '@/utils/format/safeNumber';
import { useContractsPage } from '@/hooks/page/admin/useContractsPage';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// تبويبات ثانوية — تُحمّل عند الطلب فقط
const CollectionReport = lazy(() => import('@/components/contracts/CollectionReport'));
const PaymentInvoicesTab = lazy(() => import('@/components/contracts/PaymentInvoicesTab'));
const MonthlyAccrualTable = lazy(() => import('@/components/contracts/MonthlyAccrualTable'));

const TabFallback = () => <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

const ContractsPage = () => {
  const isMobile = useIsMobile();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { role } = useAuth();
  const {
    contracts, properties, paymentInvoices, invoicePaidMap,
    fiscalYearId, fiscalYears, isClosed, setFiscalYearId,
    isLoading, isPending,
    stats, expiredContracts, expiredIds, filteredGroups, statusCounts, allExpanded,
    isOpen, setIsOpen, editingContract, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage, bulkRenewOpen, setBulkRenewOpen, bulkRenewing,
    selectedForRenewal, formInitialData, expandedGroups, setExpandedGroups,
    statusFilter, setStatusFilter, propertyFilter, setPropertyFilter,
    paymentTypeFilter, setPaymentTypeFilter, activeTab, setActiveTab, ITEMS_PER_PAGE,
    resetForm, handleRenew, handleEdit, handleFormSubmit, handleConfirmDelete,
    handleBulkRenew, toggleSelection, selectAllExpired, deselectAll, toggleAllGroups,
  } = useContractsPage();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة العقود" icon={FileText} description="عرض وإدارة عقود الإيجار"
          actions={<>
            <ExportMenu onExportPdf={() => generateContractsPDF(contracts, pdfWaqfInfo)} onExportCsv={() => {
              const csv = buildCsv(contracts.map(c => ({
                'رقم العقد': c.contract_number, 'المستأجر': c.tenant_name,
                'الإيجار السنوي': safeNumber(c.rent_amount), 'تاريخ البداية': c.start_date,
                'تاريخ النهاية': c.end_date, 'نوع الدفع': getPaymentTypeLabel(c.payment_type),
                'الحالة': c.status === 'active' ? 'ساري' : c.status === 'cancelled' ? 'ملغي' : 'منتهي',
              })));
              downloadCsv(csv, 'عقود.csv');
              defaultNotify.success('تم تصدير العقود بنجاح');
            }} />
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
            <ContractsTabContent
              contracts={contracts} properties={properties} paymentInvoices={paymentInvoices}
              invoicePaidMap={invoicePaidMap} fiscalYearId={fiscalYearId} fiscalYears={fiscalYears}
              isClosed={isClosed} role={role} isLoading={isLoading}
              stats={stats} expiredContracts={expiredContracts} expiredIds={expiredIds}
              filteredGroups={filteredGroups} statusCounts={statusCounts} allExpanded={allExpanded}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter as (v: string) => void}
              propertyFilter={propertyFilter} setPropertyFilter={setPropertyFilter}
              paymentTypeFilter={paymentTypeFilter} setPaymentTypeFilter={setPaymentTypeFilter}
              currentPage={currentPage} setCurrentPage={setCurrentPage} ITEMS_PER_PAGE={ITEMS_PER_PAGE}
              selectedForRenewal={selectedForRenewal} expandedGroups={expandedGroups} setExpandedGroups={setExpandedGroups}
              toggleAllGroups={toggleAllGroups} toggleSelection={toggleSelection}
              selectAllExpired={selectAllExpired} deselectAll={deselectAll}
              setBulkRenewOpen={setBulkRenewOpen} setFiscalYearId={setFiscalYearId}
              setDeleteTarget={setDeleteTarget} handleEdit={handleEdit} handleRenew={handleRenew}
            />
          </TabsContent>

          <TabsContent value="accruals">
            <Suspense fallback={<TabFallback />}>
              <MonthlyAccrualTable contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYearId={fiscalYearId} fiscalYear={fiscalYears?.find(fy => fy.id === fiscalYearId) ?? null} />
            </Suspense>
          </TabsContent>
          <TabsContent value="invoices"><Suspense fallback={<TabFallback />}><PaymentInvoicesTab fiscalYearId={fiscalYearId} isClosed={isClosed && role !== 'admin'} /></Suspense></TabsContent>
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
  );
};

export default ContractsPage;
