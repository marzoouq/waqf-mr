/**
 * شريط فلاتر سجل المراجعة — بحث + جدول + عملية + تاريخ
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, CalendarDays, X } from 'lucide-react';

interface AuditLogFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  tableFilter: string;
  setTableFilter: (v: string) => void;
  opFilter: string;
  setOpFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  hasDateFilter: boolean;
  clearDateFilters: () => void;
  setCurrentPage: (p: number) => void;
}

const AuditLogFilters = ({
  searchQuery, setSearchQuery,
  tableFilter, setTableFilter,
  opFilter, setOpFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  hasDateFilter, clearDateFilters,
  setCurrentPage,
}: AuditLogFiltersProps) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input name="searchQuery" placeholder="بحث..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-9" />
      </div>
      <div className="flex gap-3">
        <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="flex-1 sm:w-[160px]"><SelectValue placeholder="الجدول" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الجداول</SelectItem>
            <SelectItem value="income">الدخل</SelectItem>
            <SelectItem value="expenses">المصروفات</SelectItem>
            <SelectItem value="accounts">الحسابات</SelectItem>
            <SelectItem value="distributions">التوزيعات</SelectItem>
            <SelectItem value="invoices">الفواتير</SelectItem>
            <SelectItem value="properties">العقارات</SelectItem>
            <SelectItem value="contracts">العقود</SelectItem>
            <SelectItem value="beneficiaries">المستفيدين</SelectItem>
            <SelectItem value="units">الوحدات</SelectItem>
            <SelectItem value="fiscal_years">السنوات المالية</SelectItem>
          </SelectContent>
        </Select>
        <Select value={opFilter} onValueChange={v => { setOpFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="العملية" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع العمليات</SelectItem>
            <SelectItem value="INSERT">إضافة</SelectItem>
            <SelectItem value="UPDATE">تعديل</SelectItem>
            <SelectItem value="DELETE">حذف</SelectItem>
            <SelectItem value="REOPEN">إعادة فتح</SelectItem>
            <SelectItem value="CLOSE">إقفال</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">من:</span>
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-[160px]" aria-label="تاريخ البداية" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">إلى:</span>
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-[160px]" aria-label="تاريخ النهاية" />
      </div>
      {hasDateFilter && (
        <Button variant="ghost" size="sm" onClick={clearDateFilters} className="gap-1 text-muted-foreground hover:text-destructive">
          <X className="w-4 h-4" />مسح التاريخ
        </Button>
      )}
    </div>
  </div>
);

export default AuditLogFilters;
