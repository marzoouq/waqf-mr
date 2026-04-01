/**
 * بطاقات الملخص المالي — مستخرجة من ReportsPage
 */
import { fmt } from '@/utils/format';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportsSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  propertiesCount: number;
  isLoading: boolean;
}

const ReportsSummaryCards = ({ totalIncome, totalExpenses, netRevenue, propertiesCount, isLoading }: ReportsSummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'إجمالي الدخل', value: `${fmt(totalIncome)} ر.س`, color: 'text-success' },
    { label: 'إجمالي المصروفات', value: `${fmt(totalExpenses)} ر.س`, color: 'text-destructive' },
    { label: 'صافي الريع', value: `${fmt(netRevenue)} ر.س`, color: 'text-primary' },
    { label: 'عدد العقارات', value: String(propertiesCount), color: '' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">{card.label}</p>
            <p className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${card.color}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReportsSummaryCards;
