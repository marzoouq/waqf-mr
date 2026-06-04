/**
 * D-3: ويدجت السنة المالية — أيام متبقية + نسبة إنجاز زمني + مالي.
 * يعرض معلومات مختلفة حسب حالة السنة (نشطة/مقفلة).
 * S6-2: حسابات التواريخ والتقدم استُخرجت إلى useFiscalYearWidget.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, CheckCircle2, Lock } from 'lucide-react';
import { useFiscalYearWidget } from '@/hooks/page/admin/dashboard/useFiscalYearWidget';

interface FiscalYearInfo {
  label: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface FiscalYearWidgetProps {
  fiscalYear: FiscalYearInfo | null;
  totalIncome: number;
  contractualRevenue: number;
}

const FiscalYearWidget: React.FC<FiscalYearWidgetProps> = ({
  fiscalYear,
  totalIncome,
  contractualRevenue,
}) => {
  if (!fiscalYear) return null;

  // عرض مُبسّط للسنة المقفلة/المسودة
  if (fiscalYear.status !== 'active') {
    const statusLabel = fiscalYear.status === 'closed' ? 'مُقفلة' : 'مسودة';
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-5 h-5 text-muted-foreground" />
            السنة المالية: {fiscalYear.label}
            <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            من {new Date(fiscalYear.start_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}إلى {new Date(fiscalYear.end_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  // السنة النشطة — عرض كامل مع تقدم زمني ومالي
  return <ActiveFiscalYearWidget fiscalYear={fiscalYear} totalIncome={totalIncome} contractualRevenue={contractualRevenue} />;
};

/** ويدجت السنة النشطة — منطق محسوب في useFiscalYearWidget (S6-2) */
const ActiveFiscalYearWidget: React.FC<{ fiscalYear: FiscalYearInfo; totalIncome: number; contractualRevenue: number }> = ({
  fiscalYear, totalIncome, contractualRevenue,
}) => {
  const {
    totalDays,
    remainingDays,
    timeProgress,
    rawFinancialProgress,
    exceededTarget,
    financialProgress,
  } = useFiscalYearWidget({ fiscalYear, totalIncome, contractualRevenue });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5" />
          السنة المالية: {fiscalYear.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* أيام متبقية */}
          <div className="text-center p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">أيام متبقية</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${remainingDays <= 7 ? 'text-destructive' : remainingDays <= 30 ? 'text-warning' : 'text-foreground'}`}>
              {remainingDays}
            </p>
            <p className="text-[11px] text-muted-foreground">من أصل {totalDays} يوم</p>
            <p className="text-[11px] text-muted-foreground">
              تنتهي في: {new Date(fiscalYear.end_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* نسبة الإنجاز الزمني */}
          <div className="text-center p-3 rounded-lg bg-muted/30 space-y-2">
            <span className="text-xs text-muted-foreground">التقدم الزمني</span>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{timeProgress}%</p>
            <Progress value={timeProgress} className="h-2 [&>div]:bg-primary" />
          </div>

          {/* نسبة الإنجاز المالي */}
          <div className="text-center p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">التحصيل المالي</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${financialProgress >= timeProgress ? 'text-success' : 'text-warning'}`}>
              {exceededTarget ? `${rawFinancialProgress}%` : `${financialProgress}%`}
            </p>
            {exceededTarget && (
              <Badge variant="outline" className="text-[10px] border-success text-success gap-1">
                <CheckCircle2 className="w-3 h-3" />
                تجاوز الهدف
              </Badge>
            )}
            <Progress value={financialProgress} className={`h-2 ${financialProgress >= timeProgress ? '[&>div]:bg-success' : '[&>div]:bg-warning'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiscalYearWidget;
