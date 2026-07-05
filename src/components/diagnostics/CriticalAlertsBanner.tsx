/**
 * CriticalAlertsBanner — بانر تنبيه فوري للناظر عند حوادث حرجة
 * يُوضع في أعلى AdminDashboard ويستمع لـ Realtime على access_log.
 */
import { useNavigate } from 'react-router-dom';
import { useCriticalAlerts } from '@/hooks/data/diagnostics/useCriticalAlerts';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertOctagon } from 'lucide-react';

export default function CriticalAlertsBanner() {
  const { hasCritical, criticalItems, criticalCount } = useCriticalAlerts();
  const navigate = useNavigate();

  if (!hasCritical) return null;

  return (
    <Alert variant="destructive" className="border-2 animate-in fade-in slide-in-from-top-2">
      <AlertOctagon className="w-5 h-5" />
      <AlertTitle className="flex items-center justify-between gap-2">
        <span>{criticalCount} تنبيه أمني حرج يستدعي الانتباه الفوري</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/dashboard/diagnostics')}
          className="shrink-0"
        >
          افتح مركز التشخيص
        </Button>
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1 text-sm">
          {criticalItems.slice(0, 3).map((r) => (
            <li key={r.id}>• {r.title}</li>
          ))}
          {criticalItems.length > 3 && (
            <li className="text-xs opacity-75">…و {criticalItems.length - 3} تنبيه إضافي</li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
