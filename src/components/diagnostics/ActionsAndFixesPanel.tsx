/**
 * ActionsAndFixesPanel — توصيات ذكية + إصلاحات فورية تعمل فعلياً
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSmartRecommendations, type RecommendationAction } from '@/hooks/data/diagnostics/useSmartRecommendations';
import {
  clearQueryCache, unregisterServiceWorker, forceTokenRefresh, hardReload, resetRealtimeChannels,
  purgeOldClientErrors, testAllEdgeFunctions,
} from '@/lib/diagnostics/fixActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, Wrench, RefreshCw, Trash2, Zap, LogIn, RadioTower, RotateCw, Eraser, Gauge } from 'lucide-react';
import { toast } from 'sonner';

const SEV_ICON = { critical: AlertCircle, warning: AlertTriangle, info: Info } as const;
const SEV_COLOR = { critical: 'text-destructive', warning: 'text-amber-500', info: 'text-primary' } as const;

export default function ActionsAndFixesPanel() {
  const { recommendations, isLoading, criticalCount, warningCount, refetch } = useSmartRecommendations();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const runAction = async (id: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(id);
    try {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } finally {
      setBusy(null);
    }
  };

  const handleRecommendationAction = (action?: RecommendationAction) => {
    if (!action || action === 'none') return;
    if (action === 'goto_users') navigate('/dashboard/user-management');
    else if (action === 'goto_audit') navigate('/dashboard/audit-log');
    else if (action === 'clear_cache') void runAction('clear', () => clearQueryCache(qc));
    else if (action === 'unregister_sw') void runAction('sw', () => unregisterServiceWorker());
    else if (action === 'refresh_token') void runAction('token', () => forceTokenRefresh());
    else if (action === 'reset_realtime') void runAction('rt', () => resetRealtimeChannels());
    else if (action === 'hard_reload') void runAction('reload', () => hardReload());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            التوصيات الذكية
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} حرج</Badge>}
            {warningCount > 0 && <Badge variant="default">{warningCount} تحذير</Badge>}
            <Button variant="ghost" size="sm" className="mr-auto" onClick={refetch}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">جاري التحليل...</p>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((r) => {
                const Icon = SEV_ICON[r.severity];
                return (
                  <li key={r.id} className="border rounded-lg p-3 flex items-start gap-3">
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${SEV_COLOR[r.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{r.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                    {r.action && r.action !== 'none' && (
                      <Button size="sm" variant="outline" onClick={() => handleRecommendationAction(r.action)}>
                        {r.actionLabel ?? 'تنفيذ'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إصلاحات فورية (تعمل فعلياً)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <FixButton icon={Trash2} label="مسح كاش الاستعلامات" busy={busy === 'clear'} onClick={() => void runAction('clear', () => clearQueryCache(qc))} />
          <FixButton icon={Zap} label="إلغاء تسجيل Service Worker" busy={busy === 'sw'} onClick={() => void runAction('sw', () => unregisterServiceWorker())} />
          <FixButton icon={LogIn} label="تحديث جلسة المصادقة" busy={busy === 'token'} onClick={() => void runAction('token', () => forceTokenRefresh())} />
          <FixButton icon={RadioTower} label="إعادة ضبط Realtime" busy={busy === 'rt'} onClick={() => void runAction('rt', () => resetRealtimeChannels())} />
          <FixButton icon={Eraser} label="حذف أخطاء العملاء القديمة (>30 يوم)" busy={busy === 'purge'} onClick={() => void runAction('purge', () => purgeOldClientErrors())} />
          <FixButton icon={Gauge} label="اختبار latency لكل Edge Functions" busy={busy === 'ping'} onClick={() => void runAction('ping', () => testAllEdgeFunctions())} />
          <FixButton icon={RotateCw} label="إعادة تحميل قسرية" busy={busy === 'reload'} onClick={() => void runAction('reload', () => hardReload())} variant="destructive" />
        </CardContent>
      </Card>
    </div>
  );
}

function FixButton({ icon: Icon, label, busy, onClick, variant = 'outline' }: { icon: React.ElementType; label: string; busy: boolean; onClick: () => void; variant?: 'outline' | 'destructive' }) {
  return (
    <Button variant={variant} onClick={onClick} disabled={busy} className="justify-start gap-2 h-auto py-3">
      <Icon className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
      <span>{label}</span>
    </Button>
  );
}
