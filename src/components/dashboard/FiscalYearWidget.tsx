/**
 * D-3: ويدجت السنة المالية — أيام متبقية + نسبة إنجاز زمني + مالي.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import type { FiscalYear } from '@/types/database';

interface FiscalYearWidgetProps {
  fiscalYear: FiscalYear | null;
  totalIncome: number;
  contractualRevenue: number;
}

const FiscalYearWidget: React.FC<FiscalYearWidgetProps> = ({
  fiscalYear,
  totalIncome,
  contractualRevenue,
}) => {
  if (!fiscalYear || fiscalYear.status !== 'active') return null;

  const now = new Date();
  const start = new Date(fiscalYear.start_date);
  const end = new Date(fiscalYear.end_date);

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86_400_000));
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  const timeProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // نسبة الإنجاز المالي = الدخل الفعلي / الإيرادات التعاقدية
  const financialProgress = contractualRevenue > 0
    ? Math.min(100, Math.round((totalIncome / contractualRevenue) * 100))
    : 0;

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
            <p className={`text-2xl font-bold ${remainingDays <= 7 ? 'text-destructive' : remainingDays <= 30 ? 'text-warning' : 'text-foreground'}`}>
              {remainingDays}
            </p>
            <p className="text-[10px] text-muted-foreground">من أصل {totalDays} يوم</p>
            <p className="text-[10px] text-muted-foreground">
              تنتهي في: {new Date(fiscalYear.end_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* نسبة الإنجاز الزمني */}
          <div className="text-center p-3 rounded-lg bg-muted/30 space-y-2">
            <span className="text-xs text-muted-foreground">التقدم الزمني</span>
            <p className="text-2xl font-bold text-foreground">{timeProgress}%</p>
            <Progress value={timeProgress} className="h-2 [&>div]:bg-primary" />
          </div>

          {/* نسبة الإنجاز المالي */}
          <div className="text-center p-3 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">التحصيل المالي</span>
            </div>
            <p className={`text-2xl font-bold ${financialProgress >= timeProgress ? 'text-success' : 'text-warning'}`}>
              {financialProgress}%
            </p>
            <Progress value={financialProgress} className={`h-2 ${financialProgress >= timeProgress ? '[&>div]:bg-success' : '[&>div]:bg-warning'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiscalYearWidget;
