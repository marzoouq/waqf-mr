import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { BarChart3, Download, PieChart, TrendingUp, Building } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { generateBeneficiaryStatementPDF } from '@/utils/pdfGenerator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const FinancialReportsPage = () => {
  const { user } = useAuth();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: accounts = [] } = useAccounts();

  // Find current user's beneficiary record
  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netRevenue = totalIncome - totalExpenses;
  const adminShare = netRevenue * 0.10;
  const waqifShare = netRevenue * 0.05;
  const beneficiariesShare = netRevenue - adminShare - waqifShare;

  const myShare = currentBeneficiary 
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100 
    : 0;

  // Prepare data for charts
  const incomeVsExpenses = [
    { name: 'الإيرادات', value: totalIncome, fill: '#22c55e' },
    { name: 'المصروفات', value: totalExpenses, fill: '#ef4444' },
  ];

  // Group expenses by type for pie chart
  const expensesByType = expenses.reduce((acc, item) => {
    const type = item.expense_type || 'أخرى';
    acc[type] = (acc[type] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const expensesPieData = Object.entries(expensesByType).map(([name, value]) => ({
    name,
    value,
  }));

  // Group income by source for pie chart
  const incomeBySource = income.reduce((acc, item) => {
    const source = item.source || 'أخرى';
    acc[source] = (acc[source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const incomePieData = Object.entries(incomeBySource).map(([name, value]) => ({
    name,
    value,
  }));

  // Revenue distribution
  const distributionData = [
    { name: 'المستفيدين', value: beneficiariesShare, fill: '#3b82f6' },
    { name: 'الناظر', value: adminShare, fill: '#f59e0b' },
    { name: 'الواقف', value: waqifShare, fill: '#8b5cf6' },
  ];

  // Monthly income trend (mock data for demo)
  const monthlyData = [
    { month: 'محرم', income: totalIncome * 0.08 },
    { month: 'صفر', income: totalIncome * 0.09 },
    { month: 'ربيع أول', income: totalIncome * 0.085 },
    { month: 'ربيع ثاني', income: totalIncome * 0.082 },
    { month: 'جمادى أولى', income: totalIncome * 0.088 },
    { month: 'جمادى ثانية', income: totalIncome * 0.09 },
    { month: 'رجب', income: totalIncome * 0.075 },
    { month: 'شعبان', income: totalIncome * 0.08 },
    { month: 'رمضان', income: totalIncome * 0.085 },
    { month: 'شوال', income: totalIncome * 0.088 },
    { month: 'ذو القعدة', income: totalIncome * 0.078 },
    { month: 'ذو الحجة', income: totalIncome * 0.08 },
  ];

  const handleDownloadPDF = async () => {
    if (currentBeneficiary) {
      await generateBeneficiaryStatementPDF(
        currentBeneficiary.name,
        currentBeneficiary.share_percentage,
        myShare,
        '1446-1447هـ'
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold font-display">التقارير المالية</h1>
            <p className="text-muted-foreground mt-1">عرض وتحليل البيانات المالية للوقف</p>
          </div>
          <Button onClick={handleDownloadPDF} className="gap-2" disabled={!currentBeneficiary}>
            <Download className="w-4 h-4" />
            تحميل التقرير
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">صافي الريع</p>
                  <p className="text-xl font-bold text-primary">{netRevenue.toLocaleString()}</p>
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
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses */}
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
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} />
                  <Bar dataKey="value" fill="#8884d8">
                    {incomeVsExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Distribution */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>توزيع الريع</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income by Source */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>الإيرادات حسب المصدر</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={incomePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {incomePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expenses by Type */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>المصروفات حسب النوع</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={expensesPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {expensesPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' ر.س'} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>الإيرادات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => Math.round(value).toLocaleString() + ' ر.س'} />
                <Bar dataKey="income" fill="#22c55e" name="الإيرادات" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FinancialReportsPage;
