import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { Wallet, FileText, BarChart3 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const BeneficiaryDashboard = () => {
  const { user } = useAuth();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();

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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="animate-slide-up">
          <h1 className="text-3xl font-bold">مرحباً {currentBeneficiary?.name || 'بك'}</h1>
          <p className="text-muted-foreground mt-1">واجهة المستفيد - عرض فقط</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm opacity-80">حصتي من الريع</p>
                  <p className="text-2xl font-bold">{myShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نسبة حصتي</p>
                  <p className="text-2xl font-bold">{currentBeneficiary?.share_percentage || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي ريع الوقف</p>
                  <p className="text-2xl font-bold">{beneficiariesShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Annual Disclosure */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>الإفصاح السنوي (1446-1447هـ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span>إجمالي إيرادات الوقف</span>
                <span className="font-bold text-success">+{totalIncome.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>إجمالي المصروفات</span>
                <span className="font-bold text-destructive">-{totalExpenses.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>صافي الريع</span>
                <span className="font-bold text-primary">{netRevenue.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>ريع المستفيدين (بعد خصم حصة الناظر والواقف)</span>
                <span className="font-bold">{beneficiariesShare.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-4 mt-4">
                <span className="font-bold">حصتي المستحقة ({currentBeneficiary?.share_percentage || 0}%)</span>
                <span className="font-bold text-primary text-xl">{myShare.toLocaleString()} ر.س</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiaryDashboard;
