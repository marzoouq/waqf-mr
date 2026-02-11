import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { FileText, Download, TrendingUp, TrendingDown, Wallet, Printer } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { generateDisclosurePDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

const DisclosurePage = () => {
  const { user } = useAuth();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: accounts = [] } = useAccounts();

  // Find current user's beneficiary record
  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  // Use stored account values from admin
  const currentAccount = accounts[0];
  const totalIncome = Number(currentAccount?.total_income || 0);
  const totalExpenses = Number(currentAccount?.total_expenses || 0);
  const netRevenue = totalIncome - totalExpenses;
  const adminShare = Number(currentAccount?.admin_share || 0);
  const waqifShare = Number(currentAccount?.waqif_share || 0);
  const beneficiariesShare = Number(currentAccount?.waqf_revenue || 0);

  const myShare = currentBeneficiary 
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100 
    : 0;

  const fiscalYear = currentAccount?.fiscal_year || '';

  // Group income by source
  const incomeBySource = income.reduce((acc, item) => {
    const source = item.source || 'أخرى';
    acc[source] = (acc[source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  // Group expenses by type
  const expensesByType = expenses.reduce((acc, item) => {
    const type = item.expense_type || 'أخرى';
    acc[type] = (acc[type] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const handleDownloadPDF = async () => {
    try {
      await generateDisclosurePDF({
        fiscalYear,
        beneficiaryName: currentBeneficiary?.name || '',
        sharePercentage: currentBeneficiary?.share_percentage || 0,
        myShare,
        totalIncome,
        totalExpenses,
        netRevenue,
        adminShare,
        waqifShare,
        beneficiariesShare,
        incomeBySource,
        expensesByType,
      });
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold font-display">الإفصاح السنوي</h1>
            <p className="text-muted-foreground mt-1">السنة المالية: {fiscalYear}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" />
              تصدير PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm bg-success/10 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-success">+{totalIncome.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-destructive/10 border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-2xl font-bold text-destructive">-{totalExpenses.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/90">حصتي المستحقة</p>
                  <p className="text-2xl font-bold">{myShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Financial Statement */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              البيان المالي التفصيلي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Income Breakdown */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-success">الإيرادات</h3>
                <div className="space-y-2">
                  {Object.entries(incomeBySource).map(([source, amount]) => (
                    <div key={source} className="flex justify-between items-center py-2 border-b border-dashed">
                      <span>{source}</span>
                      <span className="text-success font-medium">+{amount.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 font-bold bg-success/10 rounded px-2">
                    <span>إجمالي الإيرادات</span>
                    <span className="text-success">+{totalIncome.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-destructive">المصروفات</h3>
                <div className="space-y-2">
                  {Object.entries(expensesByType).map(([type, amount]) => (
                    <div key={type} className="flex justify-between items-center py-2 border-b border-dashed">
                      <span>{type}</span>
                      <span className="text-destructive font-medium">-{amount.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
                    <span>إجمالي المصروفات</span>
                    <span className="text-destructive">-{totalExpenses.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Net Calculation */}
              <div className="border-t-2 pt-4 space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold">صافي الريع</span>
                  <span className="font-bold text-primary text-lg">{netRevenue.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 text-muted-foreground">
                  <span>حصة الناظر (10%)</span>
                  <span>-{adminShare.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 text-muted-foreground">
                  <span>حصة الواقف (5%)</span>
                  <span>-{waqifShare.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 font-bold">
                  <span>صافي ريع المستفيدين</span>
                  <span>{beneficiariesShare.toLocaleString()} ر.س</span>
                </div>
              </div>

              {/* My Share */}
              <div className="bg-primary/10 rounded-xl p-6 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">حصتي ({currentBeneficiary?.share_percentage || 0}%)</p>
                    <p className="font-bold text-2xl text-primary">{myShare.toLocaleString()} ر.س</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-bold">{currentBeneficiary?.name || 'غير مرتبط'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DisclosurePage;
