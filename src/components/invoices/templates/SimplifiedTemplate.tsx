/**
 * القالب المبسط (Simplified B2C)
 */
import { safeNumber } from '@/utils/safeNumber';
import {
  computeInvoiceTotals, generateQR, fmtNum,
  type InvoiceTemplateData,
} from '../invoiceTemplateUtils';
import { QrImage } from './SharedComponents';

export function SimplifiedTemplate({ data }: { data: InvoiceTemplateData }) {
  const { items, totalAllowances, totalCharges, totalVat, grandTotal } = computeInvoiceTotals(data);
  const qrData = generateQR(data, grandTotal, totalVat);

  return (
    <div className="bg-white dark:bg-card border rounded-lg shadow-sm text-foreground max-w-md mx-auto" dir="rtl">
      <div className="rounded-t-lg px-5 py-4 bg-accent/30 border-b-2 border-accent text-center space-y-1">
        <h2 className="text-base font-bold text-foreground">{data.sellerName}</h2>
        {data.sellerVatNumber && <p className="text-xs text-muted-foreground">الرقم الضريبي: <span className="font-mono" dir="ltr">{data.sellerVatNumber}</span></p>}
        <div className="inline-block rounded px-3 py-1 bg-accent text-accent-foreground text-xs font-bold mt-1">فاتورة ضريبية مبسطة</div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>رقم: {data.invoiceNumber}</span>
          <span>التاريخ: {data.date}</span>
        </div>
        {data.buyerName && data.buyerName !== '-' && (
          <p className="text-xs">العميل: <span className="font-medium">{data.buyerName}</span></p>
        )}

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

        <div className="space-y-1 text-xs border-t pt-2">
          {totalAllowances > 0 && (
            <div className="flex justify-between text-discount-foreground"><span>خصومات</span><span>-{fmtNum(totalAllowances)}</span></div>
          )}
          {totalCharges > 0 && (
            <div className="flex justify-between text-surcharge-foreground"><span>رسوم إضافية</span><span>+{fmtNum(totalCharges)}</span></div>
          )}
          {totalVat > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">الضريبة</span><span>{fmtNum(totalVat)} ر.س</span></div>
          )}
          <div className="flex justify-between font-bold text-sm border-t pt-1.5">
            <span>الإجمالي</span><span className="text-primary">{fmtNum(grandTotal)} ر.س</span>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          {qrData ? (
            <QrImage data={qrData} size={140} className="border p-1.5 rounded bg-white" />
          ) : (
            <div className="w-[140px] h-[140px] border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground text-center p-2">QR غير متاح</div>
          )}
        </div>

        <p className="text-[9px] text-center text-muted-foreground pt-2">فاتورة إلكترونية — هيئة الزكاة والضريبة والجمارك</p>
      </div>
    </div>
  );
}
