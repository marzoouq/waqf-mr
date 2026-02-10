import { useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { BarChart3, Download, FileText, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { generateAnnualReportPDF } from '@/utils/pdfGenerator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
const ReportsPage = () => {
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContracts();
  const reportRef = useRef<HTMLDivElement>(null);

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netRevenue = totalIncome - totalExpenses;

  // Calculate shares
  const adminShare = netRevenue * 0.10; // 10% for admin
  const waqifShare = netRevenue * 0.05; // 5% for waqif
  const beneficiariesShare = netRevenue - adminShare - waqifShare; // Remaining for beneficiaries

  // Income by source
  const incomeBySource = income.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const incomeSourceData = Object.entries(incomeBySource).map(([name, value]) => ({ name, value }));

  // Expenses by type
  const expensesByType = expenses.reduce((acc, item) => {
    acc[item.expense_type] = (acc[item.expense_type] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const expenseTypeData = Object.entries(expensesByType).map(([name, value]) => ({ name, value }));

  // Beneficiary distributions
  const distributionData = beneficiaries.map((b) => ({
    name: b.name,
    amount: (beneficiariesShare * b.share_percentage) / 100,
    percentage: b.share_percentage,
  }));

  const COLORS = ['#166534', '#ca8a04', '#0891b2', '#7c3aed', '#dc2626', '#059669', '#d97706', '#4f46e5'];

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    await generateAnnualReportPDF({
      fiscalYear: '1446-1447',
      totalIncome,
      totalExpenses,
      netRevenue,
      adminShare,
      waqifShare,
      waqfRevenue: beneficiariesShare,
      expensesByType: expenseTypeData.map(d => ({ type: d.name, amount: d.value })),
      incomeBySource: incomeSourceData.map(d => ({ source: d.name, amount: d.value })),
      beneficiaries: distributionData.map(d => ({
        name: d.name,
        percentage: d.percentage,
        amount: d.amount,
      })),
    });
  };
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" ref={reportRef}>
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">التقارير</h1>
            <p className="text-muted-foreground mt-1">عرض التقارير والإحصائيات</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              تصدير PDF
            </Button>
            <Button onClick={handlePrint} className="gradient-primary gap-2">
              <Printer className="w-4 h-4" />
              طباعة التقرير
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">إجمالي الدخل</p>
              <p className="text-2xl font-bold text-success">{totalIncome.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-destructive">{totalExpenses.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">صافي الريع</p>
              <p className="text-2xl font-bold text-primary">{netRevenue.toLocaleString()} ر.س</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">عدد العقارات</p>
              <p className="text-2xl font-bold">{properties.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Annual Disclosure */}
        <Card className="shadow-sm print:break-before-page">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              الإفصاح السنوي (من 25/10/1446 إلى 25/10/1447هـ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="py-3 px-4 text-right font-bold text-primary">البند</th>
                    <th className="py-3 px-4 text-right font-bold text-primary">المبلغ (ر.س)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* قسم الإيرادات */}
                  <tr className="bg-green-50 dark:bg-green-950/30">
                    <td colSpan={2} className="py-2 px-4 font-bold text-green-700 dark:text-green-400 text-center">-- الإيرادات --</td>
                  </tr>
                  {incomeSourceData.map((item, index) => (
                    <tr key={`income-${index}`} className="border-b">
                      <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                      <td className="py-2 px-4 font-medium text-green-600 dark:text-green-400">+{item.value.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-green-500 bg-green-50 dark:bg-green-950/20">
                    <td className="py-3 px-4 font-bold">إجمالي الإيرادات</td>
                    <td className="py-3 px-4 font-bold text-green-700 dark:text-green-400">+{totalIncome.toLocaleString()}</td>
                  </tr>

                  {/* قسم المصروفات */}
                  <tr className="bg-red-50 dark:bg-red-950/30">
                    <td colSpan={2} className="py-2 px-4 font-bold text-red-700 dark:text-red-400 text-center">-- المصروفات --</td>
                  </tr>
                  {expenseTypeData.map((item, index) => (
                    <tr key={`expense-${index}`} className="border-b">
                      <td className="py-2 px-4 pr-8 text-muted-foreground">  {item.name}</td>
                      <td className="py-2 px-4 font-medium text-red-600 dark:text-red-400">-{item.value.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-red-500 bg-red-50 dark:bg-red-950/20">
                    <td className="py-3 px-4 font-bold">إجمالي المصروفات</td>
                    <td className="py-3 px-4 font-bold text-red-700 dark:text-red-400">-{totalExpenses.toLocaleString()}</td>
                  </tr>

                  {/* صافي الريع والتوزيع */}
                  <tr className="border-b-2 border-primary bg-muted/50">
                    <td className="py-3 px-4 font-bold">صافي الريع</td>
                    <td className="py-3 px-4 font-bold text-primary">{netRevenue.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">حصة الناظر (10%)</td>
                    <td className="py-3 px-4">{adminShare.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">حصة الواقف (5%)</td>
                    <td className="py-3 px-4">{waqifShare.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b-2 border-primary bg-muted/50">
                    <td className="py-3 px-4 font-bold">ريع الوقف للمستفيدين</td>
                    <td className="py-3 px-4 font-bold text-primary">{beneficiariesShare.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-before-page">
          {/* Income by Source */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>توزيع الدخل حسب المصدر</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incomeSourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses by Type */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>توزيع المصروفات حسب النوع</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                    <Bar dataKey="value" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Beneficiary Distribution */}
        <Card className="shadow-sm print:break-before-page">
          <CardHeader>
            <CardTitle>توزيع الحصص على المستفيدين</CardTitle>
          </CardHeader>
          <CardContent>
            {distributionData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">المستفيد</TableHead>
                    <TableHead className="text-right">النسبة</TableHead>
                    <TableHead className="text-right">المبلغ المستحق</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributionData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.percentage}%</TableCell>
                      <TableCell className="text-primary font-medium">{item.amount.toLocaleString()} ر.س</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>{beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0)}%</TableCell>
                    <TableCell className="text-primary">{beneficiariesShare.toLocaleString()} ر.س</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                لا يوجد مستفيدين مسجلين
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
