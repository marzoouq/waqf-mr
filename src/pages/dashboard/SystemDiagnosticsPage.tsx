/**
 * صفحة تشخيص النظام — مركز شامل بتبويبات
 * متاحة للمسؤولين فقط عبر /dashboard/diagnostics
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info, Download, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeDiagnosticOutput } from '@/lib/diagnostics/sanitize';
import type { CheckResult, CheckStatus } from '@/lib/diagnostics/types';
import { useSystemDiagnostics } from '@/hooks/page/admin/management/useSystemDiagnostics';
import { runDeepClean } from '@/lib/diagnostics/deepClean';
import { logger } from '@/lib/logger';
import { fmtDateTime } from '@/utils/format/format';
import HealthSummaryCard from '@/components/diagnostics/HealthSummaryCard';
import AppMapTree from '@/components/diagnostics/AppMapTree';
import InteractionsTable from '@/components/diagnostics/InteractionsTable';
import RunHistoryList from '@/components/diagnostics/RunHistoryList';
import NotificationFallbackCard from '@/components/diagnostics/NotificationFallbackCard';
import BackendLogTable from '@/components/diagnostics/BackendLogTable';
import StatusFilterChips, { type StatusFilter } from '@/components/diagnostics/StatusFilterChips';
import DeepCleanConfirmDialog from '@/components/diagnostics/DeepCleanConfirmDialog';

const WebVitalsPanel = lazy(() => import('@/components/common/feedback/WebVitalsPanel'));

interface Props { autoRun?: boolean }

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-success', label: 'ناجح' },
  warn: { icon: AlertTriangle, color: 'text-warning', label: 'تحذير' },
  fail: { icon: XCircle, color: 'text-destructive', label: 'فشل' },
  info: { icon: Info, color: 'text-info', label: 'معلومة' },
};

function CheckRow({ result }: { result: CheckResult }) {
  const cfg = STATUS_CONFIG[result.status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{result.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-all">{sanitizeDiagnosticOutput(result.detail)}</p>
      </div>
      <Badge variant="outline" className={`shrink-0 text-xs ${cfg.color}`}>{cfg.label}</Badge>
    </div>
  );
}

export default function SystemDiagnosticsPage({ autoRun = true }: Props) {
  const d = useSystemDiagnostics(autoRun);
  const { running, runningCategory, lastRun, progress, run, runSingle, exportJson, exportText, clearAll, rerunFailures, rerunFailuresAndWarnings, summary, allCategories, results } = d;
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [cleanDialog, setCleanDialog] = useState<null | 'light' | 'deep'>(null);
  const [deepCleaning, setDeepCleaning] = useState(false);
  const queryClient = useQueryClient();

  const filterCounts = useMemo(() => {
    const c: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0, info: 0 };
    for (const cat of results) for (const r of cat.results) c[r.status]++;
    return c;
  }, [results]);

  const handleLightClean = () => {
    clearAll();
    setCleanDialog(null);
    toast.success('تم تنظيف نتائج التشخيص وإعادة ضبط الواجهات');
  };

  const handleDeepClean = async () => {
    setDeepCleaning(true);
    try {
      const report = await runDeepClean({ queryClient });
      const msg = `تم التنظيف العميق: مفاتيح ${report.localStorageKeysCleared + report.sessionStorageKeysCleared}، SW ${report.serviceWorkersUnregistered}، Cache ${report.cachesDeleted.length}، IDB ${report.indexedDbsDeleted.length}. سيُعاد التحميل...`;
      if (report.errors.length > 0) {
        logger.warn('[DeepClean] أخطاء جزئية:', report.errors);
        toast.warning(`${msg} (${report.errors.length} تحذير)`);
      } else {
        toast.success(msg);
      }
      setCleanDialog(null);
      window.setTimeout(() => window.location.reload(), 2500);
    } catch (e) {
      logger.error('[DeepClean] فشل:', e);
      toast.error('فشل التنظيف العميق — راجع السجل');
      setDeepCleaning(false);
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">مركز تشخيص النظام</h1>
          {lastRun && (
            <p className="text-sm text-muted-foreground mt-1">
              آخر تشغيل: {fmtDateTime(lastRun)} — درجة الصحة: {summary.healthScore}/100
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {results.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 ml-2" />تصدير<ChevronDown className="w-3 h-3 mr-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportJson}>تصدير JSON (مع روابط ومصادر)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportText}>تصدير نص</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {results.length > 0 && (summary.fail > 0 || summary.warn > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={running}><RefreshCw className="w-4 h-4 ml-2" />إعادة فحص<ChevronDown className="w-3 h-3 mr-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={rerunFailures} disabled={summary.fail === 0}>إعادة الفاشلة فقط ({summary.fail})</DropdownMenuItem>
                <DropdownMenuItem onClick={rerunFailuresAndWarnings} disabled={summary.fail + summary.warn === 0}>إعادة الفاشلة والتحذيرات ({summary.fail + summary.warn})</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={running || deepCleaning}>
                <Trash2 className="w-4 h-4 ml-2" />تنظيف<ChevronDown className="w-3 h-3 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCleanDialog('light')}>تنظيف خفيف (نتائج التشخيص)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCleanDialog('deep')}>تنظيف عميق (كاش + SW + IDB)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog open={cleanDialog === 'light'} onOpenChange={(o) => !o && setCleanDialog(null)}>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>تنظيف نتائج التشخيص</AlertDialogTitle>
                <AlertDialogDescription>
                  سيُمسح أرشيف التشغيلات والنتائج الحالية وعلامات التحذيرات المرفوضة. لا يؤثر على بيانات النظام الفعلية.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); handleLightClean(); }}>
                  تأكيد
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DeepCleanConfirmDialog
            open={cleanDialog === 'deep'}
            busy={deepCleaning}
            onCancel={() => setCleanDialog(null)}
            onConfirm={() => void handleDeepClean()}
          />
          <Button onClick={run} disabled={running || !!runningCategory} size="sm">
            <RefreshCw className={`w-4 h-4 ml-2 ${running ? 'animate-spin' : ''}`} />
            {running ? 'جارٍ الفحص...' : 'تشغيل الكل'}
          </Button>
        </div>
      </div>

      {running && progress && progress.total > 0 && (
        <Card>
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">يفحص: <span className="text-foreground font-medium">{progress.current}</span></span>
              <span className="font-mono text-xs">{progress.done} / {progress.total}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="checks">الفحوصات</TabsTrigger>
          <TabsTrigger value="backend">سجل Backend</TabsTrigger>
          <TabsTrigger value="appmap">خريطة التطبيق</TabsTrigger>
          <TabsTrigger value="interactions">التفاعلات</TabsTrigger>
          <TabsTrigger value="performance">الأداء الحي</TabsTrigger>
          <TabsTrigger value="history">السجل والتصدير</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <NotificationFallbackCard />
          {results.length > 0 ? (
            <HealthSummaryCard summary={summary} categories={results} />
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">شغّل الفحص لعرض ملخص الصحة.</CardContent></Card>
          )}
          <Suspense fallback={null}><WebVitalsPanel /></Suspense>
        </TabsContent>

        <TabsContent value="checks">
          {results.length > 0 && <StatusFilterChips value={filter} onChange={setFilter} counts={filterCounts} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allCategories.map(cat => {
              const visible = cat.results ? (filter === 'all' ? cat.results : cat.results.filter(r => r.status === filter)) : null;
              if (cat.results && visible && visible.length === 0) return null;
              const catFailures = cat.results?.filter(r => r.status === 'fail').length ?? 0;
              const catWarnings = cat.results?.filter(r => r.status === 'warn').length ?? 0;
              const isCatRunning = runningCategory === cat.title;
              return (
                <Card key={cat.title}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{cat.title}</span>
                        {catFailures > 0 && <Badge variant="destructive" className="text-xs">{catFailures} فشل</Badge>}
                        {catWarnings > 0 && <Badge variant="secondary" className="text-xs">{catWarnings} تحذير</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={running || !!runningCategory} onClick={() => runSingle(cat.title)} title={`تشغيل ${cat.title}`} aria-label={`تشغيل ${cat.title}`}>
                        <RefreshCw className={`w-3.5 h-3.5 ${isCatRunning ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    {visible ? visible.map(r => <CheckRow key={r.id} result={r} />) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{cat.checksCount} فحص — اضغط ▶ لتشغيلها</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="backend"><BackendLogTable results={results} /></TabsContent>
        <TabsContent value="appmap"><AppMapTree /></TabsContent>
        <TabsContent value="interactions"><InteractionsTable /></TabsContent>
        <TabsContent value="performance"><Suspense fallback={null}><WebVitalsPanel /></Suspense></TabsContent>
        <TabsContent value="history"><RunHistoryList /></TabsContent>
      </Tabs>
    </div>
  );

  if (autoRun) return <DashboardLayout>{content}</DashboardLayout>;
  return content;
}
