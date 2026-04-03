/**
 * مراقبة أداء استعلامات TanStack Query — تتبع بطء الاستعلامات
 */
import { logger } from '@/lib/logger';

const SLOW_QUERY_THRESHOLD_MS = 5000;

export interface PerfEntry {
  label: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

const recentSlowQueries: PerfEntry[] = [];

/** خيارات اختيارية للتنبيه */
export interface PerfTimerOptions {
  onSlow?: (msg: string, opts?: { description?: string }) => void;
}

/** يبدأ قياس أداء عملية ويُعيد دالة لإنهائها */
export function startPerfTimer(label: string, options?: PerfTimerOptions): () => void {
  const entry: PerfEntry = { label, startTime: performance.now() };

  return () => {
    entry.endTime = performance.now();
    entry.durationMs = entry.endTime - entry.startTime;

    if (entry.durationMs > SLOW_QUERY_THRESHOLD_MS) {
      const durationSec = (entry.durationMs / 1000).toFixed(1);
      logger.warn(`[Perf] عملية بطيئة: "${label}" استغرقت ${Math.round(entry.durationMs)}ms`);
      recentSlowQueries.push(entry);

      options?.onSlow?.('⚠️ عملية بطيئة', {
        description: `"${label}" استغرقت ${durationSec} ثانية`,
      });

      if (recentSlowQueries.length > 50) recentSlowQueries.shift();
    }
  };
}

/** قائمة العمليات البطيئة الأخيرة */
export function getSlowQueries(): readonly PerfEntry[] {
  return recentSlowQueries;
}

/** مسح السجل — يُستدعى عند تسجيل الخروج */
export function clearSlowQueries(): void {
  recentSlowQueries.length = 0;
}

/** قياس وقت تحميل الصفحة */
export function reportPageLoadMetrics(): void {
  if (typeof window === 'undefined' || !window.performance) return;
  if (import.meta.env.DEV) return;

  const measureLoad = () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;

    const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
    const domInteractive = Math.round(nav.domInteractive - nav.startTime);

    if (loadTime > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[Perf] تحميل الصفحة بطيء: ${loadTime}ms (DOM interactive: ${domInteractive}ms)`);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(measureLoad);
    return;
  }

  (window as unknown as { setTimeout: typeof setTimeout }).setTimeout(measureLoad, 3000);
}
