/**
 * صفحة تشخيص النظام — مركز شامل بتبويبات
 * متاحة للمسؤولين فقط عبر /dashboard/diagnostics
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { CheckStatus } from '@/lib/diagnostics/types';
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
import { type StatusFilter } from '@/components/diagnostics/StatusFilterChips';
import DiagnosticsToolbar from '@/components/diagnostics/DiagnosticsToolbar';
import DiagnosticsChecksGrid from '@/components/diagnostics/DiagnosticsChecksGrid';

const WebVitalsPanel = lazy(() => import('@/components/common/feedback/WebVitalsPanel'));

interface Props { autoRun?: boolean }

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
        <DiagnosticsToolbar
          hasResults={results.length > 0} running={running} runningCategory={runningCategory}
          deepCleaning={deepCleaning} summary={{ fail: summary.fail, warn: summary.warn }}
          cleanDialog={cleanDialog} setCleanDialog={setCleanDialog}
          onRunAll={run} onExportJson={exportJson} onExportText={exportText}
          onRerunFailures={rerunFailures} onRerunFailuresAndWarnings={rerunFailuresAndWarnings}
          onLightClean={handleLightClean} onDeepClean={() => void handleDeepClean()}
        />
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
          <DiagnosticsChecksGrid
            allCategories={allCategories}
            filter={filter} setFilter={setFilter} filterCounts={filterCounts}
            hasResults={results.length > 0} running={running} runningCategory={runningCategory}
            onRunSingle={runSingle}
          />
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
