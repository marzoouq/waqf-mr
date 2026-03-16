import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { FiscalYear } from '@/hooks/useFiscalYears';
import { generateYearComparisonPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';

interface YearOverYearComparisonProps {
  fiscalYears: FiscalYear[];
  currentFiscalYearId: string;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };

function buildMonthlyMap(items: Array<{ date: string; amount: number }>) {
  const map = new Map<number, number>();
  for (const item of items) {
    const d = new Date(item.date);
    const month = d.getMonth();
    map.set(month, (map.get(month) || 0) + Number(item.amount));
  }
  return map;
}

const YearOverYearComparison = ({ fiscalYears, currentFiscalYearId }: YearOverYearComparisonProps) => {
  const waqfInfo = usePdfWaqfInfo();
  const [year1Id, setYear1Id] = useState(currentFiscalYearId);
  const [year2Id, setYear2Id] = useState('');

  // Sync when fiscal years load (currentFiscalYearId starts as '')
  useEffect(() => {
    if (currentFiscalYearId && !year1Id) {
      setYear1Id(currentFiscalYearId);
    }
    if (fiscalYears.length >= 2 && !year2Id) {
      const other = fiscalYears.find(fy => fy.id !== currentFiscalYearId);
      if (other) setYear2Id(other.id);
    }
  }, [currentFiscalYearId, fiscalYears, year1Id, year2Id]);

  const year1Label = fiscalYears.find(fy => fy.id === year1Id)?.label || '';
  const year2Label = fiscalYears.find(fy => fy.id === year2Id)?.label || '';

  const year1Status = fiscalYears.find(fy => fy.id === year1Id)?.status;
  const year2Status = fiscalYears.find(fy => fy.id === year2Id)?.status;

  const summary1 = useFinancialSummary(year1Id || undefined, year1Label, { fiscalYearStatus: year1Status });
  const summary2 = useFinancialSummary(year2Id || undefined, year2Label, { fiscalYearStatus: year2Status });

  const comparisonData = useMemo(() => {
    const incomeMap1 = buildMonthlyMap(summary1.income);
    const expenseMap1 = buildMonthlyMap(summary1.expenses);
    const incomeMap2 = buildMonthlyMap(summary2.income);
    const expenseMap2 = buildMonthlyMap(summary2.expenses);

    return MONTH_NAMES.map((name, idx) => {
      const inc1 = incomeMap1.get(idx) || 0;
      const exp1 = expenseMap1.get(idx) || 0;
      const inc2 = incomeMap2.get(idx) || 0;
      const exp2 = expenseMap2.get(idx) || 0;
      return {
        month: name,
        [`دخل ${year1Label}`]: inc1,
        [`دخل ${year2Label}`]: inc2,
        [`مصروفات ${year1Label}`]: exp1,
        [`مصروفات ${year2Label}`]: exp2,
        net1: inc1 - exp1,
        net2: inc2 - exp2,
      };
    }).filter(d => {
      // Only show months that have data in at least one year
      const keys = Object.keys(d).filter(k => k !== 'month');
      return keys.some(k => (d as Record<string, unknown>)[k] !== 0);
    });
  }, [summary1.income, summary1.expenses, summary2.income, summary2.expenses, year1Label, year2Label]);

  const COLORS = [
    'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))',
    'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))',
    'hsl(var(--accent))', 'hsl(var(--chart-4))',
  ];

  const expensesByType1 = useMemo(() => {
    return Object.entries(summary1.expensesByType).map(([name, value]) => ({ name, value }));
  }, [summary1.expensesByType]);

  const expensesByType2 = useMemo(() => {
    return Object.entries(summary2.expensesByType).map(([name, value]) => ({ name, value }));
  }, [summary2.expensesByType]);

  const yearTotals = useMemo(() => ({
    year1: { income: summary1.totalIncome, expenses: summary1.totalExpenses, net: summary1.totalIncome - summary1.totalExpenses },
    year2: { income: summary2.totalIncome, expenses: summary2.totalExpenses, net: summary2.totalIncome - summary2.totalExpenses },
  }), [summary1.totalIncome, summary1.totalExpenses, summary2.totalIncome, summary2.totalExpenses]);

  const incomeChange = yearTotals.year1.income > 0
    ? ((yearTotals.year2.income - yearTotals.year1.income) / yearTotals.year1.income * 100)
    : 0;
  const expenseChange = yearTotals.year1.expenses > 0
    ? ((yearTotals.year2.expenses - yearTotals.year1.expenses) / yearTotals.year1.expenses * 100)
    : 0;
  const netChange = yearTotals.year1.net !== 0
    ? ((yearTotals.year2.net - yearTotals.year1.net) / Math.abs(yearTotals.year1.net) * 100)
    : 0;


  const handleExportPDF = async () => {
    const MONTH_LABELS = MONTH_NAMES;
    const incomeMap1 = buildMonthlyMap(summary1.income);
    const expenseMap1 = buildMonthlyMap(summary1.expenses);
    const incomeMap2 = buildMonthlyMap(summary2.income);
    const expenseMap2 = buildMonthlyMap(summary2.expenses);

    const monthlyPdfData = MONTH_LABELS.map((name, idx) => ({
      month: name,
      income1: incomeMap1.get(idx) || 0,
      expenses1: expenseMap1.get(idx) || 0,
      net1: (incomeMap1.get(idx) || 0) - (expenseMap1.get(idx) || 0),
      income2: incomeMap2.get(idx) || 0,
      expenses2: expenseMap2.get(idx) || 0,
      net2: (incomeMap2.get(idx) || 0) - (expenseMap2.get(idx) || 0),
    })).filter(m => m.income1 || m.expenses1 || m.income2 || m.expenses2);

    await generateYearComparisonPDF({
      year1Label, year2Label,
      year1: yearTotals.year1, year2: yearTotals.year2,
      incomeChange, expenseChange, netChange,
      expensesByType1, expensesByType2,
      monthlyData: monthlyPdfData,
    }, waqfInfo);
  };

  if (fiscalYears.length < 2) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          يجب وجود سنتين ماليتين على الأقل لإجراء المقارنة
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year Selectors */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 flex-1 w-full">
              <span className="text-sm font-medium whitespace-nowrap">السنة الأولى:</span>
              <Select value={year1Id} onValueChange={setYear1Id}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYears.map(fy => (
                    <SelectItem key={fy.id} value={fy.id} disabled={fy.id === year2Id}>
                      {fy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowUpDown className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 flex-1 w-full">
              <span className="text-sm font-medium whitespace-nowrap">السنة الثانية:</span>
              <Select value={year2Id} onValueChange={setYear2Id}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYears.map(fy => (
                    <SelectItem key={fy.id} value={fy.id} disabled={fy.id === year1Id}>
                      {fy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">التغير في الدخل</p>
            <div className="flex items-center gap-2">
              {incomeChange > 0 ? <TrendingUp className="w-5 h-5 text-success" /> :
               incomeChange < 0 ? <TrendingDown className="w-5 h-5 text-destructive" /> :
               <Minus className="w-5 h-5 text-muted-foreground" />}
              <span className={`text-lg sm:text-xl font-bold ${incomeChange > 0 ? 'text-success' : incomeChange < 0 ? 'text-destructive' : ''}`}>
                {incomeChange > 0 ? '+' : ''}{incomeChange.toFixed(1)}%
              </span>
            </div>
            <div className="flex gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
              <span>{year1Label}: {yearTotals.year1.income.toLocaleString()}</span>
              <span>→</span>
              <span>{year2Label}: {yearTotals.year2.income.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">التغير في المصروفات</p>
            <div className="flex items-center gap-2">
              {expenseChange < 0 ? <TrendingDown className="w-5 h-5 text-success" /> :
               expenseChange > 0 ? <TrendingUp className="w-5 h-5 text-destructive" /> :
               <Minus className="w-5 h-5 text-muted-foreground" />}
              <span className={`text-lg sm:text-xl font-bold ${expenseChange < 0 ? 'text-success' : expenseChange > 0 ? 'text-destructive' : ''}`}>
                {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%
              </span>
            </div>
            <div className="flex gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
              <span>{year1Label}: {yearTotals.year1.expenses.toLocaleString()}</span>
              <span>→</span>
              <span>{year2Label}: {yearTotals.year2.expenses.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">التغير في الصافي</p>
            <div className="flex items-center gap-2">
              {netChange > 0 ? <TrendingUp className="w-5 h-5 text-success" /> :
               netChange < 0 ? <TrendingDown className="w-5 h-5 text-destructive" /> :
               <Minus className="w-5 h-5 text-muted-foreground" />}
              <span className={`text-lg sm:text-xl font-bold ${netChange > 0 ? 'text-success' : netChange < 0 ? 'text-destructive' : ''}`}>
                {netChange > 0 ? '+' : ''}{netChange.toFixed(1)}%
              </span>
            </div>
            <div className="flex gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
              <span>{year1Label}: {yearTotals.year1.net.toLocaleString()}</span>
              <span>→</span>
              <span>{year2Label}: {yearTotals.year2.net.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Comparison Bar Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">مقارنة الدخل الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${value.toLocaleString()} ر.س`, name]} />
                <Legend />
                <Bar dataKey={`دخل ${year1Label}`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey={`دخل ${year2Label}`} fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Net Income Trend Line Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">مقارنة صافي الدخل الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} ر.س`, name]}
                />
                <Legend />
                <Line type="monotone" dataKey="net1" stroke="hsl(var(--primary))" strokeWidth={2} name={`صافي ${year1Label}`} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="net2" stroke="hsl(var(--success))" strokeWidth={2} name={`صافي ${year2Label}`} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Expense Distribution Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Badge variant="outline">{year1Label}</Badge>
              توزيع المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByType1.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expensesByType1}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                     label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={85}
                    dataKey="value"
                    style={{ fontSize: '11px' }}
                  >
                    {expensesByType1.map((_entry, index) => (
                      <Cell key={`cell-y1-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Badge variant="secondary">{year2Label}</Badge>
              توزيع المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByType2.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expensesByType2}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={85}
                    dataKey="value"
                    style={{ fontSize: '11px' }}
                  >
                    {expensesByType2.map((_entry, index) => (
                      <Cell key={`cell-y2-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">جدول المقارنة التفصيلي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right" rowSpan={2}>الشهر</TableHead>
                  <TableHead className="text-center border-x" colSpan={3}>
                    <Badge variant="outline">{year1Label}</Badge>
                  </TableHead>
                  <TableHead className="text-center border-x" colSpan={3}>
                    <Badge variant="secondary">{year2Label}</Badge>
                  </TableHead>
                  <TableHead className="text-right">الفرق</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right text-xs">الدخل</TableHead>
                  <TableHead className="text-right text-xs">المصروفات</TableHead>
                  <TableHead className="text-right text-xs border-l">الصافي</TableHead>
                  <TableHead className="text-right text-xs">الدخل</TableHead>
                  <TableHead className="text-right text-xs">المصروفات</TableHead>
                  <TableHead className="text-right text-xs border-l">الصافي</TableHead>
                  <TableHead className="text-right text-xs">في الصافي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((row) => {
                  const diff = row.net2 - row.net1;
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-success text-xs">{(row[`دخل ${year1Label}`] as number).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive text-xs">{(row[`مصروفات ${year1Label}`] as number).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-xs border-l">{row.net1.toLocaleString()}</TableCell>
                      <TableCell className="text-success text-xs">{(row[`دخل ${year2Label}`] as number).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive text-xs">{(row[`مصروفات ${year2Label}`] as number).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-xs border-l">{row.net2.toLocaleString()}</TableCell>
                      <TableCell className={`font-bold text-xs ${diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''}`}>
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">الإجمالي</TableCell>
                  <TableCell className="font-bold text-success text-xs">{yearTotals.year1.income.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-destructive text-xs">{yearTotals.year1.expenses.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-xs border-l">{yearTotals.year1.net.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-success text-xs">{yearTotals.year2.income.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-destructive text-xs">{yearTotals.year2.expenses.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-xs border-l">{yearTotals.year2.net.toLocaleString()}</TableCell>
                  <TableCell className={`font-bold text-xs ${(yearTotals.year2.net - yearTotals.year1.net) > 0 ? 'text-success' : 'text-destructive'}`}>
                    {(yearTotals.year2.net - yearTotals.year1.net) > 0 ? '+' : ''}
                    {(yearTotals.year2.net - yearTotals.year1.net).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default YearOverYearComparison;
