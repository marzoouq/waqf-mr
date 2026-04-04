/**
 * هوك صفحة التشخيص — يستخرج كل المنطق (تشغيل، تصدير، نتائج)
 */
import { useState, useEffect, useCallback } from 'react';
import { runAllDiagnostics, runCategoryDiagnostics, diagnosticCategories, type CheckResult } from '@/utils/diagnostics/checks';
import { sanitizeDiagnosticOutput } from '@/utils/diagnostics/sanitize';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { logger } from '@/lib/logger';

export const useSystemDiagnostics = (autoRun = true) => {
  const { user } = useAuth();
  const [results, setResults] = useState<{ category: string; results: CheckResult[] }[]>([]);
  const [running, setRunning] = useState(false);
  const [runningCategory, setRunningCategory] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const output = await runAllDiagnostics();
      setResults(output);
      setLastRun(new Date());
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

  const runSingle = useCallback(async (categoryTitle: string) => {
    setRunningCategory(categoryTitle);
    try {
      const output = await runCategoryDiagnostics(categoryTitle);
      if (!output) return;
      setResults(prev => {
        const idx = prev.findIndex(c => c.category === categoryTitle);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = output;
          return next;
        }
        return [...prev, output];
      });
      setLastRun(new Date());
    } catch (e) {
      logger.error(`[Diagnostics] فشل تشغيل ${categoryTitle}:`, e);
    } finally {
      setRunningCategory(null);
    }
  }, []);

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

  const allCategories = diagnosticCategories.map(cat => {
    const found = results.find(r => r.category === cat.title);
    return { title: cat.title, results: found?.results ?? null, checksCount: cat.checks.length };
  });

  return {
    results, running, runningCategory, lastRun,
    run, runSingle, exportResults,
    totalChecks, failures, warnings, allCategories,
  };
};
