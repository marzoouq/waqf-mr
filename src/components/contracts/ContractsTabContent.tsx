/**
 * محتوى تبويب العقود — مُستخرج من ContractsPage لتقليل حجم الصفحة
 */
import { Button } from '@/components/ui/button';
import { FileText, Lock, Info, RefreshCw, CheckSquare, Square, ShieldCheck } from 'lucide-react';
import ContractAccordionGroup from '@/components/contracts/ContractAccordionGroup';
import { TableSkeleton } from '@/components/common/SkeletonLoaders';
import TablePagination from '@/components/common/TablePagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import ContractStatsCards from '@/components/contracts/ContractStatsCards';
import ContractsFiltersBar from '@/components/contracts/ContractsFiltersBar';
import type { Tables } from '@/integrations/supabase/types';

interface ContractsTabContentProps {
  contracts: Tables<'contracts'>[];
  properties: Tables<'properties'>[];
  paymentInvoices: Tables<'payment_invoices'>[];
  invoicePaidMap: Record<string, boolean>;
  fiscalYearId: string;
  fiscalYears: Tables<'fiscal_years'>[];
  isClosed: boolean;
  role: string | null;
  isLoading: boolean;
  stats: { total: number; active: number; expired: number; cancelled: number; totalRent: number };
  expiredContracts: Tables<'contracts'>[];
  expiredIds: Set<string>;
  filteredGroups: [string, Tables<'contracts'>[]][];
  statusCounts: Record<string, number>;
  allExpanded: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  propertyFilter: string;
  setPropertyFilter: (v: string) => void;
  paymentTypeFilter: string;
  setPaymentTypeFilter: (v: string) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  ITEMS_PER_PAGE: number;
  selectedForRenewal: Set<string>;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleAllGroups: () => void;
  toggleSelection: (id: string) => void;
  selectAllExpired: () => void;
  deselectAll: () => void;
  setBulkRenewOpen: (v: boolean) => void;
  setFiscalYearId: (v: string) => void;
  setDeleteTarget: (v: { id: string; name: string } | null) => void;
  handleEdit: (c: Tables<'contracts'>) => void;
  handleRenew: (c: Tables<'contracts'>) => void;
}

const ContractsTabContent: React.FC<ContractsTabContentProps> = ({
  contracts, properties, paymentInvoices, invoicePaidMap,
  fiscalYearId, fiscalYears, isClosed, role, isLoading,
  stats, expiredContracts, expiredIds, filteredGroups, statusCounts, allExpanded,
  searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  propertyFilter, setPropertyFilter, paymentTypeFilter, setPaymentTypeFilter,
  currentPage, setCurrentPage, ITEMS_PER_PAGE,
  selectedForRenewal, expandedGroups, setExpandedGroups,
  toggleAllGroups, toggleSelection, selectAllExpired, deselectAll,
  setBulkRenewOpen, setFiscalYearId, setDeleteTarget, handleEdit, handleRenew,
}) => {
  return (
    <div className="space-y-5">
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
        statusFilter={statusFilter} setStatusFilter={(v) => setStatusFilter(v)}
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
    </div>
  );
};

export default ContractsTabContent;
