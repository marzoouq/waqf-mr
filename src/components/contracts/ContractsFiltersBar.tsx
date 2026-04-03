/**
 * شريط فلاتر العقود — بحث + حالة + عقار + نوع دفع
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronsUpDown, Filter } from 'lucide-react';

interface StatusCounts { all: number; active: number; expired: number; cancelled: number; overdue: number }

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
}

export default function ContractsFiltersBar({
  searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  propertyFilter, setPropertyFilter, paymentTypeFilter, setPaymentTypeFilter,
  statusCounts, properties, hasGroups, allExpanded, toggleAllGroups, resetPage,
}: ContractsFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-start sm:items-center gap-3">
      <div className="relative w-full sm:max-w-md sm:flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input name="searchQuery" placeholder="بحث في العقود..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }} className="pr-10" />
      </div>
      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage(); }}>
        <SelectTrigger className="w-full sm:w-48 shrink-0"><Filter className="w-4 h-4 ml-2" /><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل ({statusCounts.all})</SelectItem>
          <SelectItem value="active">نشط ({statusCounts.active})</SelectItem>
          <SelectItem value="expired">منتهي ({statusCounts.expired})</SelectItem>
          <SelectItem value="cancelled">ملغي ({statusCounts.cancelled})</SelectItem>
          <SelectItem value="overdue">متأخر &gt; 30 يوم ({statusCounts.overdue})</SelectItem>
        </SelectContent>
      </Select>
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
  );
}
