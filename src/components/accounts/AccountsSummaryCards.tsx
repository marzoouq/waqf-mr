import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface AccountsSummaryCardsProps {
  waqfCorpusPrevious: number;
  totalIncome: number;
  grandTotal: number;
  totalExpenses: number;
  netAfterExpenses: number;
  manualVat: number;
  netAfterVat: number;
  zakatAmount: number;
  adminPercent: number;
  adminShare: number;
  waqifPercent: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  manualDistributions: number;
  remainingBalance: number;
}

const AccountsSummaryCards = ({
  waqfCorpusPrevious, totalIncome, grandTotal, totalExpenses,
  netAfterExpenses, manualVat, netAfterVat, zakatAmount,
  adminPercent, adminShare, waqifPercent, waqifShare,
  waqfRevenue, waqfCorpusManual, manualDistributions, remainingBalance,
}: AccountsSummaryCardsProps) => {
  return (
    <Card className="shadow-sm gradient-hero text-primary-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          ملخص الحسابات الحالية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {waqfCorpusPrevious > 0 && (
            <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
              <p className="text-sm text-primary-foreground/90">رقبة وقف مرحلة</p>
              <p className="text-xl font-bold">{waqfCorpusPrevious.toLocaleString()}</p>
            </div>
          )}
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">إجمالي الدخل</p>
            <p className="text-xl font-bold">{totalIncome.toLocaleString()}</p>
          </div>
          {waqfCorpusPrevious > 0 && (
            <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
              <p className="text-sm text-primary-foreground/90">الإجمالي الشامل</p>
              <p className="text-xl font-bold">{grandTotal.toLocaleString()}</p>
            </div>
          )}
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">المصروفات التشغيلية</p>
            <p className="text-xl font-bold">{totalExpenses.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">الصافي بعد المصاريف</p>
            <p className="text-xl font-bold">{netAfterExpenses.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">ضريبة القيمة المضافة</p>
            <p className="text-xl font-bold">{manualVat.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">الصافي بعد الضريبة</p>
            <p className="text-xl font-bold">{netAfterVat.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">الزكاة</p>
            <p className="text-xl font-bold">{zakatAmount.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">حصة الناظر ({adminPercent}%)</p>
            <p className="text-xl font-bold">{adminShare.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">حصة الواقف ({waqifPercent}%)</p>
            <p className="text-xl font-bold">{waqifShare.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">ريع الوقف</p>
            <p className="text-xl font-bold">{waqfRevenue.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">رقبة الوقف (الحالي)</p>
            <p className="text-xl font-bold">{waqfCorpusManual.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">التوزيعات</p>
            <p className="text-xl font-bold">{manualDistributions.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-sm text-primary-foreground/90">الرصيد المتبقي</p>
            <p className="text-xl font-bold">{remainingBalance.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountsSummaryCards;
