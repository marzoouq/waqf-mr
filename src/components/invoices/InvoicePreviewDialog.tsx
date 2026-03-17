/**
 * معاينة فاتورة ضريبية احترافية — متوافقة مع ZATCA Phase 2
 * تدعم القالب القياسي (Standard) والمبسط (Simplified)
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, AlertCircle } from 'lucide-react';
import { safeNumber } from '@/utils/safeNumber';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { generateZatcaQrTLV } from '@/utils/zatcaQr';

export interface InvoicePreviewData {
  invoiceNumber: string;
  date: string;
  type: 'simplified' | 'standard';
  // بائع
  sellerName: string;
  sellerAddress?: string;
  sellerVatNumber?: string;
  sellerCR?: string;
  sellerLogo?: string;
  // مشتري
  buyerName: string;
  buyerAddress?: string;
  buyerVatNumber?: string;
  buyerCR?: string;
  buyerIdType?: string;
  buyerIdNumber?: string;
  buyerStreet?: string;
  buyerDistrict?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerBuilding?: string;
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
  // ZATCA
  zatcaUuid?: string;
  icv?: number;
  zatcaStatus?: string;
  qrTlvBase64?: string;
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

const statusColor = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'paid': return 'default';
    case 'pending': return 'secondary';
    case 'overdue': return 'destructive';
    default: return 'outline';
  }
};

const ID_TYPE_LABELS: Record<string, string> = {
  NAT: 'هوية وطنية',
  IQA: 'إقامة',
  PAS: 'جواز سفر',
  CRN: 'سجل تجاري',
  GCC: 'هوية خليجية',
  OTH: 'أخرى',
};

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open, onOpenChange, invoice, onDownloadPdf,
}) => {
  if (!invoice) return null;

  const items = invoice.items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  });

  const totalExVat = items.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = items.reduce((s, i) => s + i.vatAmount, 0);
  const grandTotal = Math.round((totalExVat + totalVat) * 100) / 100;

  const isStandard = invoice.type === 'standard';
  const titleAr = isStandard ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة';
  const titleEn = isStandard ? 'Tax Invoice' : 'Simplified Tax Invoice';

  // توليد QR TLV
  const qrData = invoice.qrTlvBase64 || (invoice.sellerVatNumber ? generateZatcaQrTLV({
    sellerName: invoice.sellerName,
    vatNumber: invoice.sellerVatNumber,
    timestamp: new Date(invoice.date).toISOString(),
    totalWithVat: grandTotal,
    vatAmount: totalVat,
  }) : null);

  // فحص الحقول الإلزامية الناقصة للفاتورة القياسية
  const missingFields: string[] = [];
  if (isStandard) {
    if (!invoice.buyerName || invoice.buyerName === '-') missingFields.push('اسم المشتري');
    if (!invoice.buyerVatNumber) missingFields.push('الرقم الضريبي للمشتري');
    if (!invoice.buyerStreet && !invoice.buyerAddress) missingFields.push('عنوان المشتري');
  }
  if (!invoice.sellerVatNumber) missingFields.push('الرقم الضريبي للبائع');

  const handlePrint = () => window.print();

  // بناء عنوان المشتري
  const buyerFullAddress = [invoice.buyerStreet, invoice.buyerBuilding, invoice.buyerDistrict, invoice.buyerCity, invoice.buyerPostalCode]
    .filter(Boolean).join('، ') || invoice.buyerAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base">معاينة الفاتورة الضريبية</DialogTitle>
            <DialogDescription className="sr-only">معاينة الفاتورة الضريبية المتوافقة مع ZATCA</DialogDescription>
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

        <div className="p-6 sm:p-8 print:p-0" id="invoice-preview-content">
          {/* تحذير الحقول الناقصة */}
          {missingFields.length > 0 && (
            <div className="mb-4 flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg p-3 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">حقول إلزامية ناقصة للامتثال:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-card border rounded-lg shadow-sm text-foreground" dir="rtl">

            {/* === الترويسة === */}
            <div className={cn(
              "rounded-t-lg px-6 py-5 flex items-start justify-between gap-4",
              isStandard ? "bg-primary/10 border-b-2 border-primary" : "bg-accent/30 border-b-2 border-accent"
            )}>
              {/* بيانات البائع */}
              <div className="space-y-1 flex-1">
                {invoice.sellerLogo ? (
                  <img src={invoice.sellerLogo} alt="شعار" className="h-12 w-auto mb-2 object-contain" />
                ) : (
                  <div className="h-12 w-28 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground mb-2">
                    شعار المنشأة
                  </div>
                )}
                <h2 className="text-lg font-bold text-foreground">{invoice.sellerName}</h2>
                {invoice.sellerAddress && <p className="text-xs text-muted-foreground">{invoice.sellerAddress}</p>}
                {invoice.sellerVatNumber && (
                  <p className="text-xs text-muted-foreground">
                    الرقم الضريبي: <span className="font-mono font-semibold text-foreground" dir="ltr">{invoice.sellerVatNumber}</span>
                  </p>
                )}
                {invoice.sellerCR && <p className="text-xs text-muted-foreground">السجل التجاري: {invoice.sellerCR}</p>}
              </div>

              {/* عنوان الفاتورة */}
              <div className="text-left space-y-2 shrink-0">
                <div className={cn(
                  "rounded-lg px-5 py-3 text-center border",
                  isStandard ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-accent-foreground border-accent"
                )}>
                  <p className="text-sm font-bold">{titleAr}</p>
                  <p className="text-[10px] opacity-80">{titleEn}</p>
                </div>
                <Badge variant={statusColor(invoice.status)} className="w-full justify-center">
                  {statusLabel(invoice.status)}
                </Badge>
              </div>
            </div>

            <div className="p-6 space-y-5">

              {/* === بيانات الفاتورة + المشتري === */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* بيانات الفاتورة */}
                <div className="space-y-2 bg-muted/30 rounded-lg p-4 border">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">بيانات الفاتورة</h3>
                  <InfoRow label="رقم الفاتورة" value={invoice.invoiceNumber} />
                  <InfoRow label="تاريخ الإصدار" value={invoice.date} />
                  {invoice.zatcaUuid && <InfoRow label="UUID" value={invoice.zatcaUuid} mono />}
                  {invoice.icv != null && <InfoRow label="ICV" value={String(invoice.icv)} />}
                  {invoice.zatcaStatus && invoice.zatcaStatus !== 'not_submitted' && (
                    <InfoRow label="حالة ZATCA" value={
                      invoice.zatcaStatus === 'reported' ? 'تم الإبلاغ' :
                      invoice.zatcaStatus === 'cleared' ? 'تم الاعتماد' :
                      invoice.zatcaStatus === 'rejected' ? 'مرفوض' : invoice.zatcaStatus
                    } />
                  )}
                </div>

                {/* بيانات المشتري */}
                <div className="space-y-2 bg-muted/30 rounded-lg p-4 border">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">
                    {isStandard ? 'بيانات المشتري (العميل)' : 'العميل'}
                  </h3>
                  <InfoRow label="الاسم" value={invoice.buyerName} warn={isStandard && (!invoice.buyerName || invoice.buyerName === '-')} />
                  {isStandard && (
                    <>
                      {invoice.buyerVatNumber ? (
                        <InfoRow label="الرقم الضريبي" value={invoice.buyerVatNumber} mono />
                      ) : (
                        <InfoRow label="الرقم الضريبي" value="غير محدد" warn />
                      )}
                      {invoice.buyerCR && <InfoRow label="السجل التجاري" value={invoice.buyerCR} />}
                      {invoice.buyerIdType && invoice.buyerIdNumber && (
                        <InfoRow label={ID_TYPE_LABELS[invoice.buyerIdType] || 'الهوية'} value={invoice.buyerIdNumber} />
                      )}
                      {buyerFullAddress ? (
                        <InfoRow label="العنوان" value={buyerFullAddress} />
                      ) : (
                        <InfoRow label="العنوان" value="غير محدد" warn />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* === جدول البنود === */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="p-2.5 text-right font-semibold text-xs rounded-tr-lg w-10">#</th>
                      <th className="p-2.5 text-right font-semibold text-xs">البند</th>
                      <th className="p-2.5 text-center font-semibold text-xs w-16">الكمية</th>
                      <th className="p-2.5 text-center font-semibold text-xs">سعر الوحدة</th>
                      <th className="p-2.5 text-center font-semibold text-xs">المجموع بدون ض.</th>
                      <th className="p-2.5 text-center font-semibold text-xs w-16">نسبة ض.</th>
                      <th className="p-2.5 text-center font-semibold text-xs">قيمة الضريبة</th>
                      <th className="p-2.5 text-center font-semibold text-xs rounded-tl-lg">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className={cn('border-b border-border', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                        <td className="p-2.5 text-center text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="p-2.5 text-right text-xs font-medium">{item.description}</td>
                        <td className="p-2.5 text-center text-xs">{item.quantity}</td>
                        <td className="p-2.5 text-center text-xs">{safeNumber(item.unitPrice).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 text-center text-xs">{item.subtotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 text-center text-xs">{item.vatRate}%</td>
                        <td className="p-2.5 text-center text-xs">{item.vatAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 text-center text-xs font-semibold">{item.total.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* === الإجماليات + QR === */}
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* QR */}
                <div className="flex flex-col items-center gap-2">
                  {qrData ? (
                    <>
                      <QRCodeSVG value={qrData} size={120} level="H" className="border p-1 rounded bg-white" />
                      <p className="text-[10px] text-muted-foreground">رمز QR — ZATCA Phase 2</p>
                    </>
                  ) : (
                    <div className="w-[120px] h-[120px] border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                      QR غير متاح<br />(الرقم الضريبي مطلوب)
                    </div>
                  )}
                </div>

                {/* الإجماليات */}
                <div className="w-full sm:w-80 space-y-2 bg-muted/20 rounded-lg p-4 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الإجمالي بدون الضريبة</span>
                    <span className="font-medium">{totalExVat.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                  {totalVat > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ضريبة القيمة المضافة ({items[0]?.vatRate ?? 15}%)</span>
                      <span className="font-medium">{totalVat.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-sm font-bold">
                    <span>الإجمالي شامل الضريبة</span>
                    <span className="text-primary text-base">{grandTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold bg-primary/5 rounded p-2 -mx-2">
                    <span className="text-primary">المبلغ المستحق</span>
                    <span className="text-primary text-lg">{grandTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
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
                  <span className="font-semibold">ملاحظات: </span>{invoice.notes}
                </div>
              )}

              {/* تذييل */}
              <div className="text-center pt-4 border-t space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  هذه الفاتورة صادرة إلكترونياً وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم
                </p>
                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                  This is an electronically generated invoice per ZATCA e-invoicing requirements
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-muted-foreground min-w-[80px]">{label}:</span>
    <span className={cn(
      "font-medium",
      mono && "font-mono text-[11px]",
      warn ? "text-destructive font-semibold" : "text-foreground"
    )} dir={mono ? "ltr" : undefined}>{value}</span>
  </div>
);

export default InvoicePreviewDialog;
