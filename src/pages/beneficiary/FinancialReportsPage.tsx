import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, RefreshCw } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { BarChart3 } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import { useTotalBeneficiaryPercentage } from '@/hooks/useTotalBeneficiaryPercentage';

const COLORS = [
  'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--info))',
  'hsl(var(--warning))', 'hsl(var(--chart-4))', 'hsl(var(--primary))',
];

const formatArabicMonth = (month: string) => {
  const arabicMonths: Record<string, string> = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
  };
  const parts = month.split('-');
  return arabicMonths[parts[1]] || month;
};

const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };

const FinancialReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { user } = useAuth();

  const { fiscalYearId, fiscalYear: selectedFY, noPublishedYears } = useFiscalYear();

  const {
    income,
    beneficiaries,
    currentAccount,
    totalIncome,
    totalExpenses,
    netAfterZakat,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    availableAmount,
    zakatAmount,
    incomeBySource,
    expensesByTypeExcludingVat,
    isLoading,
    isError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { data: totalBenPct = 0 } = useTotalBeneficiaryPercentage();
  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);
  const beneficiariesShare = availableAmount;
  const myShare = currentBeneficiary && totalBenPct > 0
    ? beneficiariesShare * currentBeneficiary.share_percentage / totalBenPct
    : 0;

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
          name: currentBeneficiary.name,
          percentage: Number(currentBeneficiary.share_percentage),
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display">التقارير المالية</h1>
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
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
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
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
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
                  <Pie data={distributionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
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
                  <Pie data={incomePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                    {incomePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
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
                  <Pie data={expensesPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                    {expensesPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
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
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(value: number) => Math.round(value).toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} labelFormatter={formatArabicMonth} />
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
