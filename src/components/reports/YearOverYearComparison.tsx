import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { safeNumber } from '@/utils/format/safeNumber';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { FiscalYear } from '@/hooks/financial/useFiscalYears';
import { generateYearComparisonPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { fmt } from '@/utils/format/format';
const YoYChartsSection = lazy(() => import('@/components/reports/YoYChartsSection'));
import { YoYComparisonTable } from '@/components/reports';

interface YearOverYearComparisonProps {
  fiscalYears: FiscalYear[];
  currentFiscalYearId: string;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function buildMonthlyMap(items: Array<{ date: string; amount: number }>) {
  const map = new Map<number, number>();
  for (const item of items) {
    const d = new Date(item.date);
    const month = d.getMonth();
    map.set(month, (map.get(month) || 0) + safeNumber(item.amount));
  }
  return map;
}

const YearOverYearComparison = ({ fiscalYears, currentFiscalYearId }: YearOverYearComparisonProps) => {
  const waqfInfo = usePdfWaqfInfo();
  const [year1Id, setYear1Id] = useState(currentFiscalYearId);
  const [year2Id, setYear2Id] = useState('');

  useEffect(() => {
    if (currentFiscalYearId && !year1Id) setYear1Id(currentFiscalYearId);
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

    return MONTH_NAMES.map((name, idx) => ({
      month: name,
      [`دخل ${year1Label}`]: incomeMap1.get(idx) || 0,
      [`دخل ${year2Label}`]: incomeMap2.get(idx) || 0,
      [`مصروفات ${year1Label}`]: expenseMap1.get(idx) || 0,
      [`مصروفات ${year2Label}`]: expenseMap2.get(idx) || 0,
      net1: (incomeMap1.get(idx) || 0) - (expenseMap1.get(idx) || 0),
      net2: (incomeMap2.get(idx) || 0) - (expenseMap2.get(idx) || 0),
    })).filter(d => {
      const keys = Object.keys(d).filter(k => k !== 'month');
      return keys.some(k => (d as Record<string, unknown>)[k] !== 0);
    });
  }, [summary1.income, summary1.expenses, summary2.income, summary2.expenses, year1Label, year2Label]);

  const expensesByType1 = useMemo(() =>
    Object.entries(summary1.expensesByType).map(([name, value]) => ({ name, value })),
    [summary1.expensesByType]);

  const expensesByType2 = useMemo(() =>
    Object.entries(summary2.expensesByType).map(([name, value]) => ({ name, value })),
    [summary2.expensesByType]);

  const yearTotals = useMemo(() => ({
    year1: { income: summary1.totalIncome, expenses: summary1.totalExpenses, net: summary1.totalIncome - summary1.totalExpenses },
    year2: { income: summary2.totalIncome, expenses: summary2.totalExpenses, net: summary2.totalIncome - summary2.totalExpenses },
  }), [summary1.totalIncome, summary1.totalExpenses, summary2.totalIncome, summary2.totalExpenses]);

  const incomeChange = yearTotals.year1.income > 0
    ? ((yearTotals.year2.income - yearTotals.year1.income) / yearTotals.year1.income * 100) : 0;
  const expenseChange = yearTotals.year1.expenses > 0
    ? ((yearTotals.year2.expenses - yearTotals.year1.expenses) / yearTotals.year1.expenses * 100) : 0;
  const netChange = yearTotals.year1.net !== 0
    ? ((yearTotals.year2.net - yearTotals.year1.net) / Math.abs(yearTotals.year1.net) * 100) : 0;

  const handleExportPDF = async () => {
    const incomeMap1 = buildMonthlyMap(summary1.income);
    const expenseMap1 = buildMonthlyMap(summary1.expenses);
    const incomeMap2 = buildMonthlyMap(summary2.income);
    const expenseMap2 = buildMonthlyMap(summary2.expenses);

    const monthlyPdfData = MONTH_NAMES.map((name, idx) => ({
      month: name,
      income1: incomeMap1.get(idx) || 0, expenses1: expenseMap1.get(idx) || 0,
      net1: (incomeMap1.get(idx) || 0) - (expenseMap1.get(idx) || 0),
      income2: incomeMap2.get(idx) || 0, expenses2: expenseMap2.get(idx) || 0,
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

  const renderChangeCard = (label: string, change: number, val1: number, val2: number, invertColor = false) => {
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

  return (
    <div className="space-y-6">
      {/* اختيار السنوات */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 flex-1 w-full">
              <span className="text-sm font-medium whitespace-nowrap">السنة الأولى:</span>
              <Select value={year1Id} onValueChange={setYear1Id}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                <SelectContent>
                  {fiscalYears.map(fy => (
                    <SelectItem key={fy.id} value={fy.id} disabled={fy.id === year2Id}>{fy.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowUpDown className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 flex-1 w-full">
              <span className="text-sm font-medium whitespace-nowrap">السنة الثانية:</span>
              <Select value={year2Id} onValueChange={setYear2Id}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                <SelectContent>
                  {fiscalYears.map(fy => (
                    <SelectItem key={fy.id} value={fy.id} disabled={fy.id === year1Id}>{fy.label}</SelectItem>
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

      {/* بطاقات التغير */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {renderChangeCard('التغير في الدخل', incomeChange, yearTotals.year1.income, yearTotals.year2.income)}
        {renderChangeCard('التغير في المصروفات', expenseChange, yearTotals.year1.expenses, yearTotals.year2.expenses, true)}
        {renderChangeCard('التغير في الصافي', netChange, yearTotals.year1.net, yearTotals.year2.net)}
      </div>

      {/* الرسوم البيانية */}
      <Suspense fallback={null}>
        <YoYChartsSection
          comparisonData={comparisonData}
          year1Label={year1Label}
          year2Label={year2Label}
          expensesByType1={expensesByType1}
          expensesByType2={expensesByType2}
        />
      </Suspense>

      {/* جدول المقارنة */}
      <YoYComparisonTable
        comparisonData={comparisonData}
        year1Label={year1Label}
        year2Label={year2Label}
        yearTotals={yearTotals}
      />
    </div>
  );
};

export default YearOverYearComparison;
