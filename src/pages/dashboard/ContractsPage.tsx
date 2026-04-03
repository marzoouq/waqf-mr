import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { FileText, Lock, Info, RefreshCw, CheckSquare, Square, Plus, CalendarDays, ShieldCheck, Receipt, BarChart3 } from 'lucide-react';
import PageHeaderCard from '@/components/layout/PageHeaderCard';
import ContractAccordionGroup from '@/components/contracts/ContractAccordionGroup';
import { TableSkeleton } from '@/components/common/SkeletonLoaders';
import TablePagination from '@/components/common/TablePagination';
import ExportMenu from '@/components/common/ExportMenu';
import { generateContractsPDF } from '@/utils/pdf';
import { buildCsv, downloadCsv } from '@/utils/csv';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import ContractStatsCards from '@/components/contracts/ContractStatsCards';
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import CollectionReport from '@/components/contracts/CollectionReport';
import PaymentInvoicesTab from '@/components/contracts/PaymentInvoicesTab';
import MonthlyAccrualTable from '@/components/contracts/MonthlyAccrualTable';
import ContractsFiltersBar from '@/components/contracts/ContractsFiltersBar';
import ContractDeleteDialog from '@/components/contracts/ContractDeleteDialog';
import BulkRenewDialog from '@/components/contracts/BulkRenewDialog';
import { getPaymentTypeLabel } from '@/utils/contractHelpers';
import { safeNumber } from '@/utils/safeNumber';
import { useContractsPage } from '@/hooks/page/useContractsPage';
import { useAuth } from '@/hooks/auth/useAuthContext';

const ContractsPage = () => {
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
              toast.success('تم تصدير العقود بنجاح');
            }} />
            <Button className="gradient-primary gap-2" onClick={() => { resetForm(); setIsOpen(true); }}><Plus className="w-4 h-4" />إضافة عقد</Button>
          </>}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <NativeSelect value={activeTab} onValueChange={setActiveTab} options={[
            { value: 'contracts', label: 'العقود' }, { value: 'accruals', label: 'الاستحقاقات الشهرية' },
            { value: 'invoices', label: 'فواتير الدفعات' }, { value: 'collection', label: 'تقرير التحصيل' },
          ]} className="md:hidden" />
          <TabsList className="hidden md:grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="contracts" className="gap-2"><FileText className="w-4 h-4" />العقود</TabsTrigger>
            <TabsTrigger value="accruals" className="gap-2"><CalendarDays className="w-4 h-4" />الاستحقاقات</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2"><Receipt className="w-4 h-4" />فواتير الدفعات</TabsTrigger>
            <TabsTrigger value="collection" className="gap-2"><BarChart3 className="w-4 h-4" />تقرير التحصيل</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-5">
            <ContractStatsCards stats={stats} isLoading={isLoading} />

            {expiredContracts.length > 0 && (
              <Alert className="border-destructive/40 bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-destructive font-medium">
                    يوجد {expiredContracts.length} عقد منتهي
                    {selectedForRenewal.size > 0 && <span className="text-foreground mr-1">— تم اختيار {selectedForRenewal.size}</span>}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={selectedForRenewal.size === expiredContracts.length ? deselectAll : selectAllExpired}>
                      {selectedForRenewal.size === expiredContracts.length ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                      {selectedForRenewal.size === expiredContracts.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </Button>
                    {selectedForRenewal.size > 0 && (
                      <Button size="sm" variant="destructive" className="gap-2 shrink-0" onClick={() => setBulkRenewOpen(true)}>
                        <RefreshCw className="w-4 h-4" />تجديد المختارة ({selectedForRenewal.size})
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <ContractsFiltersBar
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              statusFilter={statusFilter} setStatusFilter={(v) => setStatusFilter(v as typeof statusFilter)}
              propertyFilter={propertyFilter} setPropertyFilter={setPropertyFilter}
              paymentTypeFilter={paymentTypeFilter} setPaymentTypeFilter={setPaymentTypeFilter}
              statusCounts={statusCounts} properties={properties}
              hasGroups={filteredGroups.length > 0} allExpanded={allExpanded}
              toggleAllGroups={toggleAllGroups} resetPage={() => setCurrentPage(1)}
            />

            {isClosed && (
              role === 'admin' ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-success/30 bg-success/10 text-success text-sm">
                  <ShieldCheck className="w-4 h-4 shrink-0" /><span>سنة مقفلة — لديك صلاحية التعديل كناظر</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/10 text-warning text-sm">
                  <Lock className="w-4 h-4 shrink-0" /><span>سنة مقفلة — لا يمكن التعديل</span>
                </div>
              )
            )}

            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : filteredGroups.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد عقود مسجلة'}</p>
                {!searchQuery && contracts.length === 0 && fiscalYearId !== 'all' && fiscalYears.length > 1 && (
                  <div className="mt-4 mx-auto max-w-md flex items-center gap-2 p-3 rounded-lg border border-info/30 bg-info/10 text-info text-sm">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>لا توجد عقود في هذه السنة المالية. جرّب التبديل إلى{' '}
                      <button type="button" className="underline font-semibold hover:opacity-80" onClick={() => setFiscalYearId('all')}>جميع السنوات</button>
                      {' '}أو اختر سنة مالية أخرى من القائمة أعلاه.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(([baseNumber, group]) => (
                  <ContractAccordionGroup
                    key={baseNumber} baseNumber={baseNumber} contracts={group} invoices={paymentInvoices}
                    invoicePaidMap={invoicePaidMap} expiredIds={expiredIds} selectedForRenewal={selectedForRenewal}
                    onToggleSelection={toggleSelection} onEdit={handleEdit}
                    onDelete={(c) => setDeleteTarget({ id: c.id, name: `العقد ${c.contract_number}` })}
                    onRenew={handleRenew} isClosed={isClosed && role !== 'admin'} open={expandedGroups.has(baseNumber)}
                    onOpenChange={(isOpen) => {
                      setExpandedGroups(prev => {
                        const next = new Set(prev);
                        if (isOpen) next.add(baseNumber); else next.delete(baseNumber);
                        return next;
                      });
                    }}
                  />
                ))}
                <TablePagination currentPage={currentPage} totalItems={filteredGroups.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="accruals">
            <MonthlyAccrualTable contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYearId={fiscalYearId} fiscalYear={fiscalYears?.find(fy => fy.id === fiscalYearId) ?? null} />
          </TabsContent>
          <TabsContent value="invoices"><PaymentInvoicesTab fiscalYearId={fiscalYearId} isClosed={isClosed && role !== 'admin'} /></TabsContent>
          <TabsContent value="collection"><CollectionReport contracts={contracts} paymentInvoices={paymentInvoices} isLoading={isLoading} fiscalYears={fiscalYears} fiscalYearId={fiscalYearId} /></TabsContent>
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
