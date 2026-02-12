import { useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { useAccounts } from '@/hooks/useAccounts';
import { useAllUnits } from '@/hooks/useUnits';
import { BarChart3, Download, FileText, Printer, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateAnnualReportPDF } from '@/utils/pdfGenerator';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
const ReportsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContracts();
  const { data: accounts = [] } = useAccounts();
  const { data: allUnits = [] } = useAllUnits();
  const reportRef = useRef<HTMLDivElement>(null);

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Use stored account values if available
  const currentAccount = accounts[0];
  
  const vatAmount = currentAccount ? Number(currentAccount.vat_amount) : 0;
  const netAfterExpenses = currentAccount ? Number(currentAccount.net_after_expenses) : totalIncome - totalExpenses;
  const netAfterVat = currentAccount ? Number(currentAccount.net_after_vat) : netAfterExpenses - vatAmount;
  const zakatAmount = currentAccount ? Number((currentAccount as Record<string, unknown>)?.zakat_amount || 0) : 0;
  const netAfterZakat = netAfterVat - zakatAmount;
  const adminShare = currentAccount ? Number(currentAccount.admin_share) : 0;
  const waqifShare = currentAccount ? Number(currentAccount.waqif_share) : 0;
  const waqfRevenue = currentAccount ? Number(currentAccount.waqf_revenue) : 0;
  const waqfCorpusManual = currentAccount ? Number((currentAccount as Record<string, unknown>)?.waqf_corpus_manual || 0) : 0;
  const distributableAmount = waqfRevenue - waqfCorpusManual;
  const beneficiariesShare = distributableAmount;
  const netRevenue = totalIncome - totalExpenses;

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
      fiscalYear: currentAccount?.fiscal_year || '25/10/1446 - 25/10/1447هـ',
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
    }, pdfWaqfInfo);
  };

  // ─── Property Performance Data ──────────────────────────────────────
  const propertyPerformance = properties.map((property) => {
    const propertyUnits = allUnits.filter(u => u.property_id === property.id);
    const totalUnitsCount = propertyUnits.length;
    const rented = propertyUnits.filter(u => u.status === 'مؤجرة').length;
    // الإيرادات التعاقدية (نشطة + منتهية) - متوافق مع صفحة العقارات
    const allPropertyContracts = contracts.filter(c => c.property_id === property.id);
    const activeContracts = allPropertyContracts.filter(c => c.status === 'active');
    const hasActiveContract = activeContracts.length > 0;

    let occupancy: number;
    if (totalUnitsCount > 0) {
      occupancy = Math.round((rented / totalUnitsCount) * 100);
    } else if (hasActiveContract) {
      occupancy = 100;
    } else {
      occupancy = 0;
    }

    const annualRent = allPropertyContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
    const propExp = expenses.filter(e => e.property_id === property.id);
    const totalPropExpenses = propExp.reduce((sum, e) => sum + Number(e.amount), 0);
    const netIncome = annualRent - totalPropExpenses;

    return {
      id: property.id,
      name: property.property_number,
      type: property.property_type,
      totalUnits: totalUnitsCount,
      occupancy,
      annualRent,
      totalExpenses: totalPropExpenses,
      netIncome,
    };
  }).sort((a, b) => b.netIncome - a.netIncome);

  const perfTotals = propertyPerformance.reduce(
    (acc, p) => ({
      totalUnits: acc.totalUnits + p.totalUnits,
      annualRent: acc.annualRent + p.annualRent,
      totalExpenses: acc.totalExpenses + p.totalExpenses,
      netIncome: acc.netIncome + p.netIncome,
    }),
    { totalUnits: 0, annualRent: 0, totalExpenses: 0, netIncome: 0 }
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" ref={reportRef}>
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">التقارير</h1>
            <p className="text-muted-foreground mt-1">عرض التقارير والإحصائيات</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </Button>
            <Button onClick={handlePrint} className="gradient-primary gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة التقرير</span>
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

        <Tabs defaultValue="financial" dir="rtl">
          <TabsList className="print:hidden">
            <TabsTrigger value="financial">
              <FileText className="w-4 h-4 ml-2" />
              التقارير المالية
            </TabsTrigger>
            <TabsTrigger value="performance">
              <TrendingUp className="w-4 h-4 ml-2" />
              مقارنة أداء العقارات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-6">
            {/* Annual Disclosure */}
            <Card className="shadow-sm print:break-before-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  الإفصاح السنوي ({currentAccount?.fiscal_year || '25/10/1446 - 25/10/1447هـ'})
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
                      <tr className="border-b-2 border-primary bg-muted/50">
                        <td className="py-3 px-4 font-bold">صافي الريع</td>
                        <td className="py-3 px-4 font-bold text-primary">{netRevenue.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">حصة الناظر ({netRevenue > 0 ? ((adminShare / netRevenue) * 100).toFixed(1) : '0'}%)</td>
                        <td className="py-3 px-4">{adminShare.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">حصة الواقف ({netRevenue > 0 ? ((waqifShare / netRevenue) * 100).toFixed(1) : '0'}%)</td>
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
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>توزيع الدخل حسب المصدر</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={incomeSourceData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                          {incomeSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} ر.س`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
                  )}
                </CardContent>
              </Card>
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
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
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
                  <div className="py-12 text-center text-muted-foreground">لا يوجد مستفيدين مسجلين</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  مقارنة أداء العقارات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">العقار</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الوحدات</TableHead>
                        <TableHead className="text-right min-w-[150px]">نسبة الإشغال</TableHead>
                        <TableHead className="text-right">الإيجار السنوي</TableHead>
                        <TableHead className="text-right">المصروفات</TableHead>
                        <TableHead className="text-right">صافي الدخل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertyPerformance.map((p, index) => {
                        const occupancyColor = p.occupancy >= 80 ? 'text-green-600' : p.occupancy >= 50 ? 'text-yellow-600' : 'text-red-600';
                        const progressColor = p.occupancy >= 80 ? '[&>div]:bg-green-500' : p.occupancy >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500';
                        return (
                          <TableRow key={p.id} className={index % 2 === 0 ? '' : 'bg-muted/30'}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-bold">{p.name}</TableCell>
                            <TableCell>{p.type}</TableCell>
                            <TableCell>{p.totalUnits > 0 ? p.totalUnits : (p.occupancy === 100 ? 'كامل' : '-')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={p.occupancy} className={`h-2 flex-1 ${progressColor}`} />
                                <span className={`text-xs font-semibold whitespace-nowrap ${occupancyColor}`}>{p.occupancy}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{p.annualRent.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                            <TableCell className="text-destructive">{p.totalExpenses.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                            <TableCell className={`font-bold ${p.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {p.netIncome.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/70 font-bold">
                        <TableCell colSpan={3}>الإجمالي</TableCell>
                        <TableCell>{perfTotals.totalUnits > 0 ? perfTotals.totalUnits : '-'}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">{perfTotals.annualRent.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                        <TableCell className="text-destructive font-bold">{perfTotals.totalExpenses.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س</TableCell>
                        <TableCell className={`font-bold ${perfTotals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {perfTotals.netIncome.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
