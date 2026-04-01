/**
 * مقارنة السنوات المالية — يستخدم مكونات وhooks مستخرجة.
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, FileDown } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { FiscalYear } from '@/hooks/financial/useFiscalYears';

import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { useYearComparisonData, buildMonthlyMap } from '@/hooks/reports/useYearComparisonData';
import YoYChangeCards from './YoYChangeCards';
import YoYComparisonTable from './YoYComparisonTable';

const YoYChartsSection = lazy(() => import('@/components/reports/YoYChartsSection'));

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

interface YearOverYearComparisonProps {
  fiscalYears: FiscalYear[];
  currentFiscalYearId: string;
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

  const { comparisonData, expensesByType1, expensesByType2, yearTotals, incomeChange, expenseChange, netChange } =
    useYearComparisonData(summary1, summary2, year1Label, year2Label);

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

      <YoYChangeCards
        year1Label={year1Label}
        year2Label={year2Label}
        incomeChange={incomeChange}
        expenseChange={expenseChange}
        netChange={netChange}
        yearTotals={yearTotals}
      />

      <Suspense fallback={null}>
        <YoYChartsSection
          comparisonData={comparisonData}
          year1Label={year1Label}
          year2Label={year2Label}
          expensesByType1={expensesByType1}
          expensesByType2={expensesByType2}
        />
      </Suspense>

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
