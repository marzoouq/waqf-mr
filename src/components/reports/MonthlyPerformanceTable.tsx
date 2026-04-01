/**
 * جدول التفصيل الشهري (موبايل + سطح المكتب)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { MonthlyRow, MonthlyTotals } from '@/hooks/reports/useMonthlyPerformanceData';

interface Props {
  monthlyData: MonthlyRow[];
  totals: MonthlyTotals;
}

const TrendIcon = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (current > previous) return <TrendingUp className="w-4 h-4 text-success" />;
  if (current < previous) return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const trendColor = (current: number, previous: number | null) => {
  if (previous === null) return 'text-muted-foreground';
  return current > previous ? 'text-success' : current < previous ? 'text-destructive' : 'text-muted-foreground';
};

const MonthlyPerformanceTable = ({ monthlyData, totals }: Props) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="text-sm sm:text-base">التفصيل الشهري</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Mobile */}
      <div className="space-y-2 md:hidden">
        {monthlyData.map((m, idx) => {
          const prevNet = idx > 0 ? monthlyData[idx - 1]!.net : null;
          return (
            <div key={`${m.year}-${m.month}`} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <TrendIcon current={m.net} previous={prevNet} />
                <span className="font-medium text-sm">{m.label}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-success">{fmt(m.income)}</span>
                <span className="text-destructive">{fmt(m.expenses)}</span>
                <span className={`font-bold ${m.net >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(m.net)}</span>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-bold text-sm">
          <span>الإجمالي</span>
          <div className="flex gap-3 text-xs">
            <span className="text-success">{fmt(totals.income)}</span>
            <span className="text-destructive">{fmt(totals.expenses)}</span>
            <span className={totals.net >= 0 ? 'text-primary' : 'text-destructive'}>{fmt(totals.net)}</span>
          </div>
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الشهر</TableHead>
              <TableHead className="text-right">الدخل</TableHead>
              <TableHead className="text-right">المصروفات</TableHead>
              <TableHead className="text-right">الصافي</TableHead>
              <TableHead className="text-right">الاتجاه</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((m, idx) => {
              const prevNet = idx > 0 ? monthlyData[idx - 1]!.net : null;
              return (
                <TableRow key={`${m.year}-${m.month}`}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-success">{fmt(m.income)} ر.س</TableCell>
                  <TableCell className="text-destructive">{fmt(m.expenses)} ر.س</TableCell>
                  <TableCell className={m.net >= 0 ? 'text-primary font-bold' : 'text-destructive font-bold'}>
                    {fmt(m.net)} ر.س
                  </TableCell>
                  <TableCell>
                    <TrendIcon current={m.net} previous={prevNet} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">الإجمالي</TableCell>
              <TableCell className="font-bold text-success">{fmt(totals.income)} ر.س</TableCell>
              <TableCell className="font-bold text-destructive">{fmt(totals.expenses)} ر.س</TableCell>
              <TableCell className={`font-bold ${totals.net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {fmt(totals.net)} ر.س
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default MonthlyPerformanceTable;
