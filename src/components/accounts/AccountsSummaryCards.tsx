import { fmt } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccountsSummaryCardsProps {
  waqfCorpusPrevious: number;
  totalIncome: number;
  grandTotal: number;
  totalExpenses: number;
  netAfterExpenses: number;
  manualVat: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat?: number;
  adminPercent: number;
  adminShare: number;
  waqifPercent: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  manualDistributions: number;
  remainingBalance: number;
  /** Whether the fiscal year is closed — if false and forcePreview, shows estimate notice */
  isClosed?: boolean;
  /** H11: whether default percentages are being used instead of configured ones */
  usingFallbackPct?: boolean;
}

const AccountsSummaryCards = ({
  waqfCorpusPrevious, totalIncome, grandTotal, totalExpenses,
  netAfterExpenses, manualVat, netAfterVat, zakatAmount, netAfterZakat,
  adminPercent, adminShare, waqifPercent, waqifShare,
  waqfRevenue, waqfCorpusManual, manualDistributions, remainingBalance,
  isClosed = false, usingFallbackPct = false, // L-05 fix: default to false
}: AccountsSummaryCardsProps) => {
  const computedNetAfterZakat = netAfterZakat ?? (netAfterVat - zakatAmount);
  return (
    <Card className="shadow-sm gradient-hero text-primary-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          ملخص الحسابات الحالية
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isClosed && (
          <Alert className="mb-4 border-warning/50 bg-warning/20 text-primary-foreground">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              هذه أرقام تقديرية — يتم اعتمادها رسمياً عند إقفال السنة المالية
            </AlertDescription>
          </Alert>
        )}
        {usingFallbackPct && (
          <Alert className="mb-4 border-warning/50 bg-warning/20 text-primary-foreground">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              تُستخدَم النسب الافتراضية (ناظر 10%، واقف 5%) — يمكنك تعديلها من إعدادات الحسابات
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {waqfCorpusPrevious > 0 && (
            <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
              <p className="text-xs sm:text-sm text-primary-foreground/90">رقبة وقف مرحلة</p>
              <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(waqfCorpusPrevious)}</p>
            </div>
          )}
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">إجمالي الدخل</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(totalIncome)}</p>
          </div>
          {waqfCorpusPrevious > 0 && (
            <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
              <p className="text-xs sm:text-sm text-primary-foreground/90">الإجمالي الشامل</p>
              <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(grandTotal)}</p>
            </div>
          )}
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">المصروفات التشغيلية</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(totalExpenses)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">الصافي بعد المصاريف</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(netAfterExpenses)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">ضريبة القيمة المضافة</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(manualVat)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">الصافي بعد الضريبة</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(netAfterVat)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">الزكاة</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(zakatAmount)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">الصافي بعد الزكاة</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(computedNetAfterZakat)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">حصة الناظر ({adminPercent}%)</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(adminShare)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">حصة الواقف ({waqifPercent}%)</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(waqifShare)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">ريع الوقف</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(waqfRevenue)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">رقبة الوقف (الحالي)</p>
            <p className="text-base sm:text-xl font-bold tabular-nums truncate">{fmt(waqfCorpusManual)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">التوزيعات</p>
            <p className="text-base sm:text-xl font-bold">{fmt(manualDistributions)}</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-foreground/90">الرصيد المتبقي</p>
            <p className="text-base sm:text-xl font-bold">{fmt(remainingBalance)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountsSummaryCards;
