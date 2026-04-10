/**
 * تقرير التحصيل — يجمع الفلاتر والبطاقات والجداول
 */
import { Card, CardContent } from '@/components/ui/card';
import { usePrint } from '@/hooks/ui/usePrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Search, Bell } from 'lucide-react';
import { Contract } from '@/types/database';

import { ExportMenu, TablePagination } from '@/components/common';
import { fmt } from '@/utils/format/format';

import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';
import { useCollectionData, type CollectionFilterStatus } from '@/hooks/page/admin/financial/useCollectionData';
import { useCollectionAlerts } from '@/hooks/data/contracts/useCollectionAlerts';
import CollectionSummaryCards from './CollectionSummaryCards';
import CollectionMobileCards from './CollectionMobileCards';
import CollectionDesktopTable from './CollectionDesktopTable';

interface CollectionReportProps {
  contracts: Contract[];
  paymentInvoices: PaymentInvoice[];
  isLoading: boolean;
  fiscalYears?: FiscalYear[];
  fiscalYearId?: string;
}

const ITEMS_PER_PAGE = 15;

export default function CollectionReport({ contracts, paymentInvoices, isLoading, fiscalYears = [], fiscalYearId = 'all' }: CollectionReportProps) {
  const { sendingAlerts, sendLatePaymentAlerts } = useCollectionAlerts();
  const print = usePrint();

  const {
    rows, filteredRows, summary,
    filter, setFilter,
    search, setSearch,
    currentPage, setCurrentPage,
    useDynamicAllocation,
  } = useCollectionData({ contracts, paymentInvoices, fiscalYears, fiscalYearId });

  const handleSendAlerts = () => {
    const overdueCount = rows.filter(r => r.overdue > 0).length;
    sendLatePaymentAlerts(overdueCount);
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>;

  const expectedLabel = useDynamicAllocation ? 'المتوقع في هذه السنة' : 'إجمالي الإيجارات';

  return (
    <div className="space-y-5">
      <CollectionSummaryCards summary={summary} expectedLabel={expectedLabel} />

      {/* أدوات الفلترة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input name="search" id="collection-report-field-1" placeholder="بحث بالعقد أو المستأجر..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as CollectionFilterStatus)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({rows.length})</SelectItem>
            <SelectItem value="overdue">متأخر ({rows.filter(r => r.overdue > 0).length})</SelectItem>
            <SelectItem value="partial">جزئي ({rows.filter(r => r.status === 'partial').length})</SelectItem>
            <SelectItem value="complete">مكتمل ({rows.filter(r => r.status === 'complete').length})</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleSendAlerts} disabled={sendingAlerts}>
          <Bell className="w-4 h-4" />
          {sendingAlerts ? 'جاري الإرسال...' : 'إرسال تنبيهات التأخير'}
        </Button>
        <ExportMenu hidePdf onPrint={print} />
      </div>

      {/* الجدول */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">{filter === 'overdue' ? 'لا توجد دفعات متأخرة 🎉' : 'لا توجد عقود مطابقة'}</p>
            </div>
          ) : (
            <>
              <CollectionMobileCards rows={filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)} />
              <CollectionDesktopTable rows={filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)} expectedLabel={expectedLabel} />

              {/* شريط ملخص المجاميع */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-t text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">الإجمالي: <span className="font-bold text-foreground">{fmt(summary.totalExpected)} ر.س</span></span>
                  <span className="text-muted-foreground">المحصّل: <span className="font-bold text-success">{fmt(summary.totalCollected)} ر.س</span></span>
                  {summary.totalOverdue > 0 && (
                    <span className="text-muted-foreground">المتأخر: <span className="font-bold text-destructive">{fmt(summary.totalOverdue)} ر.س</span></span>
                  )}
                </div>
                <span className="text-muted-foreground">{filteredRows.length} عقد</span>
              </div>
            </>
          )}
          <TablePagination currentPage={currentPage} totalItems={filteredRows.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    </div>
  );
}
