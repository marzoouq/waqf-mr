/**
 * القالب الاحترافي (Standard B2B)
 */
import { cn } from '@/lib/cn';
import { safeNumber } from '@/utils/format/safeNumber';
import {
  computeInvoiceTotals, generateQR, fmtNum,
  ID_TYPE_LABELS,
  type InvoiceTemplateData,
} from '../invoiceTemplateUtils';
import { InfoRow } from './SharedComponents';
import { ProfessionalHeader } from './ProfessionalHeader';
import { ProfessionalTotals } from './ProfessionalTotals';

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
      <ProfessionalHeader data={data} missingFields={missingFields} />

      <div className="p-6 space-y-5">
        {/* بيانات الفاتورة + المشتري */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 bg-muted/30 rounded-lg p-4 border">
            <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">بيانات الفاتورة</h3>
            <InfoRow label="رقم الفاتورة" value={data.invoiceNumber} />
            <InfoRow label="تاريخ الإصدار" value={data.date} />
            {data.zatcaUuid && <InfoRow label="UUID" value={data.zatcaUuid} mono />}
            {data.icv !== null && data.icv !== undefined && <InfoRow label="ICV" value={String(data.icv)} />}
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

        <ProfessionalTotals
          data={data}
          qrData={qrData}
          lineExtension={lineExtension}
          totalAllowances={totalAllowances}
          totalCharges={totalCharges}
          taxExclusive={taxExclusive}
          totalVat={totalVat}
          grandTotal={grandTotal}
        />
      </div>
    </div>
  );
}
