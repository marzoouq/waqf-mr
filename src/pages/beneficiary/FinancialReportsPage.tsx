import { useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeaderCard from '@/components/PageHeaderCard';
import { BarChart3 } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import { useMyShare } from '@/hooks/useMyShare';
import { fmt } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const LazyFinancialCharts = lazy(() => import('@/components/financial/FinancialChartsInner'));

const FinancialReportsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };
  const pdfWaqfInfo = usePdfWaqfInfo();
  

  const { fiscalYearId, fiscalYear: selectedFY, noPublishedYears } = useFiscalYear();

  const {
    income,
    beneficiaries,
    currentAccount,
    isAccountMissing,
    totalIncome,
    totalExpenses,
    netAfterZakat,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual: _wcm,
    availableAmount,
    zakatAmount: _za,
    incomeBySource,
    expensesByTypeExcludingVat,
    isLoading,
    isError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { currentBeneficiary, myShare } = useMyShare({ beneficiaries, availableAmount });
  const beneficiariesShare = availableAmount;

  const incomeVsExpenses = useMemo(() => [
    { name: 'الإيرادات', value: totalIncome, fill: 'hsl(var(--success))' },
    { name: 'المصروفات', value: totalExpenses, fill: 'hsl(var(--destructive))' },
  ], [totalIncome, totalExpenses]);

  const expensesPieData = useMemo(() => Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value })), [expensesByTypeExcludingVat]);
  const incomePieData = useMemo(() => Object.entries(incomeBySource).map(([name, value]) => ({ name, value })), [incomeBySource]);

  const distributionData = useMemo(() => [
    { name: 'حصتي', value: myShare, fill: 'hsl(var(--primary))' },
    { name: 'باقي المستفيدين', value: Math.max(0, beneficiariesShare - myShare), fill: 'hsl(var(--info))' },
  ], [myShare, beneficiariesShare]);

  const fiscalYear = currentAccount?.fiscal_year || selectedFY?.label || '';

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    income.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) {
        months[month] = (months[month] || 0) + Number(item.amount);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, income: total }));
  }, [income]);

  const handleDownloadPDF = async () => {
    try {
      const { generateAnnualReportPDF } = await import('@/utils/pdf');
      await generateAnnualReportPDF({
        fiscalYear,
        totalIncome,
        totalExpenses,
        netRevenue: netAfterZakat,
        adminShare,
        waqifShare,
        waqfRevenue,
        expensesByType: Object.entries(expensesByTypeExcludingVat).map(([type, amount]) => ({ type, amount })),
        incomeBySource: Object.entries(incomeBySource).map(([source, amount]) => ({ source, amount })),
        beneficiaries: currentBeneficiary ? [{
          name: currentBeneficiary.name ?? 'غير معروف',
          percentage: Number(currentBeneficiary.share_percentage ?? 0),
          amount: myShare,
        }] : [],
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title="التقارير المالية" icon={BarChart3} />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isAccountMissing) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">لم يتم العثور على الحساب الختامي</h2>
          <p className="text-muted-foreground text-center max-w-md">
            لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <PageHeaderCard title="التقارير المالية" icon={BarChart3} description="عرض وتحليل البيانات المالية للوقف" actions={
          <ExportMenu onExportPdf={handleDownloadPDF} />
        } />

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
          التحليل البياني للبيانات المالية — للأرقام التفصيلية راجع{' '}
          <Link to="/beneficiary/disclosure" className="text-sm text-primary hover:underline px-1">
            صفحة الإفصاح السنوي
          </Link>
        </p>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">مقارنة الإيرادات والمصروفات</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={incomeVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                   <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                  <Tooltip formatter={(value: number | undefined) => fmt(value ?? 0) + ' ر.س'} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {incomeVsExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">حصتي من الريع</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {distributionData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => fmt(value ?? 0) + ' ر.س'} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RePieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">الإيرادات حسب المصدر</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {incomePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={incomePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                    {incomePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => fmt(value ?? 0) + ' ر.س'} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RePieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">المصروفات حسب النوع</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {expensesPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={expensesPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                    {expensesPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => fmt(value ?? 0) + ' ر.س'} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RePieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">الإيرادات الشهرية</CardTitle>
          </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={formatArabicMonth} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                  <Tooltip formatter={(value: number | undefined) => fmt(Math.round(value ?? 0)) + ' ر.س'} contentStyle={tooltipStyle} labelFormatter={formatArabicMonth} />
                  <Bar dataKey="income" fill="hsl(var(--success))" name="الإيرادات" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد بيانات شهرية</div>
              )}
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FinancialReportsPage;
