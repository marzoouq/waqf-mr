import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContracts();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: beneficiaries = [] } = useBeneficiaries();

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netRevenue = totalIncome - totalExpenses;
  const activeContracts = contracts.filter(c => c.status === 'active').length;

  const stats = [
    { title: 'إجمالي العقارات', value: properties.length, icon: Building2, color: 'bg-primary' },
    { title: 'العقود النشطة', value: activeContracts, icon: FileText, color: 'bg-secondary' },
    { title: 'إجمالي الدخل', value: `${totalIncome.toLocaleString()} ر.س`, icon: TrendingUp, color: 'bg-success' },
    { title: 'إجمالي المصروفات', value: `${totalExpenses.toLocaleString()} ر.س`, icon: TrendingDown, color: 'bg-destructive' },
    { title: 'صافي الريع', value: `${netRevenue.toLocaleString()} ر.س`, icon: Wallet, color: 'bg-primary' },
    { title: 'عدد المستفيدين', value: beneficiaries.length, icon: Users, color: 'bg-secondary' },
  ];

  // Monthly income/expense chart data
  const monthlyData = [
    { month: 'محرم', income: 50000, expenses: 15000 },
    { month: 'صفر', income: 52000, expenses: 18000 },
    { month: 'ربيع الأول', income: 48000, expenses: 12000 },
    { month: 'ربيع الثاني', income: 55000, expenses: 20000 },
    { month: 'جمادى الأولى', income: 53000, expenses: 16000 },
    { month: 'جمادى الثانية', income: 51000, expenses: 14000 },
  ];

  // Expense distribution
  const expenseTypes = [
    { name: 'كهرباء', value: 25 },
    { name: 'مياه', value: 15 },
    { name: 'صيانة', value: 30 },
    { name: 'عمالة', value: 20 },
    { name: 'أخرى', value: 10 },
  ];

  const COLORS = ['#166534', '#ca8a04', '#0891b2', '#7c3aed', '#dc2626'];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">مرحباً بك في نظام إدارة الوقف</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>الدخل والمصروفات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="income" fill="hsl(158, 64%, 25%)" name="الدخل" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(43, 74%, 49%)" name="المصروفات" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Distribution */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>توزيع المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
                {contracts.slice(0, 5).map((contract) => (
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
                {contracts.length === 0 && (
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
