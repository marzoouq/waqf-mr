import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useContracts } from '@/hooks/useContracts';
import { useAccounts } from '@/hooks/useAccounts';
import { Wallet, FileText, TrendingUp, TrendingDown, Users, PieChart, Calculator } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';

const AccountsViewPage = () => {
  const { user } = useAuth();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: contracts = [] } = useContracts();
  const { data: accounts = [] } = useAccounts();

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

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

  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);
  const waqfCorpus = waqfRevenue * (1 - totalBeneficiaryPercentage / 100);

  const myShare = currentBeneficiary
    ? (waqfRevenue * Number(currentBeneficiary.share_percentage)) / 100
    : 0;

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
        <div className="animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold font-display">الحسابات الختامية</h1>
          <p className="text-muted-foreground mt-1">عرض تفصيلي للحسابات الختامية للوقف</p>
        </div>

        {/* Summary */}
        <Card className="shadow-sm gradient-hero text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              ملخص الحسابات
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

        {/* My Share Highlight */}
        {currentBeneficiary && (
          <Card className="shadow-sm bg-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">حصتي المستحقة ({currentBeneficiary.share_percentage}%)</p>
                  <p className="text-3xl font-bold text-primary">{myShare.toLocaleString()} ر.س</p>
                </div>
                <Wallet className="w-10 h-10 text-primary/30" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contracts */}
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
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-right">رقم العقد</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
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
                    <TableCell className="text-primary font-bold">{totalAnnualRent.toLocaleString()} ريال</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Income Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              تفصيل الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Expenses Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              تفصيل المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Distribution & Shares */}
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

        {/* Beneficiary Distribution */}
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
                    {beneficiaries.map((b) => {
                      const isMe = b.user_id === user?.id;
                      return (
                        <TableRow key={b.id} className={isMe ? 'bg-primary/5' : ''}>
                          <TableCell className="font-medium">
                            {b.name} {isMe && <span className="text-primary text-xs mr-1">(أنت)</span>}
                          </TableCell>
                          <TableCell>{Number(b.share_percentage).toFixed(2)}%</TableCell>
                          <TableCell className="text-primary font-medium">
                            {(waqfRevenue * Number(b.share_percentage) / 100).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
      </div>
    </DashboardLayout>
  );
};

export default AccountsViewPage;
