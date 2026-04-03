/**
 * بطاقات الجوال لعرض الفواتير — المستفيد
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, FileText } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS } from '@/hooks/data/useInvoices';

interface InvoiceItem {
  id: string;
  invoice_type: string;
  invoice_number: string | null;
  amount: number;
  date: string;
  status: string;
  file_path: string | null;
  file_name: string | null;
  property?: { property_number: string } | null;
}

interface InvoicesViewMobileCardsProps {
  invoices: InvoiceItem[];
  statusBadgeVariant: (status: string) => 'default' | 'destructive' | 'secondary' | 'outline';
  onViewFile: (file: { path: string; name: string | null }) => void;
}

export default function InvoicesViewMobileCards({ invoices, statusBadgeVariant, onViewFile }: InvoicesViewMobileCardsProps) {
  if (invoices.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">لا توجد فواتير</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((item) => (
        <Card key={item.id} className="shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}</span>
              <Badge variant={statusBadgeVariant(item.status)}>
                {INVOICE_STATUS_LABELS[item.status] || item.status}
              </Badge>
            </div>
            {item.invoice_number && (
              <p className="text-xs text-muted-foreground font-mono">{item.invoice_number}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-primary">{fmt(safeNumber(item.amount))} ر.س</span>
              <span className="text-xs text-muted-foreground">{fmtDate(item.date)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.property?.property_number || '-'}</span>
              {item.file_path && (
                <Button variant="ghost" size="sm" className="gap-1 text-primary h-7 px-2" onClick={() => onViewFile({ path: item.file_path!, name: item.file_name })}>
                  <Eye className="w-3 h-3" /> عرض
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
