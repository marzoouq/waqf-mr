/**
 * معاينة فاتورة ضريبية احترافية داخل التطبيق
 * مستوحاة من تصميم لوحة تحكم "الأستاذ"
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, X } from 'lucide-react';
import { safeNumber } from '@/utils/safeNumber';
import { cn } from '@/lib/utils';

export interface InvoicePreviewData {
  invoiceNumber: string;
  date: string;
  type: 'simplified' | 'standard';
  // بائع
  sellerName: string;
  sellerAddress?: string;
  sellerVatNumber?: string;
  sellerCR?: string;
  // مشتري
  buyerName: string;
  buyerAddress?: string;
  buyerVatNumber?: string;
  // بنود
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  // ملاحظات
  notes?: string;
  status: string;
  // بنكي
  bankName?: string;
  bankIBAN?: string;
}

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoicePreviewData | null;
  onDownloadPdf?: () => void;
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'paid': return 'مسددة';
    case 'pending': return 'قيد الانتظار';
    case 'overdue': return 'متأخرة';
    case 'cancelled': return 'ملغاة';
    default: return s;
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case 'paid': return 'default';
    case 'pending': return 'secondary';
    case 'overdue': return 'destructive';
    default: return 'outline';
  }
};

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open, onOpenChange, invoice, onDownloadPdf,
}) => {
  if (!invoice) return null;

  // حساب الإجماليات
  const items = invoice.items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  });

  const totalExVat = items.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = items.reduce((s, i) => s + i.vatAmount, 0);
  const grandTotal = Math.round((totalExVat + totalVat) * 100) / 100;

  const handlePrint = () => {
    window.print();
  };

  const isVat = invoice.type === 'standard' || totalVat > 0;
  const titleAr = isVat ? 'فاتورة ضريبية مبسطة' : 'فاتورة';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base">معاينة الفاتورة</DialogTitle>
            <DialogDescription className="sr-only">معاينة الفاتورة الضريبية</DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onDownloadPdf && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onDownloadPdf}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">تحميل PDF</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          </div>
        </DialogHeader>

        {/* محتوى الفاتورة */}
        <div className="p-6 sm:p-8 print:p-0" id="invoice-preview-content">
          <div className="bg-white dark:bg-card border rounded-lg shadow-sm p-6 sm:p-8 space-y-6 text-foreground" dir="rtl">
            
            {/* الترويسة */}
            <div className="flex items-start justify-between gap-4">
              {/* بيانات البائع (يمين) */}
              <div className="space-y-1 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{invoice.sellerName}</h2>
                {invoice.sellerAddress && (
                  <p className="text-xs text-muted-foreground">{invoice.sellerAddress}</p>
                )}
                {invoice.sellerVatNumber && (
                  <p className="text-xs text-muted-foreground">الرقم الضريبي: {invoice.sellerVatNumber}</p>
                )}
                {invoice.sellerCR && (
                  <p className="text-xs text-muted-foreground">السجل التجاري: {invoice.sellerCR}</p>
                )}
              </div>

              {/* عنوان الفاتورة + حالة (يسار) */}
              <div className="text-left space-y-2">
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 text-center">
                  <p className="text-sm font-bold text-primary">{titleAr}</p>
                  {isVat && <p className="text-[10px] text-primary/70">Simplified Tax Invoice</p>}
                </div>
                <Badge variant={statusColor(invoice.status) as 'default' | 'secondary' | 'destructive' | 'outline'} className="w-full justify-center">
                  {statusLabel(invoice.status)}
                </Badge>
              </div>
            </div>

            {/* خط فاصل */}
            <div className="border-t-2 border-primary/30" />

            {/* بيانات الفاتورة + العميل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* بيانات الفاتورة */}
              <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">بيانات الفاتورة</h3>
                <InfoRow label="الرقم" value={invoice.invoiceNumber} />
                <InfoRow label="التاريخ" value={invoice.date} />
              </div>

              {/* بيانات العميل */}
              <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">العميل / المورد</h3>
                <InfoRow label="الاسم" value={invoice.buyerName} />
                {invoice.buyerAddress && <InfoRow label="العنوان" value={invoice.buyerAddress} />}
                {invoice.buyerVatNumber && <InfoRow label="الرقم الضريبي" value={invoice.buyerVatNumber} />}
              </div>
            </div>

            {/* جدول البنود */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-2.5 text-right font-semibold text-xs rounded-tr-lg">#</th>
                    <th className="p-2.5 text-right font-semibold text-xs">البند</th>
                    <th className="p-2.5 text-center font-semibold text-xs">الكمية</th>
                    <th className="p-2.5 text-center font-semibold text-xs">السعر</th>
                    <th className="p-2.5 text-center font-semibold text-xs">المجموع بدون الضريبة</th>
                    <th className="p-2.5 text-center font-semibold text-xs">نسبة الضريبة</th>
                    <th className="p-2.5 text-center font-semibold text-xs rounded-tl-lg">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className={cn('border-b border-border', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                      <td className="p-2.5 text-center text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="p-2.5 text-right text-xs font-medium">{item.description}</td>
                      <td className="p-2.5 text-center text-xs">{item.quantity}</td>
                      <td className="p-2.5 text-center text-xs">{safeNumber(item.unitPrice).toLocaleString()}</td>
                      <td className="p-2.5 text-center text-xs">{item.subtotal.toLocaleString()}</td>
                      <td className="p-2.5 text-center text-xs">{item.vatRate}%</td>
                      <td className="p-2.5 text-center text-xs font-semibold">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* الإجماليات */}
            <div className="flex justify-start">
              <div className="w-full sm:w-72 space-y-2 bg-muted/20 rounded-lg p-4 border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الإجمالي قبل الضريبة</span>
                  <span className="font-medium">{totalExVat.toLocaleString()} ر.س</span>
                </div>
                {totalVat > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">القيمة المضافة {items[0]?.vatRate ?? 15}%</span>
                    <span className="font-medium">{totalVat.toLocaleString()} ر.س</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>الإجمالي (ر.س)</span>
                  <span className="text-primary text-base">{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-primary">
                  <span>المستحق (ر.س)</span>
                  <span className="text-base">{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* بيانات بنكية */}
            {(invoice.bankName || invoice.bankIBAN) && (
              <div className="bg-muted/20 rounded-lg p-4 border space-y-1">
                <h4 className="text-xs font-semibold text-foreground">بيانات الدفع</h4>
                {invoice.bankName && <p className="text-xs text-muted-foreground">البنك: {invoice.bankName}</p>}
                {invoice.bankIBAN && <p className="text-xs text-muted-foreground font-mono" dir="ltr">IBAN: {invoice.bankIBAN}</p>}
              </div>
            )}

            {/* ملاحظات */}
            {invoice.notes && (
              <div className="text-xs text-muted-foreground bg-muted/10 rounded p-3 border-r-2 border-primary/30">
                {invoice.notes}
              </div>
            )}

            {/* تذييل */}
            <div className="text-center pt-4 border-t">
              <p className="text-[10px] text-muted-foreground">
                هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف — لا تحتاج إلى توقيع أو ختم
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-muted-foreground min-w-[60px]">{label}:</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export default InvoicePreviewDialog;
