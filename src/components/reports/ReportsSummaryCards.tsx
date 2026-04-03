/**
 * بطاقات ملخص صفحة التقارير
 */
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt } from '@/utils/format';

interface ReportsSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  propertyCount: number;
  isLoading: boolean;
}

const ReportsSummaryCards = ({ totalIncome, totalExpenses, netRevenue, propertyCount, isLoading }: ReportsSummaryCardsProps) => {
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">إجمالي الدخل</p><p className="text-lg sm:text-2xl font-bold text-success tabular-nums truncate">{fmt(totalIncome)} ر.س</p></CardContent></Card>
      <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">إجمالي المصروفات</p><p className="text-lg sm:text-2xl font-bold text-destructive tabular-nums truncate">{fmt(totalExpenses)} ر.س</p></CardContent></Card>
      <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">صافي الريع</p><p className="text-lg sm:text-2xl font-bold text-primary tabular-nums truncate">{fmt(netRevenue)} ر.س</p></CardContent></Card>
      <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">عدد العقارات</p><p className="text-lg sm:text-2xl font-bold tabular-nums">{propertyCount}</p></CardContent></Card>
    </div>
  );
};

export default ReportsSummaryCards;
