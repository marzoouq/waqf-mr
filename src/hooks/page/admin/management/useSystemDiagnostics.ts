/**
 * هوك صفحة التشخيص — يستخرج كل المنطق (تشغيل، تصدير، إعادة فاشلة، أرشيف)
 */
import { useState, useEffect, useCallback } from 'react';
import { runAllDiagnostics, runCategoryDiagnostics, runByIds, diagnosticCategories, type CheckResult } from '@/lib/diagnostics/checks';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { logger } from '@/lib/logger';
import { downloadJson, downloadText, computeSummary, collectFailedIds, type CategoryResults } from '@/lib/diagnostics/exporters';
import { pushRun } from '@/lib/diagnostics/history';

export const useSystemDiagnostics = (autoRun = true) => {
  const { user } = useAuth();
  const [results, setResults] = useState<CategoryResults[]>([]);
  const [running, setRunning] = useState(false);
  const [runningCategory, setRunningCategory] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);

  const persistRun = useCallback((output: CategoryResults[]) => {
    const s = computeSummary(output);
    pushRun({ total: s.total, pass: s.pass, warn: s.warn, fail: s.fail, info: s.info, healthScore: s.healthScore });
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setProgress({ done: 0, total: 0, current: '' });
    try {
      const output = await runAllDiagnostics({ onProgress: (info) => setProgress(info) });
      setResults(output);
      setLastRun(new Date());
      persistRun(output);
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
  }, [user, persistRun]);

  const runSingle = useCallback(async (categoryTitle: string) => {
    setRunningCategory(categoryTitle);
    try {
      const output = await runCategoryDiagnostics(categoryTitle);
      if (!output) return;
      setResults(prev => {
        const idx = prev.findIndex(c => c.category === categoryTitle);
        if (idx >= 0) { const next = [...prev]; next[idx] = output; return next; }
        return [...prev, output];
      });
      setLastRun(new Date());
    } catch (e) {
      logger.error(`[Diagnostics] فشل تشغيل ${categoryTitle}:`, e);
    } finally {
      setRunningCategory(null);
    }
  }, []);

  const rerunByStatus = useCallback(async (includeWarn: boolean) => {
    const ids = collectFailedIds(results, includeWarn);
    if (ids.length === 0) return;
    setRunning(true);
    try {
      const partial = await runByIds(ids);
      setResults(prev => {
        const next = [...prev];
        for (const p of partial) {
          const idx = next.findIndex(c => c.category === p.category);
          if (idx >= 0) {
            const current = next[idx];
            if (!current) continue;
            const merged = current.results.map(r => p.results.find(pr => pr.id === r.id) ?? r);
            next[idx] = { category: current.category, results: merged };
          }
        }
        return next;
      });
      setLastRun(new Date());
    } catch (e) {
      logger.error('[Diagnostics] فشل إعادة الفحص:', e);
    } finally { setRunning(false); }
  }, [results]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- autoRun behavior is intentional initial mount side-effect
    if (autoRun) run();
  }, [autoRun, run]);

  const exportJson = useCallback(() => downloadJson(results), [results]);
  const exportText = useCallback(() => downloadText(results), [results]);

  const summary = computeSummary(results);
  const allCategories = diagnosticCategories.map(cat => {
    const found = results.find(r => r.category === cat.title);
    return { title: cat.title, results: found?.results ?? null, checksCount: cat.checks.length };
  });

  return {
    results, running, runningCategory, lastRun, progress,
    run, runSingle, exportJson, exportText,
    rerunFailures: () => rerunByStatus(false),
    rerunFailuresAndWarnings: () => rerunByStatus(true),
    totalChecks: summary.total, failures: summary.fail, warnings: summary.warn,
    summary, allCategories,
  };
};
