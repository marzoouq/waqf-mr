import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect } from '@/components/ui/native-select';
import { FileText, Info, CalendarDays, Receipt, BarChart3, Plus } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import ContractAccordionGroup from '@/components/contracts/ContractAccordionGroup';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { buildCsv, downloadCsv } from '@/utils/csv';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';
import ContractStatsCards from '@/components/contracts/ContractStatsCards';
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import CollectionReport from '@/components/contracts/CollectionReport';
import PaymentInvoicesTab from '@/components/contracts/PaymentInvoicesTab';
import MonthlyAccrualTable from '@/components/contracts/MonthlyAccrualTable';
import { getPaymentTypeLabel } from '@/utils/contractHelpers';
import { safeNumber } from '@/utils/safeNumber';
import { useContractsPage } from '@/hooks/page/useContractsPage';
import { useAuth } from '@/hooks/auth/useAuthContext';

// مكونات مستخرجة
import ContractsFiltersBar from '@/components/contracts/ContractsFiltersBar';
import ContractsDialogs from '@/components/contracts/ContractsDialogs';

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
            <ExportMenu onExportPdf={async () => { const { generateContractsPDF } = await import('@/utils/pdf'); generateContractsPDF(contracts, pdfWaqfInfo); }} onExportCsv={() => {
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

            <ContractsFiltersBar
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              propertyFilter={propertyFilter} setPropertyFilter={setPropertyFilter}
              paymentTypeFilter={paymentTypeFilter} setPaymentTypeFilter={setPaymentTypeFilter}
              setCurrentPage={setCurrentPage} statusCounts={statusCounts} properties={properties}
              expiredContracts={expiredContracts} selectedForRenewal={selectedForRenewal}
              selectAllExpired={selectAllExpired} deselectAll={deselectAll} setBulkRenewOpen={setBulkRenewOpen}
              filteredGroupsLength={filteredGroups.length} allExpanded={allExpanded} toggleAllGroups={toggleAllGroups}
              isClosed={isClosed} role={role}
            />

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
                      {' '}أو اختر سنة مالية أخرى.</span>
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

        <ContractsDialogs
          bulkRenewOpen={bulkRenewOpen} setBulkRenewOpen={setBulkRenewOpen} bulkRenewing={bulkRenewing}
          selectedForRenewal={selectedForRenewal} expiredContracts={expiredContracts} onBulkRenew={handleBulkRenew}
          deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget} onConfirmDelete={handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default ContractsPage;
