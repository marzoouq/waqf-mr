/**
 * صفحة تشخيص النظام — 26 فحصاً في 6 بطاقات
 * متاحة للمسؤولين فقط عبر /dashboard/diagnostics
 */
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info, Download } from 'lucide-react';
import { runAllDiagnostics, type CheckResult, type CheckStatus } from '@/utils/diagnostics/checks';
import { sanitizeDiagnosticOutput } from '@/utils/diagnostics/sanitize';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { useAuth } from '@/hooks/useAuthContext';
import { logger } from '@/lib/logger';

interface Props {
  autoRun?: boolean;
}

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-green-600', label: 'ناجح' },
  warn: { icon: AlertTriangle, color: 'text-yellow-600', label: 'تحذير' },
  fail: { icon: XCircle, color: 'text-red-600', label: 'فشل' },
  info: { icon: Info, color: 'text-blue-600', label: 'معلومة' },
};

function CheckRow({ result }: { result: CheckResult }) {
  const config = STATUS_CONFIG[result.status];
  const Icon = config.icon;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{result.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-all">
          {sanitizeDiagnosticOutput(result.detail)}
        </p>
      </div>
      <Badge variant="outline" className={`shrink-0 text-xs ${config.color}`}>
        {config.label}
      </Badge>
    </div>
  );
}

export default function SystemDiagnosticsPage({ autoRun = true }: Props) {
  const { user } = useAuth();
  const [results, setResults] = useState<{ category: string; results: CheckResult[] }[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const output = await runAllDiagnostics();
      setResults(output);
      setLastRun(new Date());
      // تسجيل الحدث
      logAccessEvent({
        event_type: 'diagnostics_run',
        user_id: user?.id,
        target_path: '/dashboard/diagnostics',
        metadata: {
          totalChecks: output.reduce((s, c) => s + c.results.length, 0),
          failures: output.reduce((s, c) => s + c.results.filter(r => r.status === 'fail').length, 0),
        },
      });
    } catch (e) {
      logger.error('[Diagnostics] فشل التشغيل:', e);
    } finally {
      setRunning(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (autoRun) run();
  }, [autoRun, run]);

  const exportResults = useCallback(() => {
    const lines = results.flatMap(cat => [
      `\n═══ ${cat.category} ═══`,
      ...cat.results.map(r =>
        `[${r.status.toUpperCase()}] ${r.label}: ${sanitizeDiagnosticOutput(r.detail)}`
      ),
    ]);
    const text = `تقرير تشخيص النظام — ${new Date().toLocaleString('ar-SA')}\n${lines.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const totalChecks = results.reduce((s, c) => s + c.results.length, 0);
  const failures = results.reduce((s, c) => s + c.results.filter(r => r.status === 'fail').length, 0);
  const warnings = results.reduce((s, c) => s + c.results.filter(r => r.status === 'warn').length, 0);

  const content = (
    <div className="space-y-6">
      {/* شريط التحكم */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">تشخيص النظام</h1>
          {lastRun && (
            <p className="text-sm text-muted-foreground mt-1">
              آخر تشغيل: {lastRun.toLocaleString('ar-SA')} — {totalChecks} فحص | {failures} فشل | {warnings} تحذير
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportResults}>
              <Download className="w-4 h-4 ml-2" />
              تصدير
            </Button>
          )}
          <Button onClick={run} disabled={running} size="sm">
            <RefreshCw className={`w-4 h-4 ml-2 ${running ? 'animate-spin' : ''}`} />
            {running ? 'جارٍ الفحص...' : 'تشغيل الفحوصات'}
          </Button>
        </div>
      </div>

      {/* البطاقات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((cat) => {
          const catFailures = cat.results.filter(r => r.status === 'fail').length;
          const catWarnings = cat.results.filter(r => r.status === 'warn').length;
          return (
            <Card key={cat.category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {cat.category}
                  {catFailures > 0 && <Badge variant="destructive" className="text-xs">{catFailures} فشل</Badge>}
                  {catWarnings > 0 && <Badge variant="secondary" className="text-xs">{catWarnings} تحذير</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {cat.results.map(r => <CheckRow key={r.id} result={r} />)}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* حالة فارغة */}
      {results.length === 0 && !running && (
        <Card>
          <CardContent className="py-12 text-center">
            <Info className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">اضغط "تشغيل الفحوصات" لبدء التشخيص</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // عند استخدامه كصفحة كاملة (من الـ route)
  if (autoRun) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  // عند استخدامه داخل modal (من DiagnosticOverlay)
  return content;
}
