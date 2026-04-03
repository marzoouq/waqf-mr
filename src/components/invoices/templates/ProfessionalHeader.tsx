/**
 * ترويسة الفاتورة الاحترافية
 */
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { statusLabel, statusColor, type InvoiceTemplateData } from '../invoiceTemplateUtils';

interface ProfessionalHeaderProps {
  data: InvoiceTemplateData;
  missingFields: string[];
}

export function ProfessionalHeader({ data, missingFields }: ProfessionalHeaderProps) {
  const isStandard = data.type === 'standard';

  return (
    <>
      {missingFields.length > 0 && (
        <div className="m-4 mb-0 flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg p-3 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">حقول إلزامية ناقصة للامتثال:</p>
            <ul className="list-disc list-inside space-y-0.5">{missingFields.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="rounded-t-lg px-6 py-5 flex items-start justify-between gap-4 bg-primary/10 border-b-2 border-primary">
        <div className="space-y-1 flex-1">
          {data.sellerLogo ? (
            <img src={data.sellerLogo} alt="شعار" className="h-12 w-auto mb-2 object-contain" />
          ) : (
            <div className="h-12 w-28 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[11px] text-muted-foreground mb-2">شعار المنشأة</div>
          )}
          <h2 className="text-lg font-bold text-foreground">{data.sellerName}</h2>
          {data.sellerAddress && <p className="text-xs text-muted-foreground">{data.sellerAddress}</p>}
          {data.sellerVatNumber && <p className="text-xs text-muted-foreground">الرقم الضريبي: <span className="font-mono font-semibold text-foreground" dir="ltr">{data.sellerVatNumber}</span></p>}
          {data.sellerCR && <p className="text-xs text-muted-foreground">السجل التجاري: {data.sellerCR}</p>}
        </div>
        <div className="text-start space-y-2 shrink-0">
          <div className="rounded-lg px-5 py-3 text-center border bg-primary text-primary-foreground border-primary">
            <p className="text-sm font-bold">{isStandard ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة'}</p>
            <p className="text-[11px] opacity-80">{isStandard ? 'Tax Invoice' : 'Simplified Tax Invoice'}</p>
          </div>
          <Badge variant={statusColor(data.status)} className="w-full justify-center">{statusLabel(data.status)}</Badge>
        </div>
      </div>
    </>
  );
}
