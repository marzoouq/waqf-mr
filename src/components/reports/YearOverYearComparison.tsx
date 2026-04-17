import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { generateYearComparisonPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { fmt } from '@/utils/format/format';
import { useYearComparisonData } from '@/hooks/data/financial/useYearComparisonData';
import { useFiscalYearSummaries } from '@/hooks/data/financial/useFiscalYearSummary';
const YoYChartsSection = lazy(() => import('@/components/reports/YoYChartsSection'));
const YoYSummaryCards = lazy(() => import('@/components/reports/YoYSummaryCards'));
import YoYComparisonTable from '@/components/reports/YoYComparisonTable';

interface YearOverYearComparisonProps {
  fiscalYears: FiscalYear[];
  currentFiscalYearId: string;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

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

  // استدعاء RPC واحد بدل 10 استعلامات
  const { year1Monthly, year2Monthly, totals, expensesByType } = useYearComparisonData(year1Id, year2Id);

  // ملخصات إضافية من العرض v_fiscal_year_summary (عدد السجلات + فوترة)
  const { data: viewSummaries, isLoading: summariesLoading } = useFiscalYearSummaries(
    year1Id && year2Id && year1Id !== year2Id ? [year1Id, year2Id] : []
  );
  const viewYear1 = viewSummaries?.find(s => s.fiscalYearId === year1Id);
  const viewYear2 = viewSummaries?.find(s => s.fiscalYearId === year2Id);

  const comparisonData = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => ({
      month: name,
      [`دخل ${year1Label}`]: year1Monthly.income.get(idx) || 0,
      [`دخل ${year2Label}`]: year2Monthly.income.get(idx) || 0,
      [`مصروفات ${year1Label}`]: year1Monthly.expenses.get(idx) || 0,
      [`مصروفات ${year2Label}`]: year2Monthly.expenses.get(idx) || 0,
      net1: (year1Monthly.income.get(idx) || 0) - (year1Monthly.expenses.get(idx) || 0),
      net2: (year2Monthly.income.get(idx) || 0) - (year2Monthly.expenses.get(idx) || 0),
    })).filter(d => {
      const keys = Object.keys(d).filter(k => k !== 'month');
      return keys.some(k => (d as Record<string, unknown>)[k] !== 0);
    });
  }, [year1Monthly, year2Monthly, year1Label, year2Label]);

  const expensesByType1 = useMemo(() =>
    Object.entries(expensesByType.year1).map(([name, value]) => ({ name, value })),
    [expensesByType.year1]);

  const expensesByType2 = useMemo(() =>
    Object.entries(expensesByType.year2).map(([name, value]) => ({ name, value })),
    [expensesByType.year2]);

  const yearTotals = useMemo(() => ({
    year1: { income: totals.year1.totalIncome, expenses: totals.year1.totalExpenses, net: totals.year1.totalIncome - totals.year1.totalExpenses },
    year2: { income: totals.year2.totalIncome, expenses: totals.year2.totalExpenses, net: totals.year2.totalIncome - totals.year2.totalExpenses },
  }), [totals]);

  const incomeChange = yearTotals.year1.income > 0
    ? ((yearTotals.year2.income - yearTotals.year1.income) / yearTotals.year1.income * 100) : 0;
  const expenseChange = yearTotals.year1.expenses > 0
    ? ((yearTotals.year2.expenses - yearTotals.year1.expenses) / yearTotals.year1.expenses * 100) : 0;
  const netChange = yearTotals.year1.net !== 0
    ? ((yearTotals.year2.net - yearTotals.year1.net) / Math.abs(yearTotals.year1.net) * 100) : 0;

  const handleExportPDF = async () => {
    const monthlyPdfData = MONTH_NAMES.map((name, idx) => ({
      month: name,
      income1: year1Monthly.income.get(idx) || 0, expenses1: year1Monthly.expenses.get(idx) || 0,
      net1: (year1Monthly.income.get(idx) || 0) - (year1Monthly.expenses.get(idx) || 0),
      income2: year2Monthly.income.get(idx) || 0, expenses2: year2Monthly.expenses.get(idx) || 0,
      net2: (year2Monthly.income.get(idx) || 0) - (year2Monthly.expenses.get(idx) || 0),
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

      {/* ملخصات إضافية من العرض */}
      <Suspense fallback={null}>
        <YoYSummaryCards
          year1={viewYear1}
          year2={viewYear2}
          year1Label={year1Label}
          year2Label={year2Label}
          isLoading={summariesLoading}
        />
      </Suspense>

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
