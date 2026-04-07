import { memo } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Link as LinkIcon, Banknote, TrendingDown, XCircle } from 'lucide-react';

interface DashboardAlertsProps {
  usingFallbackPct: boolean;
  expiringContractsCount: number;
  orphanedContractsCount: number;
  pendingAdvancesCount?: number;
  collectionRate?: number;
  expenseRatio?: number;
}

const DashboardAlerts = ({ usingFallbackPct, expiringContractsCount, orphanedContractsCount, pendingAdvancesCount = 0, collectionRate, expenseRatio = 0 }: DashboardAlertsProps) => {
  return (
    <>
      {/* 1. عجز مالي — أعلى أولوية */}
      {expenseRatio > 100 && (
        <Alert variant="destructive" className="animate-fade-in">
          <XCircle className="h-4 w-4" />
          <AlertTitle>تحذير: عجز مالي</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>المصروفات تتجاوز الدخل بنسبة {expenseRatio - 100}% — يُرجى مراجعة بنود المصروفات.</span>
            <Link to="/dashboard/expenses">
              <Button variant="outline" size="sm" className="shrink-0">مراجعة المصروفات</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 2. عقود بدون سنة مالية */}
      {orphanedContractsCount > 0 && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>عقود بدون سنة مالية</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>يوجد {orphanedContractsCount} عقد غير مربوط بسنة مالية. لن تظهر في التقارير المالية.</span>
            <Link to="/dashboard/contracts">
              <Button variant="outline" size="sm" className="gap-1 shrink-0">
                <LinkIcon className="w-3 h-3" />
                إدارة العقود
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 3. معدل تحصيل منخفض */}
      {collectionRate !== null && collectionRate !== undefined && collectionRate > 0 && collectionRate < 50 && (
        <Alert variant="destructive" className="animate-fade-in">
          <TrendingDown className="h-4 w-4" />
          <AlertTitle>معدل التحصيل منخفض</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>معدل التحصيل الحالي {collectionRate ?? 0}% — يُنصح بمراجعة الفواتير المتأخرة واتخاذ إجراء.</span>
            <Link to="/dashboard/contracts">
              <Button variant="outline" size="sm" className="shrink-0">مراجعة العقود</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 4. سُلف معلقة */}
      {pendingAdvancesCount > 0 && (
        <Alert className="animate-fade-in border-warning/50">
          <Banknote className="h-4 w-4" />
          <AlertTitle>سُلف بانتظار الموافقة</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>يوجد {pendingAdvancesCount} طلب سُلفة معلق بانتظار المراجعة والموافقة.</span>
            <Link to="/dashboard/accounts">
              <Button variant="outline" size="sm" className="shrink-0">مراجعة الطلبات</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 5. عقود تنتهي قريباً */}
      {expiringContractsCount > 0 && (
        <Alert className="animate-fade-in border-warning/50">
          <Clock className="h-4 w-4" />
          <AlertTitle>عقود تنتهي قريباً</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>{expiringContractsCount} عقد ينتهي خلال {EXPIRING_SOON_DAYS} يوماً القادمة.</span>
            <Link to="/dashboard/contracts">
              <Button variant="outline" size="sm" className="shrink-0">إدارة العقود</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* 6. نسب افتراضية */}
      {usingFallbackPct && (
        <Alert className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>نسب افتراضية مُستخدمة</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>يتم استخدام النسب الافتراضية (ناظر 10%، واقف 5%) لأنه لم يتم إعدادها في الحسابات الختامية.</span>
            <Link to="/dashboard/accounts">
              <Button variant="outline" size="sm" className="shrink-0">ضبط النسب</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default memo(DashboardAlerts);
