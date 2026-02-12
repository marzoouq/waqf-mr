import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { BarChart3, PieChart, TrendingUp, Building, AlertCircle, RefreshCw } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { generateAnnualReportPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveFiscalYear } from '@/hooks/useFiscalYears';
import FiscalYearSelector from '@/components/FiscalYearSelector';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
const VAT_DESCRIPTION = 'ضريبة القيمة المضافة المحصلة من الهيئة';

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
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fiscal year selection
  const { data: activeFY, fiscalYears } = useActiveFiscalYear();
  const [selectedFYId, setSelectedFYId] = useState<string>('');
  const fiscalYearId = selectedFYId || activeFY?.id || 'all';
  const selectedFY = fiscalYears.find(fy => fy.id === fiscalYearId);

  const { data: beneficiaries = [], isLoading: beneficiariesLoading, error: beneficiariesError } = useBeneficiaries();
  const { data: income = [], isLoading: incomeLoading } = useIncomeByFiscalYear(fiscalYearId);
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useAccounts();

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  // Find account matching the fiscal year label — NO fallback to accounts[0]
  const currentAccount = selectedFY
    ? accounts.find(a => a.fiscal_year === selectedFY.label) || null
    : null;

  const totalIncome = Number(currentAccount?.total_income || 0);
  const totalExpenses = Number(currentAccount?.total_expenses || 0);
  const netAfterVat = Number(currentAccount?.net_after_vat || 0);
  const adminShare = Number(currentAccount?.admin_share || 0);
  const waqifShare = Number(currentAccount?.waqif_share || 0);
  const waqfRevenue = Number(currentAccount?.waqf_revenue || 0);
  const waqfCorpusManual = Number(currentAccount?.waqf_corpus_manual || 0);
  const zakatAmount = Number(currentAccount?.zakat_amount || 0);
  const distributableAmount = waqfRevenue - waqfCorpusManual;
  const beneficiariesShare = distributableAmount;

  const myShare = currentBeneficiary 
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100 
    : 0;

  const isPageLoading = beneficiariesLoading || incomeLoading || expensesLoading || accountsLoading;
  const pageError = beneficiariesError || accountsError;

  const incomeVsExpenses = [
    { name: 'الإيرادات', value: totalIncome, fill: '#22c55e' },
    { name: 'المصروفات', value: totalExpenses, fill: '#ef4444' },
  ];

  // Group expenses by type - exclude VAT
  const expensesByType = expenses
    .filter(item => item.description !== VAT_DESCRIPTION)
    .reduce((acc, item) => {
      const type = item.expense_type || 'أخرى';
      acc[type] = (acc[type] || 0) + Number(item.amount);
      return acc;
    }, {} as Record<string, number>);

  const expensesPieData = Object.entries(expensesByType).map(([name, value]) => ({ name, value }));

  const incomeBySource = income.reduce((acc, item) => {
    const source = item.source || 'أخرى';
    acc[source] = (acc[source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const incomePieData = Object.entries(incomeBySource).map(([name, value]) => ({ name, value }));

  const distributionData = [
    { name: 'المستفيدين', value: beneficiariesShare, fill: '#3b82f6' },
    { name: 'الناظر', value: adminShare, fill: '#f59e0b' },
    { name: 'الواقف', value: waqifShare, fill: '#8b5cf6' },
  ];

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
      await generateAnnualReportPDF({
        fiscalYear,
        totalIncome,
        totalExpenses,
        netRevenue: netAfterVat,
        adminShare,
        waqifShare,
        waqfRevenue: beneficiariesShare,
        expensesByType: Object.entries(expensesByType).map(([type, amount]) => ({ type, amount })),
        incomeBySource: Object.entries(incomeBySource).map(([source, amount]) => ({ source, amount })),
        beneficiaries: beneficiaries.map(b => ({
          name: b.name,
          percentage: Number(b.share_percentage),
          amount: (beneficiariesShare * Number(b.share_percentage)) / 100,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  if (isPageLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (pageError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <p className="text-muted-foreground text-center">{pageError.message}</p>
          <Button onClick={() => { queryClient.invalidateQueries({ queryKey: ['beneficiaries'] }); queryClient.invalidateQueries({ queryKey: ['accounts'] }); }} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold font-display">التقارير المالية</h1>
            <p className="text-muted-foreground mt-1">عرض وتحليل البيانات المالية للوقف</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu onExportPdf={handleDownloadPDF} />
          </div>
        </div>

        {/* Fiscal Year Selector */}
        <FiscalYearSelector value={fiscalYearId} onChange={setSelectedFYId} showAll={false} />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="text-xl font-bold text-success">{totalIncome.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-xl font-bold text-destructive">{totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الصافي بعد الضريبة</p>
                  <p className="text-xl font-bold text-primary">{netAfterVat.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/90">حصتي</p>
                  <p className="text-xl font-bold">{myShare.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الزكاة</p>
                  <p className="text-xl font-bold text-orange-600">{zakatAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقبة الوقف</p>
                  <p className="text-xl font-bold text-violet-600">{waqfCorpusManual.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>مقارنة الإيرادات والمصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
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
              <CardTitle>توزيع الريع</CardTitle>
            </CardHeader>
            <CardContent>
              {distributionData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={true}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: '12px' }}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>الإيرادات حسب المصدر</CardTitle>
            </CardHeader>
            <CardContent>
              {incomePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={incomePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={true}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: '12px' }}
                  >
                    {incomePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>المصروفات حسب النوع</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={expensesPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={true}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: '12px' }}
                  >
                    {expensesPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>الإيرادات الشهرية</CardTitle>
          </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={formatArabicMonth} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => Math.round(value).toLocaleString() + ' ر.س'} contentStyle={tooltipStyle} labelFormatter={formatArabicMonth} />
                  <Bar dataKey="income" fill="#22c55e" name="الإيرادات" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FinancialReportsPage;
