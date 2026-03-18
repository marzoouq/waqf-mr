import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmt } from '@/utils/format';

interface MonthlyPerformanceReportProps {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  fiscalYear?: string;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };

const MonthlyPerformanceReport = ({ income, expenses }: MonthlyPerformanceReportProps) => {
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { income: number; expenses: number; month: number; year: number }>();

    for (const item of income) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = monthMap.get(key) || { income: 0, expenses: 0, month: d.getMonth(), year: d.getFullYear() };
      existing.income += safeNumber(item.amount);
      monthMap.set(key, existing);
    }

    for (const item of expenses) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = monthMap.get(key) || { income: 0, expenses: 0, month: d.getMonth(), year: d.getFullYear() };
      existing.expenses += safeNumber(item.amount);
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.values())
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map(item => ({
        ...item,
        name: MONTH_NAMES[item.month],
        net: item.income - item.expenses,
        label: `${MONTH_NAMES[item.month]} ${item.year}`,
      }));
  }, [income, expenses]);

  const totals = useMemo(() => {
    return monthlyData.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        net: acc.net + m.net,
      }),
      { income: 0, expenses: 0, net: 0 }
    );
  }, [monthlyData]);

  const bestMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return monthlyData.reduce((best, m) => m.net > best.net ? m : best, monthlyData[0]);
  }, [monthlyData]);

  const worstMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return monthlyData.reduce((worst, m) => m.net < worst.net ? m : worst, monthlyData[0]);
  }, [monthlyData]);

  const avgMonthlyIncome = monthlyData.length > 0 ? totals.income / monthlyData.length : 0;
  const avgMonthlyExpenses = monthlyData.length > 0 ? totals.expenses / monthlyData.length : 0;


  if (monthlyData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          لا توجد بيانات مالية للسنة المالية المحددة
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">متوسط الدخل الشهري</p>
            <p className="text-base sm:text-xl font-bold text-success">{fmt(Math.round(avgMonthlyIncome))} ر.س</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">متوسط المصروفات الشهرية</p>
            <p className="text-base sm:text-xl font-bold text-destructive">{Math.roundfmt(avgMonthlyExpenses)} ر.س</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">أفضل شهر (صافي)</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <p className="text-base sm:text-xl font-bold">{bestMonth?.label}</p>
            </div>
            <p className="text-xs text-success">{bestMonth?.fmt(net)} ر.س</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground">أضعف شهر (صافي)</p>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <p className="text-base sm:text-xl font-bold">{worstMonth?.label}</p>
            </div>
            <p className="text-xs text-destructive">{worstMonth?.fmt(net)} ر.س</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart: Income vs Expenses */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">مقارنة الدخل والمصروفات الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    `${fmt(value ?? 0)} ر.س`,
                    name === 'income' ? 'الدخل' : name === 'expenses' ? 'المصروفات' : 'الصافي',
                  ]}
                  labelFormatter={(label) => label}
                />
                <Legend formatter={(value) => value === 'income' ? 'الدخل' : value === 'expenses' ? 'المصروفات' : 'الصافي'} />
                <Bar dataKey="income" fill="hsl(var(--success))" name="income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Area Chart: Net Trend */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">اتجاه صافي الدخل الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | undefined) => [`${fmt(value ?? 0)} ر.س`, 'صافي الدخل']}
                />
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="hsl(var(--primary))"
                  fill="url(#netGradient)"
                  strokeWidth={2}
                  name="صافي الدخل"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">التفصيل الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                  const prevNet = idx > 0 ? monthlyData[idx - 1].net : null;
                  return (
                    <TableRow key={`${m.year}-${m.month}`}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className="text-success">{fmt(m.income)} ر.س</TableCell>
                      <TableCell className="text-destructive">{fmt(m.expenses)} ر.س</TableCell>
                      <TableCell className={m.net >= 0 ? 'text-primary font-bold' : 'text-destructive font-bold'}>
                        {fmt(m.net)} ر.س
                      </TableCell>
                      <TableCell>
                        {prevNet === null ? (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        ) : m.net > prevNet ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : m.net < prevNet ? (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
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
    </div>
  );
};

export default MonthlyPerformanceReport;
