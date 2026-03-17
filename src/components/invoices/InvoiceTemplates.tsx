/**
 * نظام قوالب الفواتير المتعدد — تأجير عقاري وإدارة أوقاف/أملاك
 * قالبان: احترافي (Standard B2B) ومبسط (Simplified B2C)
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { safeNumber } from '@/utils/safeNumber';
import { QRCodeSVG } from 'qrcode.react';
import { generateZatcaQrTLV } from '@/utils/zatcaQr';
import { FileText, Receipt, AlertCircle } from 'lucide-react';

// --- الأنواع المشتركة ---
export interface AllowanceChargeItem {
  reason: string;
  amount: number;
  vatRate: number;
}

export interface InvoiceTemplateData {
  invoiceNumber: string;
  date: string;
  type: 'simplified' | 'standard';
  sellerName: string;
  sellerAddress?: string;
  sellerVatNumber?: string;
  sellerCR?: string;
  sellerLogo?: string;
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
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  allowances?: AllowanceChargeItem[];
  charges?: AllowanceChargeItem[];
  notes?: string;
  status: string;
  bankName?: string;
  bankIBAN?: string;
  zatcaUuid?: string;
  icv?: number;
  zatcaStatus?: string;
  qrTlvBase64?: string;
}

// --- حسابات مشتركة ---
function computeInvoiceTotals(data: InvoiceTemplateData) {
  const items = data.items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  });

  const lineExtension = items.reduce((s, i) => s + i.subtotal, 0);
  const totalAllowances = (data.allowances || []).reduce((s, a) => s + safeNumber(a.amount), 0);
  const totalCharges = (data.charges || []).reduce((s, c) => s + safeNumber(c.amount), 0);
  const taxExclusive = lineExtension - totalAllowances + totalCharges;

  // حساب الضريبة الصافية (بنود + رسوم - خصومات)
  const itemsVat = items.reduce((s, i) => s + i.vatAmount, 0);
  const allowancesVat = (data.allowances || []).reduce((s, a) => s + Math.round(safeNumber(a.amount) * safeNumber(a.vatRate) / 100 * 100) / 100, 0);
  const chargesVat = (data.charges || []).reduce((s, c) => s + Math.round(safeNumber(c.amount) * safeNumber(c.vatRate) / 100 * 100) / 100, 0);
  const totalVat = Math.round((itemsVat - allowancesVat + chargesVat) * 100) / 100;
  const grandTotal = Math.round((taxExclusive + totalVat) * 100) / 100;

  return { items, lineExtension, totalAllowances, totalCharges, taxExclusive, totalVat, grandTotal };
}

function generateQR(data: InvoiceTemplateData, grandTotal: number, totalVat: number) {
  return data.qrTlvBase64 || (data.sellerVatNumber ? generateZatcaQrTLV({
    sellerName: data.sellerName,
    vatNumber: data.sellerVatNumber,
    timestamp: new Date(data.date).toISOString(),
    totalWithVat: grandTotal,
    vatAmount: totalVat,
  }) : null);
}

// --- حالة الفاتورة ---
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
  NAT: 'هوية وطنية', IQA: 'إقامة', PAS: 'جواز سفر',
  CRN: 'سجل تجاري', GCC: 'هوية خليجية', OTH: 'أخرى',
};

const InfoRow = ({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-muted-foreground min-w-[80px]">{label}:</span>
    <span className={cn("font-medium", mono && "font-mono text-[11px]", warn ? "text-destructive font-semibold" : "text-foreground")} dir={mono ? "ltr" : undefined}>{value}</span>
  </div>
);

const fmtNum = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2 });

// =========================================
// القالب الاحترافي (Standard B2B)
// =========================================
export function ProfessionalTemplate({ data }: { data: InvoiceTemplateData }) {
  const { items, lineExtension, totalAllowances, totalCharges, taxExclusive, totalVat, grandTotal } = computeInvoiceTotals(data);
  const qrData = generateQR(data, grandTotal, totalVat);
  const isStandard = data.type === 'standard';

  const buyerFullAddress = [data.buyerStreet, data.buyerBuilding, data.buyerDistrict, data.buyerCity, data.buyerPostalCode]
    .filter(Boolean).join('، ') || data.buyerAddress;

  const missingFields: string[] = [];
  if (isStandard) {
    if (!data.buyerName || data.buyerName === '-') missingFields.push('اسم المشتري');
    if (!data.buyerVatNumber) missingFields.push('الرقم الضريبي للمشتري');
    if (!buyerFullAddress) missingFields.push('عنوان المشتري');
  }
  if (!data.sellerVatNumber) missingFields.push('الرقم الضريبي للبائع');

  return (
    <div className="bg-white dark:bg-card border rounded-lg shadow-sm text-foreground" dir="rtl">
      {/* تحذير الحقول الناقصة */}
      {missingFields.length > 0 && (
        <div className="m-4 mb-0 flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg p-3 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">حقول إلزامية ناقصة للامتثال:</p>
            <ul className="list-disc list-inside space-y-0.5">{missingFields.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        </div>
      )}

      {/* الترويسة */}
      <div className="rounded-t-lg px-6 py-5 flex items-start justify-between gap-4 bg-primary/10 border-b-2 border-primary">
        <div className="space-y-1 flex-1">
          {data.sellerLogo ? (
            <img src={data.sellerLogo} alt="شعار" className="h-12 w-auto mb-2 object-contain" />
          ) : (
            <div className="h-12 w-28 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground mb-2">شعار المنشأة</div>
          )}
          <h2 className="text-lg font-bold text-foreground">{data.sellerName}</h2>
          {data.sellerAddress && <p className="text-xs text-muted-foreground">{data.sellerAddress}</p>}
          {data.sellerVatNumber && <p className="text-xs text-muted-foreground">الرقم الضريبي: <span className="font-mono font-semibold text-foreground" dir="ltr">{data.sellerVatNumber}</span></p>}
          {data.sellerCR && <p className="text-xs text-muted-foreground">السجل التجاري: {data.sellerCR}</p>}
        </div>
        <div className="text-start space-y-2 shrink-0">
          <div className="rounded-lg px-5 py-3 text-center border bg-primary text-primary-foreground border-primary">
            <p className="text-sm font-bold">{isStandard ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة'}</p>
            <p className="text-[10px] opacity-80">{isStandard ? 'Tax Invoice' : 'Simplified Tax Invoice'}</p>
          </div>
          <Badge variant={statusColor(data.status)} className="w-full justify-center">{statusLabel(data.status)}</Badge>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* بيانات الفاتورة + المشتري */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 bg-muted/30 rounded-lg p-4 border">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">بيانات الفاتورة</h3>
            <InfoRow label="رقم الفاتورة" value={data.invoiceNumber} />
            <InfoRow label="تاريخ الإصدار" value={data.date} />
            {data.zatcaUuid && <InfoRow label="UUID" value={data.zatcaUuid} mono />}
            {data.icv != null && <InfoRow label="ICV" value={String(data.icv)} />}
            {data.zatcaStatus && data.zatcaStatus !== 'not_submitted' && (
              <InfoRow label="حالة ZATCA" value={
                data.zatcaStatus === 'reported' ? 'تم الإبلاغ' :
                data.zatcaStatus === 'cleared' ? 'تم الاعتماد' :
                data.zatcaStatus === 'rejected' ? 'مرفوض' : data.zatcaStatus
              } />
            )}
          </div>

          <div className="space-y-2 bg-muted/30 rounded-lg p-4 border">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">
              {isStandard ? 'بيانات المشتري (المستأجر)' : 'العميل'}
            </h3>
            <InfoRow label="الاسم" value={data.buyerName} warn={isStandard && (!data.buyerName || data.buyerName === '-')} />
            {isStandard && (
              <>
                {data.buyerVatNumber ? <InfoRow label="الرقم الضريبي" value={data.buyerVatNumber} mono /> : <InfoRow label="الرقم الضريبي" value="غير محدد" warn />}
                {data.buyerCR && <InfoRow label="السجل التجاري" value={data.buyerCR} />}
                {data.buyerIdType && data.buyerIdNumber && <InfoRow label={ID_TYPE_LABELS[data.buyerIdType] || 'الهوية'} value={data.buyerIdNumber} />}
                {buyerFullAddress ? <InfoRow label="العنوان" value={buyerFullAddress} /> : <InfoRow label="العنوان" value="غير محدد" warn />}
              </>
            )}
          </div>
        </div>

        {/* جدول البنود */}
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
                  <td className="p-2.5 text-center text-xs">{fmtNum(safeNumber(item.unitPrice))}</td>
                  <td className="p-2.5 text-center text-xs">{fmtNum(item.subtotal)}</td>
                  <td className="p-2.5 text-center text-xs">{item.vatRate}%</td>
                  <td className="p-2.5 text-center text-xs">{fmtNum(item.vatAmount)}</td>
                  <td className="p-2.5 text-center text-xs font-semibold">{fmtNum(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* خصومات ورسوم إضافية */}
        {((data.allowances?.length ?? 0) > 0 || (data.charges?.length ?? 0) > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-right text-xs font-semibold">النوع</th>
                  <th className="p-2 text-right text-xs font-semibold">السبب</th>
                  <th className="p-2 text-center text-xs font-semibold">المبلغ</th>
                  <th className="p-2 text-center text-xs font-semibold">نسبة ض.</th>
                  <th className="p-2 text-center text-xs font-semibold">قيمة الضريبة</th>
                </tr>
              </thead>
              <tbody>
                {(data.allowances || []).map((a, i) => {
                  const vat = Math.round(safeNumber(a.amount) * safeNumber(a.vatRate) / 100 * 100) / 100;
                  return (
                    <tr key={`a-${i}`} className="border-b bg-green-50 dark:bg-green-950/20">
                      <td className="p-2 text-xs text-green-700 dark:text-green-400 font-medium">خصم</td>
                      <td className="p-2 text-xs">{a.reason}</td>
                      <td className="p-2 text-center text-xs text-green-700 dark:text-green-400">-{fmtNum(safeNumber(a.amount))}</td>
                      <td className="p-2 text-center text-xs">{a.vatRate}%</td>
                      <td className="p-2 text-center text-xs text-green-700 dark:text-green-400">-{fmtNum(vat)}</td>
                    </tr>
                  );
                })}
                {(data.charges || []).map((c, i) => {
                  const vat = Math.round(safeNumber(c.amount) * safeNumber(c.vatRate) / 100 * 100) / 100;
                  return (
                    <tr key={`c-${i}`} className="border-b bg-orange-50 dark:bg-orange-950/20">
                      <td className="p-2 text-xs text-orange-700 dark:text-orange-400 font-medium">رسوم إضافية</td>
                      <td className="p-2 text-xs">{c.reason}</td>
                      <td className="p-2 text-center text-xs text-orange-700 dark:text-orange-400">+{fmtNum(safeNumber(c.amount))}</td>
                      <td className="p-2 text-center text-xs">{c.vatRate}%</td>
                      <td className="p-2 text-center text-xs text-orange-700 dark:text-orange-400">+{fmtNum(vat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* الإجماليات + QR */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
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

          <div className="w-full sm:w-80 space-y-2 bg-muted/20 rounded-lg p-4 border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي البنود</span>
              <span className="font-medium">{fmtNum(lineExtension)} ر.س</span>
            </div>
            {totalAllowances > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                <span>خصومات</span>
                <span>-{fmtNum(totalAllowances)} ر.س</span>
              </div>
            )}
            {totalCharges > 0 && (
              <div className="flex justify-between text-sm text-orange-700 dark:text-orange-400">
                <span>رسوم إضافية</span>
                <span>+{fmtNum(totalCharges)} ر.س</span>
              </div>
            )}
            {(totalAllowances > 0 || totalCharges > 0) && (
              <div className="flex justify-between text-sm border-t pt-1">
                <span className="text-muted-foreground">الصافي قبل الضريبة</span>
                <span className="font-medium">{fmtNum(taxExclusive)} ر.س</span>
              </div>
            )}
            {totalVat > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ضريبة القيمة المضافة</span>
                <span className="font-medium">{fmtNum(totalVat)} ر.س</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span>الإجمالي شامل الضريبة</span>
              <span className="text-primary text-base">{fmtNum(grandTotal)} ر.س</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold bg-primary/5 rounded p-2 -mx-2">
              <span className="text-primary">المبلغ المستحق</span>
              <span className="text-primary text-lg">{fmtNum(grandTotal)} ر.س</span>
            </div>
          </div>
        </div>

        {/* بيانات بنكية */}
        {(data.bankName || data.bankIBAN) && (
          <div className="bg-muted/20 rounded-lg p-4 border space-y-1">
            <h4 className="text-xs font-semibold text-foreground">بيانات الدفع</h4>
            {data.bankName && <p className="text-xs text-muted-foreground">البنك: {data.bankName}</p>}
            {data.bankIBAN && <p className="text-xs text-muted-foreground font-mono" dir="ltr">IBAN: {data.bankIBAN}</p>}
          </div>
        )}

        {data.notes && (
          <div className="text-xs text-muted-foreground bg-muted/10 rounded p-3 border-r-2 border-primary/30">
            <span className="font-semibold">ملاحظات: </span>{data.notes}
          </div>
        )}

        <div className="text-center pt-4 border-t space-y-1">
          <p className="text-[10px] text-muted-foreground">هذه الفاتورة صادرة إلكترونياً وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم</p>
          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">This is an electronically generated invoice per ZATCA e-invoicing requirements</p>
        </div>
      </div>
    </div>
  );
}

// =========================================
// القالب المبسط (Simplified B2C)
// =========================================
export function SimplifiedTemplate({ data }: { data: InvoiceTemplateData }) {
  const { items, totalAllowances, totalCharges, totalVat, grandTotal } = computeInvoiceTotals(data);
  const qrData = generateQR(data, grandTotal, totalVat);

  return (
    <div className="bg-white dark:bg-card border rounded-lg shadow-sm text-foreground max-w-md mx-auto" dir="rtl">
      {/* ترويسة مختصرة */}
      <div className="rounded-t-lg px-5 py-4 bg-accent/30 border-b-2 border-accent text-center space-y-1">
        <h2 className="text-base font-bold text-foreground">{data.sellerName}</h2>
        {data.sellerVatNumber && <p className="text-xs text-muted-foreground">الرقم الضريبي: <span className="font-mono" dir="ltr">{data.sellerVatNumber}</span></p>}
        <div className="inline-block rounded px-3 py-1 bg-accent text-accent-foreground text-xs font-bold mt-1">
          فاتورة ضريبية مبسطة
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* بيانات أساسية */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>رقم: {data.invoiceNumber}</span>
          <span>التاريخ: {data.date}</span>
        </div>
        {data.buyerName && data.buyerName !== '-' && (
          <p className="text-xs">العميل: <span className="font-medium">{data.buyerName}</span></p>
        )}

        {/* جدول بنود مختصر */}
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-foreground/20">
              <th className="py-1.5 text-right font-semibold">البند</th>
              <th className="py-1.5 text-center font-semibold w-12">الكمية</th>
              <th className="py-1.5 text-center font-semibold">السعر</th>
              <th className="py-1.5 text-center font-semibold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-border/50">
                <td className="py-1.5 text-right">{item.description}</td>
                <td className="py-1.5 text-center">{item.quantity}</td>
                <td className="py-1.5 text-center">{fmtNum(safeNumber(item.unitPrice))}</td>
                <td className="py-1.5 text-center font-medium">{fmtNum(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* إجماليات مختصرة */}
        <div className="space-y-1 text-xs border-t pt-2">
          {totalAllowances > 0 && (
            <div className="flex justify-between text-green-700 dark:text-green-400"><span>خصومات</span><span>-{fmtNum(totalAllowances)}</span></div>
          )}
          {totalCharges > 0 && (
            <div className="flex justify-between text-orange-700 dark:text-orange-400"><span>رسوم إضافية</span><span>+{fmtNum(totalCharges)}</span></div>
          )}
          {totalVat > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">الضريبة</span><span>{fmtNum(totalVat)} ر.س</span></div>
          )}
          <div className="flex justify-between font-bold text-sm border-t pt-1.5">
            <span>الإجمالي</span><span className="text-primary">{fmtNum(grandTotal)} ر.س</span>
          </div>
        </div>

        {/* QR مركزي */}
        <div className="flex justify-center pt-2">
          {qrData ? (
            <QRCodeSVG value={qrData} size={140} level="H" className="border p-1.5 rounded bg-white" />
          ) : (
            <div className="w-[140px] h-[140px] border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground text-center p-2">
              QR غير متاح
            </div>
          )}
        </div>

        <p className="text-[9px] text-center text-muted-foreground pt-2">
          فاتورة إلكترونية — هيئة الزكاة والضريبة والجمارك
        </p>
      </div>
    </div>
  );
}

// =========================================
// محدد القالب (TemplateSelector)
// =========================================
export function TemplateSelector({ value, onChange }: { value: 'professional' | 'simplified'; onChange: (v: 'professional' | 'simplified') => void }) {
  return (
    <div className="flex gap-2 justify-center">
      <Button
        variant={value === 'professional' ? 'default' : 'outline'}
        size="sm"
        className="gap-1.5"
        onClick={() => onChange('professional')}
      >
        <FileText className="w-4 h-4" />
        الاحترافي
      </Button>
      <Button
        variant={value === 'simplified' ? 'default' : 'outline'}
        size="sm"
        className="gap-1.5"
        onClick={() => onChange('simplified')}
      >
        <Receipt className="w-4 h-4" />
        المبسط
      </Button>
    </div>
  );
}
