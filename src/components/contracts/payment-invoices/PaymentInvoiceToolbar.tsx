/**
 * شريط أدوات فواتير الدفعات — بحث + فلاتر + أزرار التوليد والتصدير
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Zap, AlertTriangle, FileDown, CalendarDays, X } from 'lucide-react';
import { generateOverdueInvoicesPDF } from '@/utils/pdf';
import type { FilterStatus } from '@/hooks/page/usePaymentInvoicesTab';
import type { PdfWaqfInfo } from '@/utils/pdf/core';
import type { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';

interface PaymentInvoiceToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  filter: FilterStatus;
  setFilter: (v: FilterStatus) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  invoicesCount: number;
  summary: { pending: number; overdue: number; paid: number; partiallyPaid: number };
  isClosed: boolean;
  fiscalYearId: string;
  generateAll: { mutate: () => void; isPending: boolean };
  invoices: PaymentInvoice[];
  waqfInfo: PdfWaqfInfo;
}

export default function PaymentInvoiceToolbar({
  search, setSearch, filter, setFilter,
  dateFrom, setDateFrom, dateTo, setDateTo,
  invoicesCount, summary,
  isClosed, fiscalYearId,
  generateAll, invoices, waqfInfo,
}: PaymentInvoiceToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      <div className="relative max-w-xs flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input name="search" id="payment-invoices-tab-field-1" placeholder="بحث بالفاتورة أو المستأجر..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>
      <Select value={filter} onValueChange={v => setFilter(v as FilterStatus)}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل ({invoicesCount})</SelectItem>
          <SelectItem value="pending">قيد الانتظار ({summary.pending})</SelectItem>
          <SelectItem value="overdue">متأخرة ({summary.overdue})</SelectItem>
          <SelectItem value="paid">مسددة ({summary.paid})</SelectItem>
          {summary.partiallyPaid > 0 && (
            <SelectItem value="partially_paid">مسددة جزئياً ({summary.partiallyPaid})</SelectItem>
          )}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input name="dateFrom" id="payment-invoices-tab-field-2" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" placeholder="من" />
        <span className="text-muted-foreground text-xs">—</span>
        <Input name="dateTo" id="payment-invoices-tab-field-3" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" placeholder="إلى" />
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setDateFrom(''); setDateTo(''); }} title="مسح التاريخ">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {!isClosed && fiscalYearId && fiscalYearId !== 'all' && (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
          <Zap className="w-4 h-4" />
          {generateAll.isPending ? 'جاري التوليد...' : 'توليد فواتير جميع العقود'}
        </Button>
      )}
      {summary.overdue > 0 && (
        <Button
          variant="outline" size="sm"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => generateOverdueInvoicesPDF(invoices, waqfInfo)}
        >
          <AlertTriangle className="w-4 h-4" />
          <FileDown className="w-4 h-4" />
          تصدير المتأخرة PDF ({summary.overdue})
        </Button>
      )}
    </div>
  );
}
