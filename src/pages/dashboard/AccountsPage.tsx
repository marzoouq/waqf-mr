import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounts, useCreateAccount } from '@/hooks/useAccounts';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useContracts } from '@/hooks/useContracts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { Wallet, Plus, Calculator, FileText, TrendingUp, TrendingDown, Users, PieChart } from 'lucide-react';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';

const AccountsPage = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: contracts = [] } = useContracts();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const createAccount = useCreateAccount();

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const currentAccount = accounts[0];
  const netRevenue = totalIncome - totalExpenses;
  const adminShare = currentAccount ? Number(currentAccount.admin_share) : netRevenue * 0.10;
  const waqifShare = currentAccount ? Number(currentAccount.waqif_share) : netRevenue * 0.05;
  const waqfRevenue = currentAccount ? Number(currentAccount.waqf_revenue) : netRevenue - adminShare - waqifShare;

  // Group income by source
  const incomeBySource = income.reduce((acc, item) => {
    const source = item.source || 'غير محدد';
    acc[source] = (acc[source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  // Group expenses by type
  const expensesByType = expenses.reduce((acc, item) => {
    const type = item.expense_type || 'غير محدد';
    acc[type] = (acc[type] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  // Total contracts rent
  const totalRent = contracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
  const totalAnnualRent = contracts.reduce((sum, c) => sum + Number(c.rent_amount) * 12, 0);

  // Tenant payment data (actual collection from analyzed records)
  const tenantPaymentData: Record<string, { paidMonths: number; notes: string }> = {
    '10610950434': { paidMonths: 8, notes: 'متأخر 4 أشهر' },
    '10023960935': { paidMonths: 7, notes: 'شاغرة 5 أشهر' },
    '10888316394': { paidMonths: 6, notes: 'منتهي/شاغر 6 أشهر' },
    '10969934020': { paidMonths: 11, notes: 'عقد جديد أكتوبر' },
  };

  const collectionData = contracts.map((contract, index) => {
    const paymentInfo = tenantPaymentData[contract.contract_number];
    const paidMonths = paymentInfo ? paymentInfo.paidMonths : 12;
    const monthlyRent = Number(contract.rent_amount);
    const totalCollected = monthlyRent * paidMonths;
    const arrears = (monthlyRent * 12) - totalCollected;
    return {
      index: index + 1,
      tenantName: contract.tenant_name,
      monthlyRent,
      expectedPayments: 12,
      paidMonths,
      totalCollected,
      arrears,
      status: arrears === 0 ? 'مكتمل' : 'متأخر',
      notes: paymentInfo?.notes || '',
    };
  });

  const totalCollectedAll = collectionData.reduce((sum, d) => sum + d.totalCollected, 0);
  const totalArrearsAll = collectionData.reduce((sum, d) => sum + d.arrears, 0);
  const totalPaidMonths = collectionData.reduce((sum, d) => sum + d.paidMonths, 0);
  const totalExpectedPayments = collectionData.reduce((sum, d) => sum + d.expectedPayments, 0);

  // Waqf corpus (رقبة الوقف)
  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);
  const waqfCorpus = waqfRevenue * (1 - totalBeneficiaryPercentage / 100);

  const handleCreateAccount = async () => {
    await createAccount.mutateAsync({
      fiscal_year: `25/10/2024 - 25/10/2025م`,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      admin_share: adminShare,
      waqif_share: waqifShare,
      waqf_revenue: waqfRevenue,
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1">إدارة ومتابعة الحسابات السنوية</p>
          </div>
          <Button onClick={handleCreateAccount} className="gradient-primary gap-2" disabled={createAccount.isPending}>
            <Plus className="w-4 h-4" />
            إنشاء حساب ختامي
          </Button>
        </div>

        {/* 1. Current Summary */}
        <Card className="shadow-sm gradient-hero text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              ملخص الحسابات الحالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">إجمالي الدخل</p>
                <p className="text-xl font-bold">{totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">إجمالي المصروفات</p>
                <p className="text-xl font-bold">{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">صافي الريع</p>
                <p className="text-xl font-bold">{netRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">حصة الناظر</p>
                <p className="text-xl font-bold">{adminShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">حصة الواقف</p>
                <p className="text-xl font-bold">{waqifShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm text-primary-foreground/90">ريع الوقف</p>
                <p className="text-xl font-bold">{waqfRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Contracts */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              العقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
            ) : (
              <>
              <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right w-12">#</TableHead>
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">الإيجار الشهري</TableHead>
                      <TableHead className="text-right">عدد الدفعات</TableHead>
                      <TableHead className="text-right">إجمالي العقد السنوي</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract, index) => (
                      <TableRow key={contract.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{contract.contract_number}</TableCell>
                        <TableCell>{contract.tenant_name}</TableCell>
                        <TableCell className="font-bold text-primary">{Number(contract.rent_amount).toLocaleString()} ريال</TableCell>
                        <TableCell className="text-center">12</TableCell>
                        <TableCell className="font-bold text-primary">{(Number(contract.rent_amount) * 12).toLocaleString()} ريال</TableCell>
                        <TableCell>{statusLabel(contract.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/70 font-bold">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell></TableCell>
                      <TableCell>{contracts.length} عقد</TableCell>
                      <TableCell className="text-primary font-bold">{totalRent.toLocaleString()} ريال</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-primary font-bold">{totalAnnualRent.toLocaleString()} ريال</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* 2.5 Collection & Arrears Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              تفصيل التحصيل والمتأخرات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
                    <TableHead className="text-right">الدفعات المتوقعة</TableHead>
                    <TableHead className="text-right">الدفعات المحصّلة</TableHead>
                    <TableHead className="text-right">الإجمالي المحصّل</TableHead>
                    <TableHead className="text-right">المتأخرات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionData.map((item) => (
                    <TableRow key={item.index}>
                      <TableCell className="text-muted-foreground">{item.index}</TableCell>
                      <TableCell className="font-medium">{item.tenantName}</TableCell>
                      <TableCell className="font-bold text-primary">{item.monthlyRent.toLocaleString()} ريال</TableCell>
                      <TableCell className="text-center">{item.expectedPayments}</TableCell>
                      <TableCell className="text-center">{item.paidMonths}</TableCell>
                      <TableCell className="font-bold text-primary">{item.totalCollected.toLocaleString()} ريال</TableCell>
                      <TableCell className={`font-bold ${item.arrears > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {item.arrears.toLocaleString()} ريال
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'مكتمل' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/70 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>{contracts.length} مستأجر</TableCell>
                    <TableCell className="text-primary font-bold">{totalRent.toLocaleString()} ريال</TableCell>
                    <TableCell className="text-center">{totalExpectedPayments}</TableCell>
                    <TableCell className="text-center">{totalPaidMonths}</TableCell>
                    <TableCell className="text-primary font-bold">{totalCollectedAll.toLocaleString()} ريال</TableCell>
                    <TableCell className="text-destructive font-bold">{totalArrearsAll.toLocaleString()} ريال</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 3. Income Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              تفصيل الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {income.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد إيرادات مسجلة</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">المصدر</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(incomeBySource).map(([source, amount]) => (
                      <TableRow key={source}>
                        <TableCell className="font-medium">{source}</TableCell>
                        <TableCell className="text-success">+{amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">إجمالي الإيرادات</span>
                  <span className="font-bold text-success">+{totalIncome.toLocaleString()} ريال</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 4. Expenses Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              تفصيل المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد مصروفات مسجلة</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(expensesByType).map(([type, amount]) => (
                      <TableRow key={type}>
                        <TableCell className="font-medium">{type}</TableCell>
                        <TableCell className="text-destructive">-{amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">إجمالي المصروفات</span>
                  <span className="font-bold text-destructive">-{totalExpenses.toLocaleString()} ريال</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 5. Distribution & Shares */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              التوزيع والحصص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">البند</TableHead>
                  <TableHead className="text-right">النسبة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">صافي الريع</TableCell>
                  <TableCell>100%</TableCell>
                  <TableCell className="font-bold">{netRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">حصة الناظر</TableCell>
                  <TableCell>10%</TableCell>
                  <TableCell>{adminShare.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">حصة الواقف</TableCell>
                  <TableCell>5%</TableCell>
                  <TableCell>{waqifShare.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ريع الوقف (للتوزيع)</TableCell>
                  <TableCell>85%</TableCell>
                  <TableCell className="text-primary font-bold">{waqfRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">رقبة الوقف</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{waqfCorpus.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 6. Beneficiary Distribution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              توزيع حصص المستفيدين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {beneficiaries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد مستفيدون مسجلون</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">المستفيد</TableHead>
                      <TableHead className="text-right">النسبة</TableHead>
                      <TableHead className="text-right">المبلغ المستحق</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{Number(b.share_percentage).toFixed(2)}%</TableCell>
                        <TableCell className="text-primary font-medium">
                          {(waqfRevenue * Number(b.share_percentage) / 100).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">إجمالي التوزيع</span>
                  <span className="font-bold text-primary">
                    {(waqfRevenue * totalBeneficiaryPercentage / 100).toLocaleString()} ريال
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 7. Previous Accounts */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>السجلات السابقة</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد حسابات ختامية مسجلة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">السنة المالية</TableHead>
                    <TableHead className="text-right">إجمالي الدخل</TableHead>
                    <TableHead className="text-right">إجمالي المصروفات</TableHead>
                    <TableHead className="text-right">حصة الناظر</TableHead>
                    <TableHead className="text-right">حصة الواقف</TableHead>
                    <TableHead className="text-right">ريع الوقف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.fiscal_year}</TableCell>
                      <TableCell className="text-success">+{Number(account.total_income).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">-{Number(account.total_expenses).toLocaleString()}</TableCell>
                      <TableCell>{Number(account.admin_share).toLocaleString()}</TableCell>
                      <TableCell>{Number(account.waqif_share).toLocaleString()}</TableCell>
                      <TableCell className="text-primary font-medium">{Number(account.waqf_revenue).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
