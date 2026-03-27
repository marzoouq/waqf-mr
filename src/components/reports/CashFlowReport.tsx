/**
 * تقرير التدفق النقدي — الرسم البياني يُحمَّل كسولاً.
 */
import { useMemo, lazy, Suspense } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtInt } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const CashFlowChartInner = lazy(() => import('./CashFlowChartInner'));

// أسماء الأشهر العربية
const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface CashFlowReportProps {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  fiscalYear?: { label: string; start_date: string; end_date: string } | null;
}

const CashFlowReport = ({ income, expenses, fiscalYear }: CashFlowReportProps) => {
  const monthlyData = useMemo(() => {
    const months: Array<{
      month: string;
      monthNum: number;
      income: number;
      expenses: number;
      net: number;
      cumulative: number;
    }> = [];

    const startDate = fiscalYear ? new Date(fiscalYear.start_date) : new Date(new Date().getFullYear(), 0, 1);

    let cumulative = 0;
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const monthIncome = income
        .filter(item => {
          const d = new Date(item.date);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, item) => sum + safeNumber(item.amount), 0);

      const monthExpenses = expenses
        .filter(item => {
          const d = new Date(item.date);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, item) => sum + safeNumber(item.amount), 0);

      const net = monthIncome - monthExpenses;
      cumulative += net;

      months.push({
        month: MONTH_NAMES[month]!,
        monthNum: month,
        income: monthIncome,
        expenses: monthExpenses,
        net,
        cumulative,
      });
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
            <p className={`text-lg font-bold ${totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(totals.totalNet)} ر.س
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">أشهر موجبة / سالبة</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-success text-sm font-bold">
                <TrendingUp className="w-3.5 h-3.5" />{totals.positiveMonths}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="flex items-center gap-1 text-destructive text-sm font-bold">
                <TrendingDown className="w-3.5 h-3.5" />{totals.negativeMonths}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسم البياني — يُحمَّل كسولاً */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="w-5 h-5" />
            التدفق النقدي الشهري {fiscalYear ? `(${fiscalYear.label})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[350px] w-full rounded-lg" />}>
            <CashFlowChartInner monthlyData={monthlyData} title="" fmt={fmt} />
          </Suspense>
        </CardContent>
      </Card>

      {/* الجدول التفصيلي */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">جدول التدفق النقدي الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {monthlyData.map((row) => (
              <div key={row.month} className="p-3 rounded-lg border bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{row.month}</span>
                  <span className={`text-xs font-bold ${row.cumulative >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    تراكمي: {fmt(row.cumulative)}
                  </span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-success">+{fmt(row.income)}</span>
                  <span className="text-destructive">-{fmt(row.expenses)}</span>
                  <span className={`font-medium ${row.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                    صافي: {fmt(row.net)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-bold text-sm">
              <span>الإجمالي</span>
              <div className="flex gap-3 text-xs">
                <span className="text-success">{fmt(totals.totalIncome)}</span>
                <span className="text-destructive">{fmt(totals.totalExpenses)}</span>
                <span className={totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}>{fmt(totals.totalNet)}</span>
              </div>
            </div>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead>
                  <TableHead>التدفقات الداخلة</TableHead>
                  <TableHead>التدفقات الخارجة</TableHead>
                  <TableHead>صافي الشهر</TableHead>
                  <TableHead>الرصيد التراكمي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-success">{fmt(row.income)}</TableCell>
                    <TableCell className="text-destructive">{fmt(row.expenses)}</TableCell>
                    <TableCell className={row.net >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                      {fmt(row.net)}
                    </TableCell>
                    <TableCell className={row.cumulative >= 0 ? 'text-primary font-bold' : 'text-destructive font-bold'}>
                      {fmt(row.cumulative)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/70 font-bold">
                  <TableCell>الإجمالي</TableCell>
                  <TableCell className="text-success">{fmt(totals.totalIncome)}</TableCell>
                  <TableCell className="text-destructive">{fmt(totals.totalExpenses)}</TableCell>
                  <TableCell className={totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}>
                    {fmt(totals.totalNet)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowReport;
