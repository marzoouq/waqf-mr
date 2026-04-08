/**
 * صفحة تشخيص النظام — 31 فحصاً في 7 بطاقات
 * متاحة للمسؤولين فقط عبر /dashboard/diagnostics
 */
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info, Download } from 'lucide-react';
import { sanitizeDiagnosticOutput } from '@/utils/diagnostics/sanitize';
import type { CheckResult, CheckStatus } from '@/utils/diagnostics/types';
import { useSystemDiagnostics } from '@/hooks/page/admin/settings/useSystemDiagnostics';

const WebVitalsPanel = lazy(() => import('@/components/diagnostics/WebVitalsPanel'));

interface Props {
  autoRun?: boolean;
}

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-success', label: 'ناجح' },
  warn: { icon: AlertTriangle, color: 'text-warning', label: 'تحذير' },
  fail: { icon: XCircle, color: 'text-destructive', label: 'فشل' },
  info: { icon: Info, color: 'text-info', label: 'معلومة' },
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
  const {
    running, runningCategory, lastRun,
    run, runSingle, exportResults,
    totalChecks, failures, warnings, allCategories,
    results,
  } = useSystemDiagnostics(autoRun);

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
          <Button onClick={run} disabled={running || !!runningCategory} size="sm">
            <RefreshCw className={`w-4 h-4 ml-2 ${running ? 'animate-spin' : ''}`} />
            {running ? 'جارٍ الفحص...' : 'تشغيل الكل'}
          </Button>
        </div>
      </div>

      {/* لوحة Core Web Vitals */}
      <Suspense fallback={null}>
        <WebVitalsPanel />
      </Suspense>

      {/* البطاقات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCategories.map((cat) => {
          const catFailures = cat.results?.filter(r => r.status === 'fail').length ?? 0;
          const catWarnings = cat.results?.filter(r => r.status === 'warn').length ?? 0;
          const isCatRunning = runningCategory === cat.title;
          return (
            <Card key={cat.title}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {cat.title}
                    {catFailures > 0 && <Badge variant="destructive" className="text-xs">{catFailures} فشل</Badge>}
                    {catWarnings > 0 && <Badge variant="secondary" className="text-xs">{catWarnings} تحذير</Badge>}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={running || !!runningCategory}
                    onClick={() => runSingle(cat.title)}
                    title={`تشغيل فحوصات ${cat.title}`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCatRunning ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {cat.results ? (
                  cat.results.map(r => <CheckRow key={r.id} result={r} />)
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {cat.checksCount} فحص — اضغط ▶ لتشغيل هذه البطاقة
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  if (autoRun) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  return content;
}
