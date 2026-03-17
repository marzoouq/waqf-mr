import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { safeNumber } from '@/utils/safeNumber';
import { FileText, CheckCircle2, Clock, AlertTriangle, Ban, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceSummaryCardsProps {
  invoices: Array<{ status: string; amount: number; vat_amount?: number }>;
  isLoading: boolean;
}

const InvoiceSummaryCards = ({ invoices, isLoading }: InvoiceSummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const total = invoices.length;
  const paid = invoices.filter(i => i.status === 'paid');
  const pending = invoices.filter(i => i.status === 'pending');
  const overdue = invoices.filter(i => i.status === 'overdue');
  const cancelled = invoices.filter(i => i.status === 'cancelled');
  const totalAmount = invoices.reduce((s, i) => s + safeNumber(i.amount), 0);
  const paidAmount = paid.reduce((s, i) => s + safeNumber(i.amount), 0);
  const totalVat = invoices.reduce((s, i) => s + safeNumber(i.vat_amount ?? 0), 0);
  const collectionRate = total > 0 ? Math.round((paid.length / total) * 100) : 0;

  const cards = [
    {
      label: 'إجمالي الفواتير',
      value: total.toLocaleString(),
      sub: `${totalAmount.toLocaleString()} ر.س`,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
    },
    {
      label: 'المسددة',
      value: paid.length.toLocaleString(),
      sub: `${paidAmount.toLocaleString()} ر.س`,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/20',
    },
    {
      label: 'قيد الانتظار',
      value: pending.length.toLocaleString(),
      sub: `${pending.reduce((s, i) => s + safeNumber(i.amount), 0).toLocaleString()} ر.س`,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/20',
    },
    {
      label: 'المتأخرة',
      value: (overdue.length + cancelled.length).toLocaleString(),
      sub: overdue.length > 0 ? `${overdue.reduce((s, i) => s + safeNumber(i.amount), 0).toLocaleString()} ر.س` : 'لا يوجد',
      icon: overdue.length > 0 ? AlertTriangle : Ban,
      color: overdue.length > 0 ? 'text-destructive' : 'text-muted-foreground',
      bg: overdue.length > 0 ? 'bg-destructive/10' : 'bg-muted/30',
      border: overdue.length > 0 ? 'border-destructive/20' : 'border-muted',
    },
    {
      label: 'نسبة التحصيل',
      value: `${collectionRate}%`,
      sub: totalVat > 0 ? `ضريبة: ${totalVat.toLocaleString()} ر.س` : 'بدون ضريبة',
      icon: TrendingUp,
      color: collectionRate >= 70 ? 'text-success' : collectionRate >= 40 ? 'text-warning' : 'text-destructive',
      bg: collectionRate >= 70 ? 'bg-success/10' : collectionRate >= 40 ? 'bg-warning/10' : 'bg-destructive/10',
      border: collectionRate >= 70 ? 'border-success/20' : collectionRate >= 40 ? 'border-warning/20' : 'border-destructive/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className={cn('shadow-sm border transition-colors', card.border)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{card.label}</p>
                  <p className={cn('text-lg sm:text-2xl font-bold', card.color)}>{card.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{card.sub}</p>
                </div>
                <div className={cn('rounded-lg p-2 shrink-0', card.bg)}>
                  <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', card.color)} />
                </div>
              </div>
              {/* شريط تقدم صغير للبطاقة الأخيرة */}
              {i === 4 && total > 0 && (
                <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      collectionRate >= 70 ? 'bg-success' : collectionRate >= 40 ? 'bg-warning' : 'bg-destructive'
                    )}
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default InvoiceSummaryCards;
