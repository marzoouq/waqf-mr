/**
 * YoYChangeCards — بطاقات التغير الثلاث (دخل/مصروفات/صافي)
 * مكوّن UI خالص مستخرج من YearOverYearComparison
 */
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmt } from '@/utils/format/format';

interface ChangeCardProps {
  label: string;
  change: number;
  val1: number;
  val2: number;
  year1Label: string;
  year2Label: string;
  invertColor?: boolean;
}

const ChangeCard = ({ label, change, val1, val2, year1Label, year2Label, invertColor = false }: ChangeCardProps) => {
  const isPositive = invertColor ? change < 0 : change > 0;
  const isNegative = invertColor ? change > 0 : change < 0;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          {change > 0 ? <TrendingUp className={`w-5 h-5 ${isPositive ? 'text-success' : 'text-destructive'}`} /> :
           change < 0 ? <TrendingDown className={`w-5 h-5 ${isNegative ? 'text-destructive' : 'text-success'}`} /> :
           <Minus className="w-5 h-5 text-muted-foreground" />}
          <span className={`text-lg sm:text-xl font-bold ${isPositive ? 'text-success' : isNegative ? 'text-destructive' : ''}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
        <div className="flex gap-2 mt-1 text-[11px] sm:text-xs text-muted-foreground">
          <span>{year1Label}: {fmt(val1)}</span>
          <span>→</span>
          <span>{year2Label}: {fmt(val2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface YoYChangeCardsProps {
  year1Label: string;
  year2Label: string;
  yearTotals: {
    year1: { income: number; expenses: number; net: number };
    year2: { income: number; expenses: number; net: number };
  };
  incomeChange: number;
  expenseChange: number;
  netChange: number;
}

const YoYChangeCards = ({
  year1Label, year2Label, yearTotals, incomeChange, expenseChange, netChange,
}: YoYChangeCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <ChangeCard label="التغير في الدخل" change={incomeChange}
        val1={yearTotals.year1.income} val2={yearTotals.year2.income}
        year1Label={year1Label} year2Label={year2Label} />
      <ChangeCard label="التغير في المصروفات" change={expenseChange}
        val1={yearTotals.year1.expenses} val2={yearTotals.year2.expenses}
        year1Label={year1Label} year2Label={year2Label} invertColor />
      <ChangeCard label="التغير في الصافي" change={netChange}
        val1={yearTotals.year1.net} val2={yearTotals.year2.net}
        year1Label={year1Label} year2Label={year2Label} />
    </div>
  );
};

export default YoYChangeCards;
