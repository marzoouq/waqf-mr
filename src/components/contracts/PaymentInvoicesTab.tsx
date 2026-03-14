import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
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
  // INV-CRIT-3: حالة تحميل خاصة بكل زر تسديد
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  // INV-CRIT-2: Dialog للدفع الجزئي
  const [payDialog, setPayDialog] = useState<{ inv: PaymentInvoice } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const ITEMS_PER_PAGE = 15;

  // INV-HIGH-2: إعادة الصفحة لـ 1 عند تغيير الفلتر أو البحث
  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const summary = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const partiallyPaid = invoices.filter(i => i.status === 'partially_paid').length;
    const totalAmount = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
    // INV-HIGH-1: إصلاح حساب paidAmount — استخدام paid_amount ?? amount للمسددة كلياً
    const paidAmount = invoices
      .filter(i => i.status === 'paid' || i.status === 'partially_paid')
      .reduce((s, i) => s + Number(i.paid_amount ?? (i.status === 'paid' ? i.amount : 0)), 0);
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

  // INV-CRIT-2: فتح Dialog التسديد
  const openPayDialog = (inv: PaymentInvoice) => {
    setPayDialog({ inv });
    setPayAmount(String(Number(inv.amount)));
  };

  // INV-CRIT-2: تنفيذ التسديد (كلي أو جزئي)
  const handlePay = () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    if (!(amount > 0)) { toast.error('يرجى إدخال مبلغ صحيح'); return; }
    const inv = payDialog.inv;
    setPayingInvoiceId(inv.id);
    setPayDialog(null);
    markPaid.mutate(
      { invoiceId: inv.id, paidAmount: amount },
      { onSettled: () => setPayingInvoiceId(null) },
    );
  };

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

      {/* INV-CRIT-2: Dialog الدفع الجزئي */}
      <Dialog open={!!payDialog} onOpenChange={(open) => { if (!open) setPayDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسديد فاتورة {payDialog?.inv.invoice_number}</DialogTitle>
            <DialogDescription>أدخل المبلغ المدفوع — إذا كان أقل من الإجمالي ستُسجّل كدفعة جزئية</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي الفاتورة</span>
              <span className="font-bold">{Number(payDialog?.inv.amount || 0).toLocaleString()} ر.س</span>
            </div>
            <div className="space-y-1">
              <Label>المبلغ المدفوع (ر.س)</Label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min={0} max={Number(payDialog?.inv.amount || 0)} step="0.01" />
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
              {/* Mobile Cards — مجمّعة حسب العقد */}
              <div className="space-y-4 md:hidden px-3 py-2">
                {(() => {
                  // تجميع الفواتير المُرقّمة حسب العقد
                  const grouped = new Map<string, PaymentInvoice[]>();
                  for (const inv of paginated) {
                    const key = inv.contract_id;
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key)!.push(inv);
                  }
                  return [...grouped.entries()].map(([contractId, invs]) => {
                    const first = invs[0];
                    return (
                      <div key={contractId} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-sm font-bold">{first.contract?.contract_number || '-'}</span>
                          <span className="text-xs text-muted-foreground">— {first.contract?.tenant_name}</span>
                        </div>
                        {invs.map(inv => (
                          <Card key={inv.id} className={`shadow-sm border-r-4 ${
                            inv.status === 'paid' ? 'border-r-success/60' :
                            inv.status === 'overdue' ? 'border-r-destructive/60' :
                            inv.status === 'partially_paid' ? 'border-r-warning/60' :
                            'border-r-muted-foreground/30'
                          }`}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
                                {getStatusBadge(inv.status)}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-muted-foreground text-xs">تاريخ الاستحقاق</span><p className="font-medium">{inv.due_date}</p></div>
                                <div><span className="text-muted-foreground text-xs">المبلغ</span><p className="font-medium">{Number(inv.amount).toLocaleString()} ر.س</p></div>
                                {Number(inv.vat_amount) > 0 && (
                                  <div><span className="text-muted-foreground text-xs">الضريبة</span><p className="font-medium">{Number(inv.vat_amount).toLocaleString()} ر.س</p></div>
                                )}
                                {inv.paid_date && <div><span className="text-muted-foreground text-xs">تاريخ السداد</span><p className="font-medium text-success">{inv.paid_date}</p></div>}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handleDownloadPdf(inv)} disabled={loadingInvoiceId === inv.id}>
                                  {loadingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}PDF
                                </Button>
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
                  });
                })()}
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
                      {/* INV-MED-1: عمود الضريبة */}
                      <TableHead className="text-right">الضريبة</TableHead>
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
                        {/* INV-MED-1: عرض مبلغ الضريبة */}
                        <TableCell className="text-muted-foreground text-xs">
                          {Number(inv.vat_amount) > 0 ? `${Number(inv.vat_amount).toLocaleString()} (${inv.vat_rate}%)` : 'معفاة'}
                        </TableCell>
                        <TableCell className={inv.paid_date ? 'text-success' : 'text-muted-foreground'}>{inv.paid_date || '-'}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDownloadPdf(inv)} title="تحميل PDF" disabled={loadingInvoiceId === inv.id}>
                              {loadingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            </Button>
                            {!isClosed && (
                              inv.status !== 'paid' ? (
                                // INV-CRIT-2 + INV-CRIT-3: Dialog جزئي + تعطيل خاص بالصف
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
