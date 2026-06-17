/**
 * بطاقة تعرض حالة إذن الإشعارات و polling البديل.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, BellOff, RefreshCw } from 'lucide-react';
import {
  getNotificationFallbackState,
  requestPermissionAgain,
  tickPoll,
  type NotifPermission,
} from '@/lib/notifications/fallbackPolling';

const PERMISSION_LABEL: Record<NotifPermission, { label: string; cls: string }> = {
  granted: { label: 'مسموح', cls: 'text-success' },
  denied: { label: 'مرفوض', cls: 'text-destructive' },
  default: { label: 'لم يُحدد', cls: 'text-warning' },
  unsupported: { label: 'غير مدعوم', cls: 'text-muted-foreground' },
};

function relative(d: Date | null): string {
  if (!d) return '—';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `منذ ${sec} ثانية`;
  if (sec < 3600) return `منذ ${Math.floor(sec / 60)} دقيقة`;
  return `منذ ${Math.floor(sec / 3600)} ساعة`;
}

export default function NotificationFallbackCard() {
  const [state, setState] = useState(getNotificationFallbackState);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!state.pollingActive) return;
    const id = window.setInterval(() => {
      tickPoll();
      setState(getNotificationFallbackState());
    }, state.pollIntervalSec * 1000);
    return () => window.clearInterval(id);
  }, [state.pollingActive, state.pollIntervalSec]);

  // إعادة عرض كل 10ث لتحديث "منذ ..."
  useEffect(() => {
    const id = window.setInterval(() => setState(getNotificationFallbackState()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const onRequest = async () => {
    setRequesting(true);
    await requestPermissionAgain();
    setState(getNotificationFallbackState());
    setRequesting(false);
  };

  const cfg = PERMISSION_LABEL[state.permission];
  const Icon = state.permission === 'granted' ? BellRing : BellOff;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${cfg.cls}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold">إذن الإشعارات</p>
            <p className="text-xs text-muted-foreground">
              الحالة: <span className={cfg.cls}>{cfg.label}</span>
              {state.pollingActive && (
                <> — polling كل {state.pollIntervalSec}ث — آخر نبضة: {relative(state.lastPollAt)}</>
              )}
            </p>
          </div>
          {state.permission !== 'granted' && state.permission !== 'unsupported' && (
            <Button size="sm" variant="outline" onClick={onRequest} disabled={requesting}>
              <RefreshCw className={`w-4 h-4 me-2 ${requesting ? 'animate-spin' : ''}`} />
              طلب الإذن مجدداً
            </Button>
          )}
          <Badge variant={state.pollingActive ? 'secondary' : 'outline'} className="text-xs">
            {state.pollingActive ? 'polling نشط' : 'إشعارات فورية'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
