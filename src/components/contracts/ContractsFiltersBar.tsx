/**
 * شريط فلاتر العقود المنتهية والبحث
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Lock, RefreshCw, CheckSquare, Square, ChevronsUpDown, Filter, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Contract } from '@/types/database';
import type { StatusFilterValue } from '@/hooks/page/useContractsFilters';

interface Property {
  id: string;
  property_number: string;
  location: string;
}

interface StatusCounts {
  all: number;
  active: number;
  expired: number;
  cancelled: number;
  overdue: number;
}

interface Props {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilterValue;
  setStatusFilter: (f: StatusFilterValue) => void;
  propertyFilter: string;
  setPropertyFilter: (f: string) => void;
  paymentTypeFilter: string;
  setPaymentTypeFilter: (f: string) => void;
  setCurrentPage: (p: number) => void;
  statusCounts: StatusCounts;
  properties: Property[];
  expiredContracts: Contract[];
  selectedForRenewal: Set<string>;
  selectAllExpired: () => void;
  deselectAll: () => void;
  setBulkRenewOpen: (open: boolean) => void;
  filteredGroupsLength: number;
  allExpanded: boolean;
  toggleAllGroups: () => void;
  isClosed: boolean;
  role: string | null;
}

export default function ContractsFiltersBar({
  searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  propertyFilter, setPropertyFilter, paymentTypeFilter, setPaymentTypeFilter,
  setCurrentPage, statusCounts, properties,
  expiredContracts, selectedForRenewal, selectAllExpired, deselectAll, setBulkRenewOpen,
  filteredGroupsLength, allExpanded, toggleAllGroups, isClosed, role,
}: Props) {
  return (
    <>
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

      <div className="flex flex-wrap items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input name="searchQuery" placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilterValue); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-48 shrink-0"><Filter className="w-4 h-4 ml-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({statusCounts.all})</SelectItem>
            <SelectItem value="active">نشط ({statusCounts.active})</SelectItem>
            <SelectItem value="expired">منتهي ({statusCounts.expired})</SelectItem>
            <SelectItem value="cancelled">ملغي ({statusCounts.cancelled})</SelectItem>
            <SelectItem value="overdue">متأخر &gt; 30 يوم ({statusCounts.overdue})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={(v) => { setPropertyFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-48 shrink-0"><SelectValue placeholder="كل العقارات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العقارات</SelectItem>
            {properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={paymentTypeFilter} onValueChange={(v) => { setPaymentTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 shrink-0"><SelectValue placeholder="نوع الدفع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="monthly">شهري</SelectItem>
            <SelectItem value="quarterly">ربع سنوي</SelectItem>
            <SelectItem value="semi_annual">نصف سنوي</SelectItem>
            <SelectItem value="annual">سنوي</SelectItem>
          </SelectContent>
        </Select>
        {filteredGroupsLength > 0 && (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={toggleAllGroups}>
            <ChevronsUpDown className="w-4 h-4" />{allExpanded ? 'طي الكل' : 'توسيع الكل'}
          </Button>
        )}
      </div>

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
    </>
  );
}
