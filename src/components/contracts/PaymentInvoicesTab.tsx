import { useMemo, useState, useEffect, useCallback } from 'react';
import { safeNumber } from '@/utils/safeNumber';
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
  ArrowUpDown, ArrowUp, ArrowDown, CalendarDays, FileText, Eye,
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
import type { InvoiceTemplate } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import TablePagination from '@/components/TablePagination';
import InvoiceStepsGuide from '@/components/invoices/InvoiceStepsGuide';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import InvoicePreviewDialog from '@/components/invoices/InvoicePreviewDialog';
import type { InvoicePreviewData } from '@/components/invoices/InvoicePreviewDialog';
import { safeNumber as sn } from '@/utils/safeNumber';
import { useContractsByFiscalYear } from '@/hooks/useContracts';

interface PaymentInvoicesTabProps {
  fiscalYearId: string;
  isClosed: boolean;
}

type FilterStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'partially_paid';
type SortKey = 'due_date' | 'amount' | 'status' | 'payment_number';
type SortDir = 'asc' | 'desc';

const statusOrder: Record<string, number> = { overdue: 0, pending: 1, partially_paid: 2, paid: 3 };

export default function PaymentInvoicesTab({ fiscalYearId, isClosed }: PaymentInvoicesTabProps) {
  const { data: invoices = [], isLoading } = usePaymentInvoices(fiscalYearId);
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const generateAll = useGenerateAllInvoices();
  const markPaid = useMarkInvoicePaid();
  const markUnpaid = useMarkInvoiceUnpaid();
  const waqfInfo = usePdfWaqfInfo();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ inv: PaymentInvoice } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  // معاينة القالب الجديد
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  // ترتيب بالأعمدة
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  // تسديد جماعي
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPaying, setBulkPaying] = useState(false);
  // فلتر نطاق التاريخ
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // قالب الفاتورة
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>('tax_professional');
  const ITEMS_PER_PAGE = 15;

  useEffect(() => { setCurrentPage(1); }, [filter, search, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const partiallyPaid = invoices.filter(i => i.status === 'partially_paid').length;
    const totalAmount = invoices.reduce((s, i) => s + safeNumber(i.amount), 0);
    const paidAmount = invoices
      .filter(i => i.status === 'paid' || i.status === 'partially_paid')
      .reduce((s, i) => s + safeNumber(i.paid_amount ?? (i.status === 'paid' ? i.amount : 0)), 0);
    const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + safeNumber(i.amount), 0);
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

    // فلتر نطاق التاريخ
    if (dateFrom) result = result.filter(i => i.due_date >= dateFrom);
    if (dateTo) result = result.filter(i => i.due_date <= dateTo);

    return result;
  }, [invoices, filter, search, dateFrom, dateTo]);

  // ترتيب
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'due_date': cmp = a.due_date.localeCompare(b.due_date); break;
        case 'amount': cmp = safeNumber(a.amount) - safeNumber(b.amount); break;
        case 'status': cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9); break;
        case 'payment_number': cmp = a.payment_number - b.payment_number; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  // تجميع الفواتير المُرقّمة حسب العقد (للجدول + الموبايل)
  const groupedPaginated = useMemo(() => {
    const grouped = new Map<string, PaymentInvoice[]>();
    for (const inv of paginated) {
      const key = inv.contract_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(inv);
    }
    return grouped;
  }, [paginated]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // تسديد جماعي
  const unpaidFiltered = useMemo(() => sorted.filter(i => i.status !== 'paid'), [sorted]);
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === unpaidFiltered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(unpaidFiltered.map(i => i.id)));
  };

  const handleBulkPay = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkPaying(true);
    const ids = [...selectedIds];
    let done = 0;
    for (const id of ids) {
      try {
        await markPaid.mutateAsync({ invoiceId: id });
        done++;
      } catch { /* يتابع */ }
    }
    setBulkPaying(false);
    setSelectedIds(new Set());
    toast.success(`تم تسديد ${done} فاتورة من ${ids.length}`);
  }, [selectedIds, markPaid]);

  const openPayDialog = (inv: PaymentInvoice) => {
    setPayDialog({ inv });
    setPayAmount(String(safeNumber(inv.amount)));
  };

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
      }, waqfInfo, invoiceTemplate);

      if (blobUrl) {
        try {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `فاتورة-${inv.invoice_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('تم تصدير الفاتورة بنجاح');
        } finally {
          // تحرير Blob URL دائماً لمنع تسريب الذاكرة
          URL.revokeObjectURL(blobUrl);
        }
      } else {
        toast.info('تم حفظ الفاتورة محلياً');
      }
    } catch {
      toast.error('حدث خطأ أثناء تصدير الفاتورة');
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  /** بناء بيانات المعاينة من فاتورة دفعة */
  const buildPaymentPreviewData = (inv: PaymentInvoice): InvoicePreviewData => {
    const fullContract = contracts.find(c => c.id === inv.contract_id);
    const hasBuyerTax = !!fullContract?.tenant_tax_number;
    const hasVat = sn(inv.vat_rate) > 0;
    const amountExVat = sn(inv.vat_amount) > 0
      ? sn(inv.amount) - sn(inv.vat_amount)
      : (sn(inv.vat_rate) > 0 ? sn(inv.amount) / (1 + sn(inv.vat_rate) / 100) : sn(inv.amount));

    return {
      invoiceNumber: inv.invoice_number,
      date: inv.due_date,
      type: (hasVat && hasBuyerTax) ? 'standard' : 'simplified',
      sellerName: waqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
      sellerAddress: waqfInfo.address,
      sellerVatNumber: waqfInfo.vatNumber,
      sellerCR: waqfInfo.commercialReg,
      sellerLogo: waqfInfo.logoUrl,
      buyerName: fullContract?.tenant_name || inv.contract?.tenant_name || '-',
      buyerVatNumber: fullContract?.tenant_tax_number || undefined,
      buyerCR: fullContract?.tenant_crn || undefined,
      buyerIdType: fullContract?.tenant_id_type || undefined,
      buyerIdNumber: fullContract?.tenant_id_number || undefined,
      buyerStreet: fullContract?.tenant_street || undefined,
      buyerDistrict: fullContract?.tenant_district || undefined,
      buyerCity: fullContract?.tenant_city || undefined,
      buyerPostalCode: fullContract?.tenant_postal_code || undefined,
      buyerBuilding: fullContract?.tenant_building || undefined,
      items: [{
        description: `إيجار — دفعة ${inv.payment_number}${inv.contract?.contract_number ? ` / عقد ${inv.contract.contract_number}` : ''}`,
        quantity: 1,
        unitPrice: amountExVat,
        vatRate: sn(inv.vat_rate),
      }],
      notes: inv.notes || undefined,
      status: inv.status,
      bankName: waqfInfo.bankName,
      bankIBAN: waqfInfo.bankIBAN,
      zatcaUuid: inv.zatca_uuid || undefined,
      zatcaStatus: inv.zatca_status || undefined,
    };
  };

  const handlePreviewTemplate = (inv: PaymentInvoice) => {
    setPreviewInvoice(buildPaymentPreviewData(inv));
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

      {/* تنبيه بيانات ناقصة للفاتورة الضريبية */}
      {(!waqfInfo.vatNumber || !waqfInfo.commercialReg || !waqfInfo.address) && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <AlertDescription className="text-sm">
            لضمان امتثال الفاتورة الضريبية، يرجى إكمال بيانات المنشأة (الرقم الضريبي، السجل التجاري، العنوان) في{' '}
            <Link to="/dashboard/settings" className="underline font-medium text-primary hover:text-primary/80">
              الإعدادات
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog معاينة الفاتورة — نظام القوالب الجديد */}
      <InvoicePreviewDialog
        open={!!previewInvoice}
        onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
        invoice={previewInvoice}
        onDownloadPdf={() => {
          // إيجاد الفاتورة الأصلية من بيانات المعاينة لتحميل PDF
          const origInv = invoices?.find(i => i.invoice_number === previewInvoice?.invoiceNumber);
          if (origInv) handleDownloadPdf(origInv);
        }}
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

        {/* فلتر نطاق التاريخ */}
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

        {/* اختيار قالب الفاتورة */}
        <Select value={invoiceTemplate} onValueChange={v => setInvoiceTemplate(v as InvoiceTemplate)}>
          <SelectTrigger className="w-48">
            <FileText className="w-4 h-4 ml-1 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tax_professional">ضريبي احترافي</SelectItem>
            <SelectItem value="classic">كلاسيكي</SelectItem>
            <SelectItem value="compact">مختصر</SelectItem>
          </SelectContent>
        </Select>
        </div>

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

      {/* شريط التسديد الجماعي */}
      {!isClosed && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success/10">
          <Check className="w-4 h-4 text-success shrink-0" />
          <span className="text-sm font-medium">تم تحديد {selectedIds.size} فاتورة</span>
          <Button size="sm" className="gap-2 mr-auto" onClick={handleBulkPay} disabled={bulkPaying}>
            {bulkPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            تسديد المختارة
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
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
                {invoices.length === 0
                  ? 'لا توجد فواتير. اضغط "توليد فواتير جميع العقود" لإنشائها.'
                  : 'لا توجد فواتير مطابقة للبحث'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards — مجمّعة حسب العقد */}
              <div className="space-y-4 md:hidden px-3 py-2">
                {[...groupedPaginated.entries()].map(([contractId, invs]) => {
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
                              <div className="flex items-center gap-2">
                                {!isClosed && inv.status !== 'paid' && (
                                  <Checkbox
                                    checked={selectedIds.has(inv.id)}
                                    onCheckedChange={() => toggleSelect(inv.id)}
                                  />
                                )}
                                <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
                              </div>
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
                              <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => handlePreviewTemplate(inv)}>
                                <Eye className="w-3.5 h-3.5" />معاينة
                              </Button>
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
                })}
              </div>

              {/* Desktop Table — مجمّع حسب العقد */}
              <div className="overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {!isClosed && (
                        <TableHead className="w-10 text-center">
                          <Checkbox
                            checked={unpaidFiltered.length > 0 && selectedIds.size === unpaidFiltered.length}
                            onCheckedChange={toggleSelectAll}
                          />
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
                              <span className="text-xs font-bold text-foreground">{first.contract?.contract_number || '-'}</span>
                              <span className="text-xs text-muted-foreground mr-2">— {first.contract?.tenant_name}</span>
                              <span className="text-xs text-muted-foreground mr-2">• {first.contract?.property?.property_number || ''}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mr-2">{invs.length} فاتورة</Badge>
                            </TableCell>
                          </TableRow>
                          {invs.map(inv => (
                            <TableRow key={inv.id} className={inv.status === 'overdue' ? 'bg-destructive/5' : ''}>
                              {!isClosed && (
                                <TableCell className="text-center">
                                  {inv.status !== 'paid' && (
                                    <Checkbox
                                      checked={selectedIds.has(inv.id)}
                                      onCheckedChange={() => toggleSelect(inv.id)}
                                    />
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="font-medium font-mono text-xs">{inv.invoice_number}</TableCell>
                              <TableCell>{inv.contract?.tenant_name || '-'}</TableCell>
                              <TableCell>{inv.contract?.property?.property_number || '-'}</TableCell>
                              <TableCell className="text-center">{inv.payment_number}</TableCell>
                              <TableCell>{inv.due_date}</TableCell>
                              <TableCell>{Number(inv.amount).toLocaleString()} ر.س</TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {Number(inv.vat_amount) > 0 ? `${Number(inv.vat_amount).toLocaleString()} (${inv.vat_rate}%)` : 'معفاة'}
                              </TableCell>
                              <TableCell className={inv.paid_date ? 'text-success' : 'text-muted-foreground'}>{inv.paid_date || '-'}</TableCell>
                              <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreviewTemplate(inv)} title="معاينة الفاتورة">
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDownloadPdf(inv)} title="تحميل PDF" disabled={loadingInvoiceId === inv.id}>
                                    {loadingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                  </Button>
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
          <TablePagination
            currentPage={currentPage}
            totalItems={sorted.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
