import { EXPIRING_SOON_DAYS } from '@/constants';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Link as LinkIcon, Banknote, TrendingDown } from 'lucide-react';

interface OrphanedContract {
  id: string;
  contract_number: string;
}

interface ExpiringContract {
  contract_number: string;
}

interface DashboardAlertsProps {
  usingFallbackPct: boolean;
  expiringContracts: ExpiringContract[];
  orphanedContracts: OrphanedContract[];
  pendingAdvancesCount?: number;
  collectionRate?: number;
}

const DashboardAlerts = ({ usingFallbackPct, expiringContracts, orphanedContracts, pendingAdvancesCount = 0, collectionRate }: DashboardAlertsProps) => {
  return (
    <>
      {/* سُلف معلقة */}
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

      {/* معدل تحصيل منخفض */}
      {collectionRate != null && collectionRate > 0 && collectionRate < 50 && (
        <Alert variant="destructive" className="animate-fade-in">
          <TrendingDown className="h-4 w-4" />
          <AlertTitle>معدل التحصيل منخفض</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>معدل التحصيل الحالي {collectionRate}% — يُنصح بمراجعة الفواتير المتأخرة واتخاذ إجراء.</span>
            <Link to="/dashboard/contracts">
              <Button variant="outline" size="sm" className="shrink-0">مراجعة العقود</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* نسب افتراضية */}
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

      {/* عقود تنتهي قريباً */}
      {expiringContracts.length > 0 && (
        <Alert className="animate-fade-in border-warning/50">
          <Clock className="h-4 w-4" />
          <AlertTitle>عقود تنتهي قريباً</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>{expiringContracts.length} عقد ينتهي خلال {EXPIRING_SOON_DAYS} يوماً القادمة ({expiringContracts.map(c => c.contract_number).join('، ')})</span>
            <Link to="/dashboard/contracts">
              <Button variant="outline" size="sm" className="shrink-0">إدارة العقود</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* عقود بدون سنة مالية */}
      {orphanedContracts.length > 0 && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>عقود بدون سنة مالية</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>يوجد {orphanedContracts.length} عقد غير مربوط بسنة مالية ({orphanedContracts.map(c => c.contract_number).join('، ')}). لن تظهر في التقارير المالية.</span>
            <Link to="/dashboard/contracts">
              <Button variant="outline" size="sm" className="gap-1 shrink-0">
                <LinkIcon className="w-3 h-3" />
                إدارة العقود
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default DashboardAlerts;
