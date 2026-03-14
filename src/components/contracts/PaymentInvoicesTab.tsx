import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Search, Receipt, CheckCircle2, Clock, AlertTriangle,
  Zap, TrendingUp, TrendingDown, FileWarning, Check, X, Download, Loader2, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PaymentInvoice,
  usePaymentInvoices,
  useGenerateAllInvoices,
  useMarkInvoicePaid,
  useMarkInvoiceUnpaid,
} from '@/hooks/usePaymentInvoices';
import { generatePaymentInvoicePDF, generateOverdueInvoicesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import TablePagination from '@/components/TablePagination';
import InvoiceStepsGuide from '@/components/invoices/InvoiceStepsGuide';

interface PaymentInvoicesTabProps {
  fiscalYearId: string;
  isClosed: boolean;
}

type FilterStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'partially_paid';

export default function PaymentInvoicesTab({ fiscalYearId, isClosed }: PaymentInvoicesTabProps) {
  const { data: invoices = [], isLoading } = usePaymentInvoices(fiscalYearId);
  const generateAll = useGenerateAllInvoices();
  const markPaid = useMarkInvoicePaid();
  const markUnpaid = useMarkInvoiceUnpaid();
  const waqfInfo = usePdfWaqfInfo();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 15;

  const summary = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const partiallyPaid = invoices.filter(i => i.status === 'partially_paid').length;
    const totalAmount = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
    const paidAmount = invoices.filter(i => i.status === 'paid' || i.status === 'partially_paid').reduce((s, i) => s + Number(i.paid_amount || (i.status === 'paid' ? i.amount : 0) || 0), 0);
    const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount || 0), 0);
    const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    return { total, paid, overdue, pending, partiallyPaid, totalAmount, paidAmount, overdueAmount, collectionRate };
  }, [invoices]);

  const filtered = useMemo(() => {
    let result = invoices;
    if (filter === 'paid') result = result.filter(i => i.status === 'paid');
    else if (filter === 'overdue') result = result.filter(i => i.status === 'overdue');
    else if (filter === 'pending') result = result.filter(i => i.status === 'pending');
    else if (filter === 'partially_paid') result = result.filter(i => i.status === 'partially_paid');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.contract?.tenant_name?.toLowerCase().includes(q) ||
        i.contract?.contract_number?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, filter, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleDownloadPdf = async (inv: PaymentInvoice) => {
    setLoadingInvoiceId(inv.id);
    try {
      const blobUrl = await generatePaymentInvoicePDF({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        contractNumber: inv.contract?.contract_number || '-',
        tenantName: inv.contract?.tenant_name || '-',
        propertyNumber: inv.contract?.property?.property_number || '-',
        paymentNumber: inv.payment_number,
        totalPayments: inv.contract?.payment_count || 1,
        amount: Number(inv.amount),
        dueDate: inv.due_date,
        status: inv.status,
        paidDate: inv.paid_date,
        paidAmount: inv.paid_amount,
        notes: inv.notes,
        vatRate: inv.vat_rate ?? 0,
        vatAmount: inv.vat_amount ?? 0,
      }, waqfInfo);

      if (blobUrl) {
        // تحميل مباشر عبر <a> لتجنب حظر المتصفح للنوافذ المنبثقة
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `فاتورة-${inv.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success('تم تصدير الفاتورة بنجاح');
      } else {
        toast.info('تم حفظ الفاتورة محلياً');
      }
    } catch {
      toast.error('حدث خطأ أثناء تصدير الفاتورة');
    } finally {
      setLoadingInvoiceId(null);
    }
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
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الفواتير</p>
              <p className="text-lg font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">{summary.totalAmount.toLocaleString()} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">مسددة</p>
              <p className="text-lg font-bold text-success">{summary.paid}</p>
              <p className="text-xs text-muted-foreground">{summary.paidAmount.toLocaleString()} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متأخرة</p>
              <p className="text-lg font-bold text-destructive">{summary.overdue}</p>
              <p className="text-xs text-muted-foreground">{summary.overdueAmount.toLocaleString()} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileWarning className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
              <p className="text-lg font-bold">{summary.collectionRate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالفاتورة أو المستأجر..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>
        <Select value={filter} onValueChange={v => { setFilter(v as FilterStatus); setCurrentPage(1); }}>
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
        {!isClosed && fiscalYearId && fiscalYearId !== 'all' && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
            <Zap className="w-4 h-4" />
            {generateAll.isPending ? 'جاري التوليد...' : 'توليد فواتير جميع العقود'}
          </Button>
        )}
        {summary.overdue > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => generateOverdueInvoicesPDF(invoices, waqfInfo)}
          >
            <AlertTriangle className="w-4 h-4" />
            <FileDown className="w-4 h-4" />
            تصدير المتأخرة PDF ({summary.overdue})
          </Button>
        )}
      </div>

      {/* الجدول */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {invoices.length === 0
                  ? 'لا توجد فواتير. اضغط "توليد فواتير جميع العقود" لإنشائها.'
                  : 'لا توجد فواتير مطابقة للبحث'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden px-3 py-2">
                {paginated.map(inv => (
                  <Card key={inv.id} className={`shadow-sm ${inv.status === 'overdue' ? 'border-destructive/30' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm">{inv.invoice_number}</span>
                          <p className="text-xs text-muted-foreground">{inv.contract?.tenant_name}</p>
                        </div>
                        {getStatusBadge(inv.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground text-xs">تاريخ الاستحقاق</span><p className="font-medium">{inv.due_date}</p></div>
                        <div><span className="text-muted-foreground text-xs">المبلغ</span><p className="font-medium">{Number(inv.amount).toLocaleString()} ر.س</p></div>
                        {inv.paid_date && <div><span className="text-muted-foreground text-xs">تاريخ السداد</span><p className="font-medium text-success">{inv.paid_date}</p></div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handleDownloadPdf(inv)} disabled={loadingInvoiceId === inv.id}>
                          {loadingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}PDF
                        </Button>
                        {!isClosed && inv.status !== 'paid' && (
                          <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => markPaid.mutate({ invoiceId: inv.id, paidAmount: Number(inv.amount) })} disabled={markPaid.isPending}>
                            <Check className="w-3.5 h-3.5" />تسديد
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">العقار</TableHead>
                      <TableHead className="text-center">رقم الدفعة</TableHead>
                      <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">تاريخ السداد</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(inv => (
                      <TableRow key={inv.id} className={inv.status === 'overdue' ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium font-mono text-xs">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.contract?.tenant_name || '-'}</TableCell>
                        <TableCell className="text-xs">{inv.contract?.contract_number || '-'}</TableCell>
                        <TableCell>{inv.contract?.property?.property_number || '-'}</TableCell>
                        <TableCell className="text-center">{inv.payment_number}</TableCell>
                        <TableCell>{inv.due_date}</TableCell>
                        <TableCell>{Number(inv.amount).toLocaleString()} ر.س</TableCell>
                        <TableCell className={inv.paid_date ? 'text-success' : 'text-muted-foreground'}>{inv.paid_date || '-'}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDownloadPdf(inv)} title="تحميل PDF" disabled={loadingInvoiceId === inv.id}>
                              {loadingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            </Button>
                            {!isClosed && (
                              inv.status !== 'paid' ? (
                                <Button size="sm" variant="ghost" className="gap-1 text-success h-8" onClick={() => markPaid.mutate({ invoiceId: inv.id, paidAmount: Number(inv.amount) })} disabled={markPaid.isPending}>
                                  <Check className="w-3.5 h-3.5" />تسديد
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
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <TablePagination
            currentPage={currentPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
