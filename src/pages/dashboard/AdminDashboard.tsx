import { lazy, Suspense, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet, UserCheck, Crown, Printer, Gauge, CheckCircle, AlertTriangle, Link as LinkIcon, ArrowUpDown, Clock, DollarSign } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Link } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import DashboardLayout from '@/components/DashboardLayout';
import { useAllUnits } from '@/hooks/useUnits';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

import { Progress } from '@/components/ui/progress';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatsGridSkeleton, KpiSkeleton } from '@/components/SkeletonLoaders';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
import { useFiscalYears } from '@/hooks/useFiscalYears';
import { Badge } from '@/components/ui/badge';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-load heavy below-the-fold components
const YearOverYearComparison = lazy(() => import('@/components/reports/YearOverYearComparison'));
const DashboardCharts = lazy(() => import('@/components/dashboard/DashboardCharts'));
const CollectionSummaryChart = lazy(() => import('@/components/dashboard/CollectionSummaryChart'));

const ChartSkeleton = () => (
  <div className="h-[300px] flex items-center justify-center">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);


const AdminDashboard = () => {
  const { role } = useAuth();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const { data: allFiscalYears = [] } = useFiscalYears();
  const waqfInfo = usePdfWaqfInfo();

  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  // G4 fix: عند fiscalYearId='all' نستخدم contracts مباشرة بدل طلب مكرر
  const { data: allContractsRaw = [] } = useContractsByFiscalYear(fiscalYearId === 'all' ? '__skip__' : 'all');
  const allContracts = fiscalYearId === 'all' ? contracts : allContractsRaw;
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  // G3 fix: استخدام payment_invoices بدلاً من tenantPayments القديم
  const { data: paymentInvoices = [], isLoading: paymentsLoading } = usePaymentInvoices(fiscalYearId || 'all');

  // Detect orphaned contracts (no fiscal year assigned)
  const orphanedContracts = useMemo(() => allContracts.filter(c => !c.fiscal_year_id), [allContracts]);

  // BUG-05 fix: useFinancialSummary moved below to include finLoading in isLoading

  const {
    income, expenses, beneficiaries,
    totalIncome, totalExpenses,
    adminShare, waqifShare, waqfRevenue,
    usingFallbackPct,
    isLoading: finLoading,
  } = useFinancialSummary(fiscalYearId, fiscalYear?.label, {
    fiscalYearStatus: fiscalYear?.status,
  });

  const isLoading = propsLoading || contractsLoading || unitsLoading || paymentsLoading || finLoading;

  // Income/expenses are already filtered by fiscal year via the hook — aliases removed (G9)
  // Contracts are already filtered server-side by useContractsByFiscalYear
  const fyContracts = contracts;

  const activeContractsCount = fyContracts.filter(c => c.status === 'active').length;
  const contractualRevenue = fyContracts.filter(c => c.status === 'active').reduce((sum, c) => sum + Number(c.rent_amount), 0);

  // G3 fix: Collection summary based on payment_invoices instead of tenantPayments
  const collectionSummary = useMemo(() => {
    const relevantContracts = fyContracts.filter(c => c.status === 'active' || c.status === 'expired');
    let onTime = 0;
    let late = 0;

    relevantContracts.forEach(contract => {
      const contractInvoices = paymentInvoices.filter(inv => inv.contract_id === contract.id);
      if (contractInvoices.length === 0) return; // no invoices generated yet

      const dueInvoices = contractInvoices.filter(inv => new Date(inv.due_date) <= new Date());
      if (dueInvoices.length === 0) return; // no payments due yet

      const unpaidDue = dueInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue');
      if (unpaidDue.length > 0) {
        late++;
      } else {
        onTime++;
      }
    });

    const total = onTime + late;
    const percentage = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return { onTime, late, total, percentage };
  }, [fyContracts, paymentInvoices]);

  const isYearActive = fiscalYear?.status === 'active';
  const sharesNote = isYearActive ? ' (بعد الإقفال)' : '';

  const stats = useMemo(() => [
    { title: 'إجمالي العقارات', value: properties.length, icon: Building2, color: 'bg-primary', link: '/dashboard/properties' },
    { title: 'العقود النشطة', value: activeContractsCount, icon: FileText, color: 'bg-secondary', link: '/dashboard/contracts' },
    { title: 'الإيرادات التعاقدية', value: `${contractualRevenue.toLocaleString()} ر.س`, icon: TrendingUp, color: 'bg-success', link: '/dashboard/contracts' },
    { title: 'إجمالي الدخل الفعلي', value: `${totalIncome.toLocaleString()} ر.س`, icon: DollarSign, color: 'bg-primary', link: '/dashboard/income' },
    { title: 'إجمالي المصروفات', value: `${totalExpenses.toLocaleString()} ر.س`, icon: TrendingDown, color: 'bg-destructive', link: '/dashboard/expenses' },
    { title: `حصة الناظر${sharesNote}`, value: isYearActive ? 'تُحسب عند الإقفال' : `${adminShare.toLocaleString()} ر.س`, icon: UserCheck, color: 'bg-accent', link: '/dashboard/accounts' },
    { title: `حصة الواقف${sharesNote}`, value: isYearActive ? 'تُحسب عند الإقفال' : `${waqifShare.toLocaleString()} ر.س`, icon: Crown, color: 'bg-secondary', link: '/dashboard/accounts' },
    { title: `ريع الوقف للمستفيدين${sharesNote}`, value: isYearActive ? 'تُحسب عند الإقفال' : `${waqfRevenue.toLocaleString()} ر.س`, icon: Wallet, color: 'bg-primary', link: '/dashboard/beneficiaries' },
    { title: 'عدد المستفيدين', value: beneficiaries.length, icon: Users, color: 'bg-muted', link: '/dashboard/beneficiaries' },
  ], [properties.length, activeContractsCount, contractualRevenue, totalIncome, totalExpenses, adminShare, waqifShare, waqfRevenue, beneficiaries.length, isYearActive, sharesNote]);

  // Aggregate real monthly income/expense data (filtered by fiscal year)
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    income.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) {
        if (!months[month]) months[month] = { income: 0, expenses: 0 };
        months[month].income += Number(item.amount);
      }
    });
    expenses.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) {
        if (!months[month]) months[month] = { income: 0, expenses: 0 };
        months[month].expenses += Number(item.amount);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
      }));
  }, [income, expenses]);

  // Aggregate real expense distribution (filtered by fiscal year)
  const expenseTypes = useMemo(() => {
    const types: Record<string, number> = {};
    expenses.forEach(item => {
      const type = item.expense_type || 'أخرى';
      types[type] = (types[type] || 0) + Number(item.amount);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // COLORS moved to module level for stable reference

  // formatArabicMonth moved to module level (PERF-01)

  // tooltipStyle moved to module level (PERF — BUG-02 fix)

  const kpis = useMemo(() => {
    // Use invoice-based collection rate for accuracy (matches CollectionReport)
    const collectionRate = collectionSummary.percentage;
    const rentedUnits = allUnits.filter(u => u.status === 'مؤجرة').length;
    const totalUnitsCount = allUnits.length;
    const occupancyRate = totalUnitsCount > 0 ? Math.round((rentedUnits / totalUnitsCount) * 100) : 0;
    const avgRent = activeContractsCount > 0 ? Math.round(contractualRevenue / activeContractsCount) : 0;
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

    return [
      { label: 'نسبة التحصيل', value: collectionRate, suffix: '%', color: collectionRate >= 80 ? 'text-success' : collectionRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: collectionRate >= 80 ? '[&>div]:bg-success' : collectionRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: 'معدل الإشغال', value: occupancyRate, suffix: '%', color: occupancyRate >= 80 ? 'text-success' : occupancyRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: occupancyRate >= 80 ? '[&>div]:bg-success' : occupancyRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: 'متوسط الإيجار', value: avgRent, suffix: ' ر.س', color: 'text-primary', progressColor: '' },
      { label: 'نسبة المصروفات', value: expenseRatio, suffix: '%', color: expenseRatio <= 20 ? 'text-success' : expenseRatio <= 40 ? 'text-warning' : 'text-destructive', progressColor: expenseRatio <= 20 ? '[&>div]:bg-success' : expenseRatio <= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
    ];
  }, [collectionSummary, totalIncome, totalExpenses, allUnits, activeContractsCount, contractualRevenue]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <PageHeaderCard
          title="لوحة التحكم"
          icon={Gauge}
          description={
            (role === 'accountant' ? 'مرحباً بك، المحاسب — يمكنك إدارة الحسابات والعمليات المالية' : 'مرحباً بك، ناظر الوقف') +
            (fiscalYear ? ` — ${fiscalYear.label}` : '')
          }
          actions={
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          }
        />

        {/* Fallback Percentages Warning */}
        {usingFallbackPct && (
          <Alert className="animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>نسب افتراضية مُستخدمة</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span>يتم استخدام النسب الافتراضية (ناظر 10%، واقف 5%) لأنه لم يتم إعدادها في الحسابات الختامية.</span>
              <Link to="/dashboard/accounts">
                <Button variant="outline" size="sm" className="shrink-0">ضبط النسب</Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Expiring Contracts Warning (within 30 days) */}
        {(() => {
          const expiringContracts = fyContracts.filter(c => {
            const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / 86_400_000;
            return c.status === 'active' && daysLeft >= 0 && daysLeft <= 30;
          });
          return expiringContracts.length > 0 ? (
            <Alert className="animate-fade-in border-warning/50">
              <Clock className="h-4 w-4" />
              <AlertTitle>عقود تنتهي قريباً</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span>{expiringContracts.length} عقد ينتهي خلال 30 يوماً ({expiringContracts.map(c => c.contract_number).join('، ')})</span>
                <Link to="/dashboard/contracts">
                  <Button variant="outline" size="sm" className="shrink-0">إدارة العقود</Button>
                </Link>
              </AlertDescription>
            </Alert>
          ) : null;
        })()}

        {/* Orphaned Contracts Warning */}
        {orphanedContracts.length > 0 && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>عقود بدون سنة مالية</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span>يوجد {orphanedContracts.length} عقد غير مربوط بسنة مالية ({orphanedContracts.map(c => c.contract_number).join('، ')}). لن تظهر في التقارير المالية.</span>
              <Link to="/dashboard/contracts">
                <Button variant="outline" size="sm" className="gap-1 shrink-0">
                  <LinkIcon className="w-3 h-3" />
                  إدارة العقود
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        {isLoading ? <StatsGridSkeleton /> : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <Link key={index} to={stat.link} className="block">
              <Card className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
                      <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{stat.value}</p>
                    </div>
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`}>
                      <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        )}

        {/* KPI Panel */}
        {isLoading ? <KpiSkeleton /> : (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                مؤشرات الأداء الرئيسية (KPI)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                {kpis.map((kpi, idx) => (
                  <div key={idx} className="text-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-lg bg-muted/30">
                    <p className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</p>
                    <p className={`text-xl sm:text-3xl font-bold ${kpi.color}`}>
                      {kpi.value.toLocaleString()}{kpi.suffix}
                    </p>
                    {kpi.progressColor && (
                      <Progress value={Math.min(kpi.value, 100)} className={`h-2 ${kpi.progressColor}`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Accountant */}
        {role === 'accountant' && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link to="/dashboard/income">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                    <TrendingUp className="w-5 h-5 text-success" />
                    <span className="text-xs">تسجيل دخل</span>
                  </Button>
                </Link>
                <Link to="/dashboard/expenses">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                    <TrendingDown className="w-5 h-5 text-destructive" />
                    <span className="text-xs">تسجيل مصروف</span>
                  </Button>
                </Link>
                <Link to="/dashboard/accounts">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-xs">الحسابات الختامية</span>
                  </Button>
                </Link>
                <Link to="/dashboard/invoices">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                    <FileText className="w-5 h-5 text-secondary" />
                    <span className="text-xs">إدارة الفواتير</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collection Summary Card */}
        {collectionSummary.total > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                ملخص التحصيل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Mini Pie Chart */}
                <Suspense fallback={<div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center"><Skeleton className="w-[140px] h-[140px] rounded-full" /></div>}>
                  <CollectionSummaryChart onTime={collectionSummary.onTime} late={collectionSummary.late} />
                </Suspense>

                {/* Summary Stats */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  <div className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="text-sm text-muted-foreground">منتظم</span>
                    </div>
                    <p className="text-3xl font-bold text-success">{collectionSummary.onTime}</p>
                    <Badge className="bg-success/20 text-success border-success/30 hover:bg-success/30">عقد</Badge>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <span className="text-sm text-muted-foreground">متأخر</span>
                    </div>
                    <p className="text-3xl font-bold text-destructive">{collectionSummary.late}</p>
                    <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">عقد</Badge>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
                    <span className="text-sm text-muted-foreground">نسبة الانتظام</span>
                    <p className={`text-3xl font-bold ${collectionSummary.percentage >= 80 ? 'text-success' : collectionSummary.percentage >= 50 ? 'text-warning' : 'text-destructive'}`}>
                      {collectionSummary.percentage}%
                    </p>
                    <Progress
                      value={collectionSummary.percentage}
                      className={`h-2 ${collectionSummary.percentage >= 80 ? '[&>div]:bg-success' : collectionSummary.percentage >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts — lazy-loaded (recharts bundle) */}
        <Suspense fallback={<ChartSkeleton />}>
          <DashboardCharts monthlyData={monthlyData} expenseTypes={expenseTypes} />
        </Suspense>

        {/* Year-over-Year Comparison — lazy-loaded */}
        {allFiscalYears.length >= 2 && (
          <Suspense fallback={<ChartSkeleton />}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5" />
                  مقارنة بين السنوات المالية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YearOverYearComparison
                  fiscalYears={allFiscalYears}
                  currentFiscalYearId={fiscalYearId === 'all' ? (allFiscalYears[0]?.id || '') : fiscalYearId}
                  waqfInfo={waqfInfo}
                />
              </CardContent>
            </Card>
          </Suspense>
        )}

        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>آخر العقود</CardTitle>
            <Link to="/dashboard/contracts">
              <Button variant="ghost" size="sm">عرض الكل</Button>
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">رقم العقد</TableHead>
                  <TableHead className="text-right">المستأجر</TableHead>
                  <TableHead className="text-right">قيمة الإيجار</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...fyContracts].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).slice(0, 5).map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>{contract.contract_number}</TableCell>
                    <TableCell>{contract.tenant_name}</TableCell>
                    <TableCell>{Number(contract.rent_amount).toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        contract.status === 'active' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-destructive/20 text-destructive'
                      }`}>
                        {contract.status === 'active' ? 'نشط' : 'منتهي'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {fyContracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      لا توجد عقود حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
