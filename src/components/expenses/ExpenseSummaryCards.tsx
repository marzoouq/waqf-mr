import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, Paperclip, Calculator, Star } from 'lucide-react';
import { Expense } from '@/types/database';
import { fmt } from '@/utils/format';

interface ExpenseSummaryCardsProps {
  expenses: Expense[];
  totalExpenses: number;
  documentedCount: number;
  documentationRate: number;
  isLoading: boolean;
}

const ExpenseSummaryCards = ({ expenses, totalExpenses, documentedCount, documentationRate, isLoading }: ExpenseSummaryCardsProps) => {
  const { avg, topType, topTypeAmount } = useMemo(() => {
    const count = expenses.length;
    const avg = count > 0 ? Math.round(totalExpenses / count) : 0;
    const typeMap = new Map<string, number>();
    expenses.forEach(e => typeMap.set(e.expense_type, (typeMap.get(e.expense_type) || 0) + Number(e.amount)));
    let topType = '-';
    let topTypeAmount = 0;
    typeMap.forEach((amount, type) => { if (amount > topTypeAmount) { topTypeAmount = amount; topType = type; } });
    return { avg, topType, topTypeAmount };
  }, [expenses, totalExpenses]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10 shrink-0"><TrendingDown className="w-5 h-5 text-destructive" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">إجمالي المصروفات</p><p className="text-base sm:text-xl font-bold text-destructive tabular-nums truncate">{fmt(totalExpenses)} <span className="text-xs font-normal">ريال</span></p></div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Paperclip className="w-5 h-5 text-primary" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">نسبة التوثيق</p><p className="text-base sm:text-xl font-bold tabular-nums">{documentationRate}%</p><p className="text-xs text-muted-foreground">{documentedCount}/{expenses.length}</p></div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/50"><Calculator className="w-5 h-5 text-accent-foreground" /></div>
          <div><p className="text-xs text-muted-foreground">متوسط المصروف</p><p className="text-xl font-bold">{fmt(avg)} <span className="text-xs font-normal">ريال</span></p></div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Star className="w-5 h-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">أعلى نوع</p><p className="text-sm font-bold truncate max-w-[120px]">{topType}</p><p className="text-xs text-muted-foreground">{fmt(topTypeAmount)} ريال</p></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummaryCards;
