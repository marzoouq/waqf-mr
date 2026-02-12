import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useAccounts } from '@/hooks/useAccounts';
import { Wallet, FileText, BarChart3, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';

const BeneficiaryDashboard = () => {
  const { user } = useAuth();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: accounts = [] } = useAccounts();

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);
  const latestAccount = accounts[0];

  const totalIncome = Number(latestAccount?.total_income || 0);
  const totalExpenses = Number(latestAccount?.total_expenses || 0);
  const netAfterExpenses = Number(latestAccount?.net_after_expenses || 0);
  const vatAmount = Number(latestAccount?.vat_amount || 0);
  const netAfterVat = Number(latestAccount?.net_after_vat || 0);
  const zakatAmount = Number((latestAccount as Record<string, unknown>)?.zakat_amount || 0);
  const netAfterZakat = netAfterVat - zakatAmount;
  const adminShare = Number(latestAccount?.admin_share || 0);
  const waqifShare = Number(latestAccount?.waqif_share || 0);
  const afterAdmin = netAfterZakat - adminShare;
  const waqfRevenue = Number(latestAccount?.waqf_revenue || 0);
  const waqfCorpusManual = Number((latestAccount as Record<string, unknown>)?.waqf_corpus_manual || 0);
  const distributableAmount = waqfRevenue - waqfCorpusManual;
  const beneficiariesShare = distributableAmount;

  const myShare = currentBeneficiary 
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100 
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">مرحباً {currentBeneficiary?.name || 'بك'}</h1>
            <p className="text-muted-foreground mt-1">واجهة المستفيد - عرض فقط</p>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
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
                  <p className="text-sm text-primary-foreground/90">حصتي من الريع</p>
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
            <CardTitle>الإفصاح السنوي ({latestAccount?.fiscal_year || ''})</CardTitle>
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
                <span>الصافي بعد المصاريف</span>
                <span className="font-bold">{netAfterExpenses.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>(-) ضريبة القيمة المضافة</span>
                <span className="font-bold text-destructive">-{vatAmount.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>الصافي بعد خصم الضريبة</span>
                <span className="font-bold text-primary">{netAfterVat.toLocaleString()} ر.س</span>
              </div>
              {zakatAmount > 0 && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span>(-) الزكاة</span>
                  <span className="font-bold text-destructive">-{zakatAmount.toLocaleString()} ر.س</span>
                </div>
              )}
              {zakatAmount > 0 && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span>الصافي بعد الزكاة</span>
                  <span className="font-bold">{netAfterZakat.toLocaleString()} ر.س</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                <span>(-) حصة الناظر</span>
                <span>{adminShare.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-muted-foreground">
                <span>(-) حصة الواقف</span>
                <span>{waqifShare.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>ريع الوقف</span>
                <span className="font-bold">{waqfRevenue.toLocaleString()} ر.س</span>
              </div>
              {waqfCorpusManual > 0 && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span>(-) رقبة الوقف</span>
                  <span>{waqfCorpusManual.toLocaleString()} ر.س</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b">
                <span>الإجمالي القابل للتوزيع</span>
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
