/**
 * صفحة المقارنة التاريخية — مقارنة 2-4 سنوات مالية جنباً إلى جنب
 */
import { useState, useMemo, lazy, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFiscalYears } from '@/hooks/useFiscalYears';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { fmt, fmtSAR } from '@/utils/format';
import { GitCompareArrows, TrendingUp, TrendingDown, Minus, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const LazyHistoricalChart = lazy(() => import('@/components/reports/HistoricalComparisonChartInner'));

/** مؤشر نسبة التغيير */
function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (previous === 0) return <TrendingUp className="w-4 h-4 text-success" />;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return <Minus className="w-4 h-4 text-muted-foreground" />;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${pct > 0 ? 'text-success' : 'text-destructive'}`}>
      {pct > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

/** Hook لجلب بيانات سنة واحدة */
function useYearData(fiscalYearId?: string, fiscalYearLabel?: string, status?: string) {
  return useFinancialSummary(fiscalYearId, fiscalYearLabel, {
    forceClosedMode: status === 'closed',
    fiscalYearStatus: status,
  });
}

function HistoricalComparisonPage() {
  const { data: fiscalYears = [], isLoading: fyLoading } = useFiscalYears();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const waqfInfo = usePdfWaqfInfo();

  // ترتيب السنوات من الأقدم للأحدث للمقارنة
  const selectedYears = useMemo(
    () => fiscalYears
      .filter(fy => selectedIds.includes(fy.id))
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [fiscalYears, selectedIds],
  );

  // جلب بيانات كل سنة مختارة (حتى 4)
  const y0 = useYearData(selectedYears[0]?.id, selectedYears[0]?.label, selectedYears[0]?.status);
  const y1 = useYearData(selectedYears[1]?.id, selectedYears[1]?.label, selectedYears[1]?.status);
  const y2 = useYearData(selectedYears[2]?.id, selectedYears[2]?.label, selectedYears[2]?.status);
  const y3 = useYearData(selectedYears[3]?.id, selectedYears[3]?.label, selectedYears[3]?.status);
  const yearData = [y0, y1, y2, y3].slice(0, selectedYears.length);

  const isAnyLoading = yearData.some(y => y.isLoading);

  // إضافة / إزالة سنة
  const toggleYear = (fyId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(fyId)) return prev.filter(id => id !== fyId);
      if (prev.length >= 4) {
        toast.warning('الحد الأقصى 4 سنوات للمقارنة');
        return prev;
      }
      return [...prev, fyId];
    });
  };

  // بيانات الرسم البياني
  const chartData = useMemo(() => {
    if (selectedYears.length < 2) return [];
    const metrics = [
      { key: 'income', label: 'الدخل' },
      { key: 'expenses', label: 'المصروفات' },
      { key: 'net', label: 'الصافي' },
    ];
    return metrics.map(m => {
      const row: Record<string, string | number> = { metric: m.label };
      selectedYears.forEach((fy, i) => {
        const d = yearData[i];
        if (m.key === 'income') row[fy.label] = d?.totalIncome ?? 0;
        else if (m.key === 'expenses') row[fy.label] = d?.totalExpenses ?? 0;
        else row[fy.label] = (d?.totalIncome ?? 0) - (d?.totalExpenses ?? 0);
      });
      return row;
    });
  }, [selectedYears, yearData]);

  // صفوف جدول المقارنة
  const comparisonRows = useMemo(() => {
    if (selectedYears.length < 2) return [];
    return [
      { label: 'إجمالي الدخل', key: 'totalIncome', getValue: (d: typeof y0) => d.totalIncome },
      { label: 'إجمالي المصروفات', key: 'totalExpenses', getValue: (d: typeof y0) => d.totalExpenses },
      { label: 'صافي بعد المصروفات', key: 'netAfterExpenses', getValue: (d: typeof y0) => d.netAfterExpenses ?? 0 },
      { label: 'الضريبة', key: 'vatAmount', getValue: (d: typeof y0) => d.vatAmount },
      { label: 'الزكاة', key: 'zakatAmount', getValue: (d: typeof y0) => d.zakatAmount },
      { label: 'حصة الناظر', key: 'adminShare', getValue: (d: typeof y0) => d.adminShare ?? 0 },
      { label: 'حصة الواقف', key: 'waqifShare', getValue: (d: typeof y0) => d.waqifShare ?? 0 },
      { label: 'ريع الوقف', key: 'waqfRevenue', getValue: (d: typeof y0) => d.waqfRevenue ?? 0 },
      { label: 'المتاح للتوزيع', key: 'availableAmount', getValue: (d: typeof y0) => d.availableAmount ?? 0 },
    ];
  }, [selectedYears.length]);

  // تصدير PDF
  const handleExportPdf = async () => {
    if (selectedYears.length < 2) return;
    try {
      const { generateYearComparisonPDF } = await import('@/utils/pdf/comparison');
      const d0 = yearData[0];
      const d1 = yearData[1];
      await generateYearComparisonPDF({
        year1Label: selectedYears[0].label,
        year2Label: selectedYears[1].label,
        year1: { income: d0.totalIncome, expenses: d0.totalExpenses, net: d0.totalIncome - d0.totalExpenses },
        year2: { income: d1.totalIncome, expenses: d1.totalExpenses, net: d1.totalIncome - d1.totalExpenses },
        incomeChange: d0.totalIncome ? ((d1.totalIncome - d0.totalIncome) / d0.totalIncome) * 100 : 0,
        expenseChange: d0.totalExpenses ? ((d1.totalExpenses - d0.totalExpenses) / d0.totalExpenses) * 100 : 0,
        netChange: (d0.totalIncome - d0.totalExpenses) ? (((d1.totalIncome - d1.totalExpenses) - (d0.totalIncome - d0.totalExpenses)) / Math.abs(d0.totalIncome - d0.totalExpenses)) * 100 : 0,
        expensesByType1: Object.entries(d0.expensesByType).map(([name, value]) => ({ name, value })),
        expensesByType2: Object.entries(d1.expensesByType).map(([name, value]) => ({ name, value })),
        monthlyData: [],
      }, waqfInfo ?? undefined);
      toast.success('تم تصدير PDF بنجاح');
    } catch {
      toast.error('فشل تصدير PDF');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="المقارنة التاريخية"
          icon={GitCompareArrows}
          description="قارن بيانات 2-4 سنوات مالية جنباً إلى جنب"
          actions={
            selectedYears.length >= 2 ? (
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={isAnyLoading || selectedYears.length > 2}
                title={selectedYears.length > 2 ? 'تصدير PDF متاح فقط عند مقارنة سنتين' : undefined}
              >
                <FileDown className="w-4 h-4 ml-2" />
                {selectedYears.length > 2 ? 'PDF (سنتان فقط)' : 'تصدير PDF'}
              </Button>
            ) : undefined
          }
        />

        {/* منتقي السنوات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اختر السنوات للمقارنة (2-4)</CardTitle>
          </CardHeader>
          <CardContent>
            {fyLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fiscalYears.map(fy => {
                  const isSelected = selectedIds.includes(fy.id);
                  return (
                    <Button
                      key={fy.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleYear(fy.id)}
                      className="gap-1"
                    >
                      {fy.label}
                      {fy.status === 'closed' && <Badge variant="secondary" className="text-[11px] px-1">مقفلة</Badge>}
                      {fy.status === 'active' && <Badge variant="default" className="text-[11px] px-1">نشطة</Badge>}
                    </Button>
                  );
                })}
              </div>
            )}
            {selectedYears.length < 2 && !fyLoading && (
              <p className="text-sm text-muted-foreground mt-3">اختر سنتين على الأقل لبدء المقارنة</p>
            )}
          </CardContent>
        </Card>

        {/* المحتوى — يظهر فقط عند اختيار سنتين أو أكثر */}
        {selectedYears.length >= 2 && (
          <>
            {isAnyLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* جدول المقارنة */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">جدول المقارنة</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Mobile Cards */}
                    <div className="space-y-3 p-3 md:hidden">
                      {comparisonRows.map(row => {
                        const values = yearData.map(d => row.getValue(d));
                        return (
                          <Card key={row.key} className="shadow-sm">
                            <CardContent className="p-3 space-y-2">
                              <p className="font-bold text-sm">{row.label}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {selectedYears.map((fy, i) => (
                                  <div key={fy.id}>
                                    <p className="text-[11px] text-muted-foreground">{fy.label}</p>
                                    <p className="text-sm font-medium font-mono">{fmtSAR(values[i])}</p>
                                  </div>
                                ))}
                              </div>
                              {values.length >= 2 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>التغير:</span>
                                  <ChangeIndicator current={values[values.length - 1]} previous={values[values.length - 2]} />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    {/* Desktop Table */}
                    <div className="overflow-x-auto hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">المؤشر</TableHead>
                            {selectedYears.map((fy, i) => (
                            <TableHead key={fy.id} className="text-center" style={{ color: ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'][i] }}>
                                {fy.label}
                              </TableHead>
                            ))}
                            {selectedYears.length >= 2 && <TableHead className="text-center">التغير</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonRows.map(row => {
                            const values = yearData.map(d => row.getValue(d));
                            return (
                              <TableRow key={row.key}>
                                <TableCell className="font-medium">{row.label}</TableCell>
                                {values.map((v, i) => (
                                  <TableCell key={i} className="text-center font-mono">
                                    {fmtSAR(v)}
                                  </TableCell>
                                ))}
                                {values.length >= 2 && (
                                  <TableCell className="text-center">
                                    <ChangeIndicator
                                      current={values[values.length - 1]}
                                      previous={values[values.length - 2]}
                                    />
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* الرسم البياني */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">المقارنة البيانية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<Skeleton className="h-[280px] w-full rounded-lg" />}>
                      <LazyHistoricalChart chartData={chartData} yearLabels={selectedYears.map(fy => fy.label)} />
                    </Suspense>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default HistoricalComparisonPage;
