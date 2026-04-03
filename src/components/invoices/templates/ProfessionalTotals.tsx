/**
 * قسم الإجماليات + QR + بيانات بنكية — القالب الاحترافي
 */
import { safeNumber } from '@/utils/safeNumber';
import { fmtNum, type InvoiceTemplateData } from '../invoiceTemplateUtils';
import { QrImage } from './SharedComponents';

interface ProfessionalTotalsProps {
  data: InvoiceTemplateData;
  qrData: string | null;
  lineExtension: number;
  totalAllowances: number;
  totalCharges: number;
  taxExclusive: number;
  totalVat: number;
  grandTotal: number;
}

export function ProfessionalTotals({
  data, qrData, lineExtension, totalAllowances, totalCharges, taxExclusive, totalVat, grandTotal,
}: ProfessionalTotalsProps) {
  return (
    <>
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
                  <tr key={`a-${i}`} className="border-b bg-discount-muted">
                    <td className="p-2 text-xs text-discount-foreground font-medium">خصم</td>
                    <td className="p-2 text-xs">{a.reason}</td>
                    <td className="p-2 text-center text-xs text-discount-foreground">-{fmtNum(safeNumber(a.amount))}</td>
                    <td className="p-2 text-center text-xs">{a.vatRate}%</td>
                    <td className="p-2 text-center text-xs text-discount-foreground">-{fmtNum(vat)}</td>
                  </tr>
                );
              })}
              {(data.charges || []).map((c, i) => {
                const vat = Math.round(safeNumber(c.amount) * safeNumber(c.vatRate) / 100 * 100) / 100;
                return (
                  <tr key={`c-${i}`} className="border-b bg-surcharge-muted">
                    <td className="p-2 text-xs text-surcharge-foreground font-medium">رسوم إضافية</td>
                    <td className="p-2 text-xs">{c.reason}</td>
                    <td className="p-2 text-center text-xs text-surcharge-foreground">+{fmtNum(safeNumber(c.amount))}</td>
                    <td className="p-2 text-center text-xs">{c.vatRate}%</td>
                    <td className="p-2 text-center text-xs text-surcharge-foreground">+{fmtNum(vat)}</td>
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
              <QrImage data={qrData} size={120} className="border p-1 rounded bg-white" />
              <p className="text-[11px] text-muted-foreground">رمز QR — ZATCA Phase 2</p>
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
            <div className="flex justify-between text-sm text-discount-foreground">
              <span>خصومات</span>
              <span>-{fmtNum(totalAllowances)} ر.س</span>
            </div>
          )}
          {totalCharges > 0 && (
            <div className="flex justify-between text-sm text-surcharge-foreground">
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
        <p className="text-[11px] text-muted-foreground">هذه الفاتورة صادرة إلكترونياً وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم</p>
        <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">This is an electronically generated invoice per ZATCA e-invoicing requirements</p>
      </div>
    </>
  );
}
