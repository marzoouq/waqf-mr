/**
 * صفحة المقارنة التاريخية — مقارنة 2-4 سنوات مالية جنباً إلى جنب
 */
import { lazy, Suspense } from 'react';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtSAR } from '@/utils/format';
import { GitCompareArrows, TrendingUp, TrendingDown, Minus, FileDown, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useHistoricalComparison } from '@/hooks/page/admin/useHistoricalComparison';

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

function HistoricalComparisonPage() {
  const isMobile = useIsMobile();
  const {
    fiscalYears, fyLoading, selectedIds, selectedYears,
    yearData, isAnyLoading, toggleYear,
    chartData, comparisonRows, handleExportPdf,
  } = useHistoricalComparison();

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
                    <Button key={fy.id} variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => toggleYear(fy.id)} className="gap-1">
                      {fy.label}
                      {fy.status === 'closed' && <Badge variant="secondary" className="text-[11px] px-1">مقفلة</Badge>}
                      {fy.status === 'active' && <Badge variant="default" className="text-[11px] px-1">نشطة</Badge>}
                    </Button>
                  );
                })}
              </div>
            )}
            {selectedYears.length < 2 && !fyLoading && fiscalYears.length < 2 && (
              <div className="text-center py-6 space-y-2">
                <GitCompareArrows className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">لا توجد سنوات مالية كافية للمقارنة. يجب وجود سنتين مالية على الأقل.</p>
              </div>
            )}
            {selectedYears.length < 2 && !fyLoading && fiscalYears.length >= 2 && (
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
                    {isMobile ? (
                      <div className="space-y-3 p-3">
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
                                    <ChangeIndicator current={values[values.length - 1] ?? 0} previous={values[values.length - 2] ?? 0} />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
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
                                    <TableCell key={i} className="text-center font-mono">{fmtSAR(v)}</TableCell>
                                  ))}
                                  {values.length >= 2 && (
                                    <TableCell className="text-center">
                                      <ChangeIndicator current={values[values.length - 1] ?? 0} previous={values[values.length - 2] ?? 0} />
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
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
