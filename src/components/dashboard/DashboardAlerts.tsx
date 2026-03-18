import { EXPIRING_SOON_DAYS } from '@/constants';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Link as LinkIcon } from 'lucide-react';

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
}

const DashboardAlerts = ({ usingFallbackPct, expiringContracts, orphanedContracts }: DashboardAlertsProps) => {
  return (
    <>
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
