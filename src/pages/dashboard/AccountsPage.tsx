import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounts, useCreateAccount } from '@/hooks/useAccounts';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { Wallet, Plus, Calculator } from 'lucide-react';
import { toast } from 'sonner';

const AccountsPage = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const createAccount = useCreateAccount();

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netRevenue = totalIncome - totalExpenses;
  const adminShare = netRevenue * 0.10;
  const waqifShare = netRevenue * 0.05;
  const waqfRevenue = netRevenue - adminShare - waqifShare;

  const handleCreateAccount = async () => {
    const currentYear = new Date().toLocaleDateString('ar-SA', { year: 'numeric' });
    
    await createAccount.mutateAsync({
      fiscal_year: `1446-1447هـ`,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      admin_share: adminShare,
      waqif_share: waqifShare,
      waqf_revenue: waqfRevenue,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1">إدارة ومتابعة الحسابات السنوية</p>
          </div>
          <Button onClick={handleCreateAccount} className="gradient-primary gap-2" disabled={createAccount.isPending}>
            <Plus className="w-4 h-4" />
            إنشاء حساب ختامي
          </Button>
        </div>

        {/* Current Summary */}
        <Card className="shadow-sm gradient-hero text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              ملخص الحسابات الحالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm opacity-80">إجمالي الدخل</p>
                <p className="text-xl font-bold">{totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm opacity-80">إجمالي المصروفات</p>
                <p className="text-xl font-bold">{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm opacity-80">صافي الريع</p>
                <p className="text-xl font-bold">{netRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm opacity-80">حصة الناظر</p>
                <p className="text-xl font-bold">{adminShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm opacity-80">حصة الواقف</p>
                <p className="text-xl font-bold">{waqifShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-sm opacity-80">ريع الوقف</p>
                <p className="text-xl font-bold">{waqfRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Accounts */}
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-right font-medium">السنة المالية</th>
                      <th className="py-3 px-4 text-right font-medium">إجمالي الدخل</th>
                      <th className="py-3 px-4 text-right font-medium">إجمالي المصروفات</th>
                      <th className="py-3 px-4 text-right font-medium">حصة الناظر</th>
                      <th className="py-3 px-4 text-right font-medium">حصة الواقف</th>
                      <th className="py-3 px-4 text-right font-medium">ريع الوقف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium">{account.fiscal_year}</td>
                        <td className="py-3 px-4 text-success">+{Number(account.total_income).toLocaleString()}</td>
                        <td className="py-3 px-4 text-destructive">-{Number(account.total_expenses).toLocaleString()}</td>
                        <td className="py-3 px-4">{Number(account.admin_share).toLocaleString()}</td>
                        <td className="py-3 px-4">{Number(account.waqif_share).toLocaleString()}</td>
                        <td className="py-3 px-4 text-primary font-medium">{Number(account.waqf_revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AccountsPage;
