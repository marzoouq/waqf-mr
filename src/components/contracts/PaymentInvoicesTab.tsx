/**
 * تبويب فواتير الدفعات — عرض وإدارة فواتير العقود
 */
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, Receipt, CheckCircle2, Clock, AlertTriangle,
  Zap, TrendingUp, TrendingDown, FileWarning, Check, X, Download, Loader2, FileDown,
  ArrowUpDown, ArrowUp, ArrowDown, CalendarDays, Eye,
} from 'lucide-react';
import { generateOverdueInvoicesPDF } from '@/utils/pdf';
import TablePagination from '@/components/TablePagination';
import InvoiceStepsGuide from '@/components/invoices/InvoiceStepsGuide';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import InvoicePreviewDialog from '@/components/invoices/InvoicePreviewDialog';
import { fmt } from '@/utils/format';
import { usePaymentInvoicesTab, type FilterStatus, type SortKey } from '@/hooks/page/usePaymentInvoicesTab';

interface PaymentInvoicesTabProps {
  fiscalYearId: string;
  isClosed: boolean;
}

export default function PaymentInvoicesTab({ fiscalYearId, isClosed }: PaymentInvoicesTabProps) {
  const {
    isLoading, invoices, summary, sorted, groupedPaginated, ITEMS_PER_PAGE,
    search, setSearch, filter, setFilter, dateFrom, setDateFrom, dateTo, setDateTo,
    sortKey, sortDir, toggleSort,
    currentPage, setCurrentPage,
    selectedIds, unpaidFiltered, toggleSelect, toggleSelectAll, bulkPaying, handleBulkPay, clearSelection,
    payingInvoiceId, payDialog, setPayDialog, payAmount, setPayAmount, openPayDialog, handlePay,
    previewInvoice, setPreviewInvoice, handlePreviewTemplate,
    generateAll, markUnpaid, waqfInfo,
  } = usePaymentInvoicesTab(fiscalYearId);

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مسددة</Badge>;
      case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخرة</Badge>;
      case 'pending': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />قيد الانتظار</Badge>;
      case 'partially_paid': return <Badge className="bg-accent/20 text-accent-foreground border-0 gap-1"><Clock className="w-3 h-3" />جزئية</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-5">
      <InvoiceStepsGuide />

      {(!waqfInfo.vatNumber || !waqfInfo.commercialReg || !waqfInfo.address) && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <AlertDescription className="text-sm">
            لضمان امتثال الفاتورة الضريبية، يرجى إكمال بيانات المنشأة (الرقم الضريبي، السجل التجاري، العنوان) في{' '}
            <Link to="/dashboard/settings" className="underline font-medium text-primary hover:text-primary/80">الإعدادات</Link>
          </AlertDescription>
        </Alert>
      )}

      <InvoicePreviewDialog
        open={!!previewInvoice}
        onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
        invoice={previewInvoice}
      />

      {/* Dialog الدفع الجزئي */}
      <Dialog open={!!payDialog} onOpenChange={(open) => { if (!open) setPayDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسديد فاتورة {payDialog?.inv.invoice_number}</DialogTitle>
            <DialogDescription>أدخل المبلغ المدفوع — إذا كان أقل من الإجمالي ستُسجّل كدفعة جزئية</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي الفاتورة</span>
              <span className="font-bold">{fmt(Number(payDialog?.inv.amount || 0))} ر.س</span>
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-invoices-tab-field-1">المبلغ المدفوع (ر.س)</Label>
              <Input id="payment-invoices-tab-field-1" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min={0} max={Number(payDialog?.inv.amount || 0)} step="0.01" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayDialog(null)}>إلغاء</Button>
            <Button onClick={handlePay} className="gap-1"><Check className="w-4 h-4" />تسديد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Receipt, color: 'primary', label: 'إجمالي الفواتير', value: summary.total, sub: `${fmt(summary.totalAmount)} ر.س` },
          { icon: TrendingUp, color: 'success', label: 'مسددة', value: summary.paid, sub: `${fmt(summary.paidAmount)} ر.س` },
          { icon: TrendingDown, color: 'destructive', label: 'متأخرة', value: summary.overdue, sub: `${fmt(summary.overdueAmount)} ر.س` },
          { icon: FileWarning, color: 'warning', label: 'نسبة التحصيل', value: `${summary.collectionRate.toFixed(0)}%`, sub: undefined },
        ].map(({ icon: Icon, color, label, value, sub }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-lg font-bold ${color !== 'primary' && color !== 'warning' ? `text-${color}` : ''}`}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* شريط التحصيل */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">تقدم التحصيل</span>
            <span className="text-sm text-muted-foreground">
              {summary.paid} مسددة من {summary.total} فاتورة
              {summary.overdue > 0 && <span className="text-destructive mr-2">• {summary.overdue} متأخرة</span>}
            </span>
          </div>
          <Progress
            value={summary.collectionRate}
            className={`h-3 ${
              summary.collectionRate >= 80 ? '[&>div]:bg-success' :
              summary.collectionRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
            }`}
          />
        </CardContent>
      </Card>

      {/* أدوات */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالفاتورة أو المستأجر..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as FilterStatus)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({invoices.length})</SelectItem>
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
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" placeholder="من" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" placeholder="إلى" />
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

      {/* شريط التسديد الجماعي */}
      {!isClosed && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success/10">
          <Check className="w-4 h-4 text-success shrink-0" />
          <span className="text-sm font-medium">تم تحديد {selectedIds.size} فاتورة</span>
          <Button size="sm" className="gap-2 mr-auto" onClick={handleBulkPay} disabled={bulkPaying}>
            {bulkPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            تسديد المختارة
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* الجدول */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {invoices.length === 0 ? 'لا توجد فواتير. اضغط "توليد فواتير جميع العقود" لإنشائها.' : 'لا توجد فواتير مطابقة للبحث'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-4 md:hidden px-3 py-2">
                {[...groupedPaginated.entries()].map(([contractId, invs]) => {
                  const first = invs[0];
                  return (
                    <div key={contractId} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                       <span className="text-sm font-bold">{first?.contract?.contract_number || '-'}</span>
                        <span className="text-xs text-muted-foreground">— {first?.contract?.tenant_name}</span>
                      </div>
                      {invs.map(inv => (
                        <Card key={inv.id} className={`shadow-sm border-r-4 ${
                          inv.status === 'paid' ? 'border-r-success/60' :
                          inv.status === 'overdue' ? 'border-r-destructive/60' :
                          inv.status === 'partially_paid' ? 'border-r-warning/60' : 'border-r-muted-foreground/30'
                        }`}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {!isClosed && inv.status !== 'paid' && (
                                  <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />
                                )}
                                <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
                              </div>
                              {getStatusBadge(inv.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="text-muted-foreground text-xs">تاريخ الاستحقاق</span><p className="font-medium">{inv.due_date}</p></div>
                              <div><span className="text-muted-foreground text-xs">المبلغ</span><p className="font-medium">{fmt(Number(inv.amount))} ر.س</p></div>
                              {Number(inv.vat_amount) > 0 && <div><span className="text-muted-foreground text-xs">الضريبة</span><p className="font-medium">{fmt(Number(inv.vat_amount))} ر.س</p></div>}
                              {inv.paid_date && <div><span className="text-muted-foreground text-xs">تاريخ السداد</span><p className="font-medium text-success">{inv.paid_date}</p></div>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handlePreviewTemplate(inv)}><Eye className="w-3.5 h-3.5" />معاينة</Button>
                              <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handlePreviewTemplate(inv)}><Download className="w-3.5 h-3.5" />PDF</Button>
                              {!isClosed && inv.status !== 'paid' && (
                                <Button size="sm" variant="outline" className="gap-1 flex-1 text-success" onClick={() => openPayDialog(inv)} disabled={payingInvoiceId === inv.id}>
                                  {payingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}تسديد
                                </Button>
                              )}
                              {!isClosed && inv.status === 'paid' && (
                                <Button size="sm" variant="outline" className="gap-1 flex-1 text-muted-foreground" onClick={() => markUnpaid.mutate(inv.id)} disabled={markUnpaid.isPending}>
                                  <X className="w-3.5 h-3.5" />إلغاء
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {!isClosed && (
                        <TableHead className="w-10 text-center">
                          <Checkbox checked={unpaidFiltered.length > 0 && selectedIds.size === unpaidFiltered.length} onCheckedChange={toggleSelectAll} />
                        </TableHead>
                      )}
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">العقار</TableHead>
                      <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort('payment_number')}>
                        <span className="inline-flex items-center gap-1">رقم الدفعة <SortIcon field="payment_number" /></span>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                        <span className="inline-flex items-center gap-1">تاريخ الاستحقاق <SortIcon field="due_date" /></span>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                        <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" /></span>
                      </TableHead>
                      <TableHead className="text-right">الضريبة</TableHead>
                      <TableHead className="text-right">تاريخ السداد</TableHead>
                      <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort('status')}>
                        <span className="inline-flex items-center gap-1">الحالة <SortIcon field="status" /></span>
                      </TableHead>
                      <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...groupedPaginated.entries()].map(([contractId, invs]) => {
                      const first = invs[0];
                      return (
                        <>{/* صف عنوان المجموعة */}
                          <TableRow key={`header-${contractId}`} className="bg-muted/30 hover:bg-muted/40">
                            <TableCell colSpan={isClosed ? 10 : 11} className="py-2 px-4">
                              <span className="text-xs font-bold text-foreground">{first?.contract?.contract_number || '-'}</span>
                              <span className="text-xs text-muted-foreground mr-2">— {first?.contract?.tenant_name}</span>
                              <span className="text-xs text-muted-foreground mr-2">• {first?.contract?.property?.property_number || ''}</span>
                              <Badge variant="outline" className="text-[11px] px-1.5 py-0 mr-2">{invs.length} فاتورة</Badge>
                            </TableCell>
                          </TableRow>
                          {invs.map(inv => (
                            <TableRow key={inv.id} className={inv.status === 'overdue' ? 'bg-destructive/5' : ''}>
                              {!isClosed && (
                                <TableCell className="text-center">
                                  {inv.status !== 'paid' && <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />}
                                </TableCell>
                              )}
                              <TableCell className="font-medium font-mono text-xs">{inv.invoice_number}</TableCell>
                              <TableCell>{inv.contract?.tenant_name || '-'}</TableCell>
                              <TableCell>{inv.contract?.property?.property_number || '-'}</TableCell>
                              <TableCell className="text-center">{inv.payment_number}</TableCell>
                              <TableCell>{inv.due_date}</TableCell>
                              <TableCell>{fmt(Number(inv.amount))} ر.س</TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {Number(inv.vat_amount) > 0 ? `${fmt(Number(inv.vat_amount))} (${inv.vat_rate}%)` : 'معفاة'}
                              </TableCell>
                              <TableCell className={inv.paid_date ? 'text-success' : 'text-muted-foreground'}>{inv.paid_date || '-'}</TableCell>
                              <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreviewTemplate(inv)} title="معاينة الفاتورة"><Eye className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreviewTemplate(inv)} title="تحميل PDF"><Download className="w-3.5 h-3.5" /></Button>
                                  {!isClosed && (
                                    inv.status !== 'paid' ? (
                                      <Button size="sm" variant="ghost" className="gap-1 text-success h-8" onClick={() => openPayDialog(inv)} disabled={payingInvoiceId === inv.id}>
                                        {payingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}تسديد
                                      </Button>
                                    ) : (
                                      <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground h-8" onClick={() => markUnpaid.mutate(inv.id)} disabled={markUnpaid.isPending}>
                                        <X className="w-3.5 h-3.5" />إلغاء
                                      </Button>
                                    )
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <TablePagination currentPage={currentPage} totalItems={sorted.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    </div>
  );
}
