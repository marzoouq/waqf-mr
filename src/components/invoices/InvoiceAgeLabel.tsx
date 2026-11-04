import { invoiceAgeDays } from '@/utils/financial/collection/invoiceAge';

interface Props {
  invoice: { status: string; due_date?: string; date?: string; origin_fiscal_year_id?: string | null; collection_status?: string | null };
}

export function InvoiceAgeLabel({ invoice }: Props) {
  const days = invoiceAgeDays(invoice.due_date ?? invoice.date ?? '', invoice.status);
  return (
    <span className="block font-sans text-xs mt-1 space-y-1">
      {invoice.origin_fiscal_year_id && invoice.status !== 'paid' && <span className="block text-warning">متأخرة من السنة السابقة</span>}
      {days > 0 && <span className="block text-destructive">متأخرة {new Intl.NumberFormat('ar-SA').format(days)} يوماً</span>}
      {invoice.collection_status === 'uncollectible' && <span className="block text-muted-foreground">غير قابلة للتحصيل</span>}
    </span>
  );
}