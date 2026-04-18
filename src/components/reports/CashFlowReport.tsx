/**
 * تقرير التدفق النقدي — الرسم البياني يُحمَّل كسولاً.
 */
import { useMemo, lazy, Suspense, memo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtInt } from '@/utils/format/format';
import { Skeleton } from '@/components/ui/skeleton';
import CashFlowTable from './CashFlowTable';
import { MONTH_NAMES } from '@/constants/calendar';

const CashFlowChartInner = lazy(() => import('./CashFlowChartInner'));

interface CashFlowReportProps {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  fiscalYear?: { label: string; start_date: string; end_date: string } | null;
}

const CashFlowReport = ({ income, expenses, fiscalYear }: CashFlowReportProps) => {
  const monthlyData = useMemo(() => {
    const months: Array<{ month: string; monthNum: number; income: number; expenses: number; net: number; cumulative: number }> = [];
    const startDate = fiscalYear ? new Date(fiscalYear.start_date) : new Date(new Date().getFullYear(), 0, 1);
    let cumulative = 0;
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const monthIncome = income.filter(item => { const d = new Date(item.date); return d.getFullYear() === year && d.getMonth() === month; }).reduce((sum, item) => sum + safeNumber(item.amount), 0);
      const monthExpenses = expenses.filter(item => { const d = new Date(item.date); return d.getFullYear() === year && d.getMonth() === month; }).reduce((sum, item) => sum + safeNumber(item.amount), 0);
      const net = monthIncome - monthExpenses;
      cumulative += net;
      months.push({ month: MONTH_NAMES[month]!, monthNum: month, income: monthIncome, expenses: monthExpenses, net, cumulative });
    }
    return months;
  }, [income, expenses, fiscalYear]);

  const totals = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    const totalNet = totalIncome - totalExpenses;
    const positiveMonths = monthlyData.filter(m => m.net > 0).length;
    const negativeMonths = monthlyData.filter(m => m.net < 0).length;
    return { totalIncome, totalExpenses, totalNet, positiveMonths, negativeMonths };
  }, [monthlyData]);

  const fmt = (v: number) => fmtInt(v);

  return (
    <div className="space-y-6">
      {/* بطاقات ملخصة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">إجمالي التدفقات الداخلة</p>
            <p className="text-lg font-bold text-success">{fmt(totals.totalIncome)} ر.س</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">إجمالي التدفقات الخارجة</p>
            <p className="text-lg font-bold text-destructive">{fmt(totals.totalExpenses)} ر.س</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">صافي التدفق النقدي</p>
            <p className={`text-lg font-bold ${totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.totalNet)} ر.س</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">أشهر موجبة / سالبة</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-success text-sm font-bold"><TrendingUp className="w-3.5 h-3.5" />{totals.positiveMonths}</span>
              <span className="text-muted-foreground">/</span>
              <span className="flex items-center gap-1 text-destructive text-sm font-bold"><TrendingDown className="w-3.5 h-3.5" />{totals.negativeMonths}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسم البياني */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="w-5 h-5" />
            التدفق النقدي الشهري {fiscalYear ? `(${fiscalYear.label})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[350px] w-full rounded-lg" />}>
            <CashFlowChartInner monthlyData={monthlyData} fmt={fmt} />
          </Suspense>
        </CardContent>
      </Card>

      {/* الجدول التفصيلي */}
      <CashFlowTable monthlyData={monthlyData} totals={totals} fmt={fmt} />
    </div>
  );
};

export default memo(CashFlowReport);
