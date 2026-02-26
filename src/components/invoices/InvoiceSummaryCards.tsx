import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceSummaryCardsProps {
  invoices: Array<{ status: string; amount: number }>;
  isLoading: boolean;
}

const InvoiceSummaryCards = ({ invoices, isLoading }: InvoiceSummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الفواتير</p>
          <p className="text-lg sm:text-2xl font-bold">{invoices.length}</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">المدفوعة</p>
          <p className="text-lg sm:text-2xl font-bold text-success">{invoices.filter(i => i.status === 'paid').length}</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">المعلقة</p>
          <p className="text-lg sm:text-2xl font-bold text-warning">{invoices.filter(i => i.status === 'pending').length}</p>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المبالغ</p>
          <p className="text-lg sm:text-2xl font-bold text-primary">{invoices.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()} ر.س</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceSummaryCards;
