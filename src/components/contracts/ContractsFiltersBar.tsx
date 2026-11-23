/**
 * شريط فلاتر العقود — بحث + حالة + عقار + نوع دفع
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatusCounts {
  all: number;
  active: number;
  expired: number;
  cancelled: number;
  overdue: number;
  contractsInYear: number;
  contractsFromPrevious: number;
}

interface ContractsFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  propertyFilter: string;
  setPropertyFilter: (v: string) => void;
  paymentTypeFilter: string;
  setPaymentTypeFilter: (v: string) => void;
  statusCounts: StatusCounts;
  properties: Array<{ id: string; property_number: string; location: string }>;
  hasGroups: boolean;
  allExpanded: boolean;
  toggleAllGroups: () => void;
  resetPage: () => void;
  /** بداية السنة المالية الحالية. null في وضع "كل السنوات" — يُخفي فلاتر السنة. */
  fiscalYearStartDate: string | null;
}

export default function ContractsFiltersBar({
  searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  propertyFilter, setPropertyFilter, paymentTypeFilter, setPaymentTypeFilter,
  statusCounts, properties, hasGroups, allExpanded, toggleAllGroups, resetPage,
  fiscalYearStartDate,
}: ContractsFiltersBarProps) {
  const showYearFilters = fiscalYearStartDate !== null;
  const pills: Array<{ value: string; label: string; count: number }> = [
    { value: 'all', label: 'الكل', count: statusCounts.all },
    { value: 'active', label: 'نشط', count: statusCounts.active },
    { value: 'overdue', label: 'متأخر > 30 يوم', count: statusCounts.overdue },
    { value: 'expired', label: 'منتهي', count: statusCounts.expired },
    { value: 'cancelled', label: 'ملغي', count: statusCounts.cancelled },
    ...(showYearFilters ? [
      { value: 'contractsInYear', label: 'جديدة في السنة', count: statusCounts.contractsInYear },
      { value: 'contractsFromPrevious', label: 'مستمرة من سنة سابقة', count: statusCounts.contractsFromPrevious },
    ] : []),
  ];
  return (
    <div className="space-y-3">
    {/* فلاتر الحالة — كبسولات بأعدادها (بديل القائمة المنسدلة) */}
    <div role="radiogroup" aria-label="حالة العقود" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {pills.map((p) => (
        <button
          key={p.value} type="button" role="radio" aria-checked={statusFilter === p.value}
          onClick={() => { setStatusFilter(p.value); resetPage(); }}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 h-9 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            statusFilter === p.value ? 'bg-primary text-primary-foreground border-primary font-bold' : 'bg-card text-foreground hover:bg-accent',
          )}
        >
          {p.label}
          <bdi dir="ltr" className={cn('num text-xs font-bold', statusFilter === p.value ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{p.count}</bdi>
        </button>
      ))}
    </div>
    <div className="flex flex-wrap items-start sm:items-center gap-3">
      <div className="relative w-full sm:max-w-md sm:flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input name="searchQuery" placeholder="بحث بالاسم أو رقم العقد..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }} className="ps-10" />
      </div>
      <Select value={propertyFilter} onValueChange={(v) => { setPropertyFilter(v); resetPage(); }}>
        <SelectTrigger className="w-full sm:w-48 shrink-0"><SelectValue placeholder="كل العقارات" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل العقارات</SelectItem>
          {properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={paymentTypeFilter} onValueChange={(v) => { setPaymentTypeFilter(v); resetPage(); }}>
        <SelectTrigger className="w-full sm:w-40 shrink-0"><SelectValue placeholder="نوع الدفع" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل الأنواع</SelectItem>
          <SelectItem value="monthly">شهري</SelectItem>
          <SelectItem value="quarterly">ربع سنوي</SelectItem>
          <SelectItem value="semi_annual">نصف سنوي</SelectItem>
          <SelectItem value="annual">سنوي</SelectItem>
        </SelectContent>
      </Select>
      {hasGroups && (
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={toggleAllGroups}>
          <ChevronsUpDown className="w-4 h-4" />{allExpanded ? 'طي الكل' : 'توسيع الكل'}
        </Button>
      )}
    </div>
    </div>
  );
}
