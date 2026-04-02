
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Clock, Search, Bell, CalendarRange } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Contract } from '@/types/database';

import ExportMenu from '@/components/common/ExportMenu';
import TablePagination from '@/components/common/TablePagination';
import { fmt } from '@/utils/format';

import type { FiscalYear } from '@/hooks/financial/useFiscalYears';
import type { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';
import { useCollectionData, type FilterStatus, type CollectionRow } from '@/hooks/page/useCollectionData';
import { useCollectionAlerts } from '@/hooks/page/useCollectionAlerts';
import CollectionSummaryCards from './CollectionSummaryCards';

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

  const getStatusBadge = (status: CollectionRow['status']) => {
    switch (status) {
      case 'complete': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مكتمل</Badge>;
      case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخر</Badge>;
      case 'partial': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />جزئي</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border-0">لم يبدأ</Badge>;
    }
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
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
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
        <ExportMenu
          hidePdf
          onPrint={() => window.print()}
        />
      </div>

      {/* جدول التفاصيل */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">{filter === 'overdue' ? 'لا توجد دفعات متأخرة 🎉' : 'لا توجد عقود مطابقة'}</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden px-3 py-2">
                {filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(row => (
                  <Card key={row.contract.id} className={`shadow-sm ${row.overdue > 0 ? 'border-destructive/30' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm">{row.contract.contract_number}</span>
                          <p className="text-xs text-muted-foreground">{row.contract.tenant_name}</p>
                          {row.contract.status === 'expired' && (
                            <Badge variant="outline" className="text-destructive border-destructive/30 text-[11px] mt-1">منتهي</Badge>
                          )}
                        </div>
                        {getStatusBadge(row.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground text-xs">الدفعات</span>
                          <p className="font-medium">
                            {row.paid}/{row.paymentCount}
                            {row.spansMultipleYears && (
                              <span className="text-muted-foreground text-[11px] mr-1">({row.totalContractPayments} إجمالي)</span>
                            )}
                          </p>
                        </div>
                        <div><span className="text-muted-foreground text-xs">قيمة الدفعة</span><p className="font-medium">{fmt(row.paymentAmount)} ر.س</p></div>
                        <div><span className="text-muted-foreground text-xs">المحصّل</span><p className="font-medium text-success">{fmt(row.collectedAmount)} ر.س</p></div>
                        {row.overdue > 0 && (
                          <div><span className="text-muted-foreground text-xs">المتأخر</span><p className="font-medium text-destructive">{fmt(row.overdueAmount)} ر.س</p></div>
                        )}
                      </div>
                      <Progress
                        value={row.paymentCount > 0 ? (row.paid / row.paymentCount) * 100 : 0}
                        className={`h-2 ${row.status === 'complete' ? '[&>div]:bg-success' : row.overdue > 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">العقار</TableHead>
                      <TableHead className="text-right">{expectedLabel}</TableHead>
                      <TableHead className="text-right">قيمة الدفعة</TableHead>
                      <TableHead className="text-center">الدفعات</TableHead>
                      <TableHead className="text-right">المحصّل</TableHead>
                      <TableHead className="text-right">المتأخر</TableHead>
                      <TableHead className="text-center">التقدم</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(row => (
                      <TableRow key={row.contract.id} className={row.overdue > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">
                          {row.contract.contract_number}
                          {row.contract.status === 'expired' && (
                            <Badge variant="outline" className="text-destructive border-destructive/30 text-[11px] mr-2">منتهي</Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.contract.tenant_name}</TableCell>
                        <TableCell>{row.contract.property?.property_number || '-'}</TableCell>
                        <TableCell>{fmt(row.totalAmount)} ر.س</TableCell>
                        <TableCell>{fmt(row.paymentAmount)} ر.س</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${row.overdue > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {row.paid}/{row.paymentCount}
                            {row.spansMultipleYears && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-0.5 mr-1 cursor-help">
                                      <CalendarRange className="w-3 h-3 text-warning inline" />
                                      <span className="text-muted-foreground text-[11px]">/{row.totalContractPayments}</span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-right">
                                    <p className="font-bold mb-1">عقد ممتد على أكثر من سنة</p>
                                    <p>المخصص لهذه السنة: {row.paymentCount} دفعات</p>
                                    <p>إجمالي العقد: {row.totalContractPayments} دفعة</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                          {row.overdue > 0 && (
                            <span className="text-xs text-destructive block">({row.overdue} متأخرة)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-success font-medium">{fmt(row.collectedAmount)} ر.س</TableCell>
                        <TableCell className={`font-medium ${row.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {row.overdueAmount > 0 ? `${fmt(row.overdueAmount)} ر.س` : '-'}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={row.paymentCount > 0 ? (row.paid / row.paymentCount) * 100 : 0}
                            className={`h-2 w-20 mx-auto ${row.status === 'complete' ? '[&>div]:bg-success' : row.overdue > 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRows.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
