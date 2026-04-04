import { fmt } from '@/utils/format/format';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Hash, Calculator, Star } from 'lucide-react';

interface IncomeSummaryCardsProps {
  isLoading: boolean;
  totalIncome: number;
  summaryCards: {
    count: number;
    avg: number;
    topSource: string;
    topSourceAmount: number;
  };
}

const IncomeSummaryCards = ({ isLoading, totalIncome, summaryCards }: IncomeSummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10 shrink-0"><TrendingUp className="w-5 h-5 text-success" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">إجمالي الدخل</p><p className="text-base sm:text-xl font-bold text-success tabular-nums truncate">{fmt(totalIncome)} <span className="text-xs font-normal">ريال</span></p></div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Hash className="w-5 h-5 text-primary" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">عدد السجلات</p><p className="text-base sm:text-xl font-bold tabular-nums">{summaryCards.count}</p></div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/50 shrink-0"><Calculator className="w-5 h-5 text-accent-foreground" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">متوسط الدخل</p><p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(summaryCards.avg)} <span className="text-xs font-normal">ريال</span></p></div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10 shrink-0"><Star className="w-5 h-5 text-warning" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">أعلى مصدر</p><p className="text-sm font-bold truncate">{summaryCards.topSource}</p><p className="text-xs text-muted-foreground tabular-nums truncate">{fmt(summaryCards.topSourceAmount)} ريال</p></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeSummaryCards;
