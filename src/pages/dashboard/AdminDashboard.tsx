import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear, useContracts } from '@/hooks/useContracts';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet, UserCheck, Crown, Printer, Gauge, CheckCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import DashboardLayout from '@/components/DashboardLayout';
import { useAllUnits } from '@/hooks/useUnits';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatsGridSkeleton, KpiSkeleton } from '@/components/SkeletonLoaders';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { Badge } from '@/components/ui/badge';
import { differenceInMonths } from 'date-fns';

const AdminDashboard = () => {
  const { role } = useAuth();
  const { fiscalYearId, fiscalYear } = useFiscalYear();

  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: allContracts = [] } = useContracts();
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: tenantPayments = [], isLoading: paymentsLoading } = useTenantPayments();

  // Detect orphaned contracts (no fiscal year assigned)
  const orphanedContracts = useMemo(() => allContracts.filter(c => !c.fiscal_year_id), [allContracts]);

  const {
    income, expenses, beneficiaries,
    totalIncome, totalExpenses,
    adminShare, waqifShare, waqfRevenue,
  } = useFinancialSummary(fiscalYearId, fiscalYear?.label);

  const isLoading = propsLoading || contractsLoading || unitsLoading || paymentsLoading;

  // Income/expenses are already filtered by fiscal year via the hook
  const filteredIncome = income;
  const filteredExpenses = expenses;
  // Contracts are already filtered server-side by useContractsByFiscalYear
  const fyContracts = contracts;

  const activeContractsCount = fyContracts.filter(c => c.status === 'active').length;
  const contractualRevenue = fyContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);

  // Collection summary: compute on-time vs late for active contracts
  const collectionSummary = useMemo(() => {
    const activeContracts = fyContracts.filter(c => c.status === 'active');
    let onTime = 0;
    let late = 0;

    activeContracts.forEach(contract => {
      const startDate = new Date(contract.start_date);
      const now = new Date();
      const paymentType = contract.payment_type || 'annual';

      let expectedPayments = 0;
      if (paymentType === 'monthly') {
        expectedPayments = Math.max(0, differenceInMonths(now, startDate));
      } else if (paymentType === 'quarterly') {
        expectedPayments = Math.max(0, Math.floor(differenceInMonths(now, startDate) / 3));
      } else if (paymentType === 'semi_annual') {
        expectedPayments = Math.max(0, Math.floor(differenceInMonths(now, startDate) / 6));
      } else {
        expectedPayments = Math.max(0, Math.floor(differenceInMonths(now, startDate) / 12));
      }

      const payment = tenantPayments.find(p => p.contract_id === contract.id);
      const paidMonths = payment?.paid_months ?? 0;

      if (paidMonths >= expectedPayments) {
        onTime++;
      } else {
        late++;
      }
    });

    const total = onTime + late;
    const percentage = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return { onTime, late, total, percentage };
  }, [fyContracts, tenantPayments]);

  const stats = [
    { title: 'إجمالي العقارات', value: properties.length, icon: Building2, color: 'bg-primary' },
    { title: 'العقود النشطة', value: activeContractsCount, icon: FileText, color: 'bg-secondary' },
    { title: 'الإيرادات التعاقدية', value: `${contractualRevenue.toLocaleString()} ر.س`, icon: TrendingUp, color: 'bg-success' },
    { title: 'إجمالي الدخل الفعلي', value: `${totalIncome.toLocaleString()} ر.س`, icon: TrendingUp, color: 'bg-success' },
    { title: 'إجمالي المصروفات', value: `${totalExpenses.toLocaleString()} ر.س`, icon: TrendingDown, color: 'bg-destructive' },
    { title: 'حصة الناظر', value: `${adminShare.toLocaleString()} ر.س`, icon: UserCheck, color: 'bg-accent' },
    { title: 'حصة الواقف', value: `${waqifShare.toLocaleString()} ر.س`, icon: Crown, color: 'bg-secondary' },
    { title: 'ريع الوقف للمستفيدين', value: `${waqfRevenue.toLocaleString()} ر.س`, icon: Wallet, color: 'bg-primary' },
    { title: 'عدد المستفيدين', value: beneficiaries.length, icon: Users, color: 'bg-muted' },
  ];

  // Aggregate real monthly income/expense data (filtered by fiscal year)
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    filteredIncome.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) {
        if (!months[month]) months[month] = { income: 0, expenses: 0 };
        months[month].income += Number(item.amount);
      }
    });
    filteredExpenses.forEach(item => {
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
  }, [filteredIncome, filteredExpenses]);

  // Aggregate real expense distribution (filtered by fiscal year)
  const expenseTypes = useMemo(() => {
    const types: Record<string, number> = {};
    filteredExpenses.forEach(item => {
      const type = item.expense_type || 'أخرى';
      types[type] = (types[type] || 0) + Number(item.amount);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const COLORS = ['#166534', '#ca8a04', '#0891b2', '#7c3aed', '#dc2626', '#059669', '#d97706', '#4f46e5'];

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

  const kpis = useMemo(() => {
    const collectionRate = contractualRevenue > 0 ? Math.round((totalIncome / contractualRevenue) * 100) : 0;
    const rentedUnits = allUnits.filter(u => u.status === 'مؤجرة').length;
    const totalUnitsCount = allUnits.length;
    const occupancyRate = totalUnitsCount > 0 ? Math.round((rentedUnits / totalUnitsCount) * 100) : (activeContractsCount > 0 ? 100 : 0);
    const avgRent = activeContractsCount > 0 ? Math.round(contractualRevenue / activeContractsCount) : 0;
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

    return [
      { label: 'نسبة التحصيل', value: collectionRate, suffix: '%', color: collectionRate >= 80 ? 'text-success' : collectionRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: collectionRate >= 80 ? '[&>div]:bg-success' : collectionRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: 'معدل الإشغال', value: occupancyRate, suffix: '%', color: occupancyRate >= 80 ? 'text-success' : occupancyRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: occupancyRate >= 80 ? '[&>div]:bg-success' : occupancyRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: 'متوسط الإيجار', value: avgRent, suffix: ' ر.س', color: 'text-primary', progressColor: '' },
      { label: 'نسبة المصروفات', value: expenseRatio, suffix: '%', color: expenseRatio <= 20 ? 'text-success' : expenseRatio <= 40 ? 'text-warning' : 'text-destructive', progressColor: expenseRatio <= 20 ? '[&>div]:bg-success' : expenseRatio <= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
    ];
  }, [contractualRevenue, totalIncome, totalExpenses, allUnits, activeContractsCount]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-foreground truncate">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {role === 'accountant' ? 'مرحباً بك، المحاسب — يمكنك إدارة الحسابات والعمليات المالية' : role === 'waqif' ? 'مرحباً بك، الواقف' : 'مرحباً بك، ناظر الوقف'}
              {fiscalYear && <span className="text-primary font-medium"> — {fiscalYear.label}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          </div>
        </div>

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
            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
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
                <div className="w-[180px] h-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'منتظم', value: collectionSummary.onTime },
                          { name: 'متأخر', value: collectionSummary.late },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill="hsl(142, 71%, 35%)" />
                        <Cell fill="hsl(0, 72%, 51%)" />
                      </Pie>
                      <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>الدخل والمصروفات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatArabicMonth} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} contentStyle={tooltipStyle} labelFormatter={formatArabicMonth} />
                    <Legend />
                    <Bar dataKey="income" fill="hsl(158, 64%, 25%)" name="الدخل" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(43, 74%, 49%)" name="المصروفات" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>

          {/* Expense Distribution */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>توزيع المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      style={{ fontSize: '12px' }}
                    >
                      {expenseTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>آخر العقود</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">رقم العقد</TableHead>
                  <TableHead className="text-right">المستأجر</TableHead>
                  <TableHead className="text-right">قيمة الإيجار</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fyContracts.slice(0, 5).map((contract) => (
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
