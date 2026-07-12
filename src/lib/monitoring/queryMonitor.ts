/**
 * مراقبة أداء استعلامات TanStack Query — تتبع بطء الاستعلامات
 * مع حماية ضد قفزات performance.now() عند تعليق التبويب في الخلفية.
 */
import { logger } from '@/lib/logger';

// عتبات القياس بالميلي ثانية
const WARN_THRESHOLD_MS = 3000;
const SLOW_THRESHOLD_MS = 5000;
// عتبة أعلى لـ Edge Functions لأن cold-start يتجاوز 5 ثوانٍ بشكل طبيعي
const INVOKE_SLOW_THRESHOLD_MS = 10000;
// أي قياس يتجاوز هذا الحد يُعتبر ناتجاً عن تعليق التبويب — يُهمَل
const IGNORE_ABOVE_MS = 60_000;

export interface PerfEntry {
  label: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

const recentSlowQueries: PerfEntry[] = [];

/** يتتبع آخر لحظة أصبح فيها التبويب مخفياً — لإسقاط القياسات المتأثرة */
let lastHiddenAt = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') lastHiddenAt = performance.now();
  });
}

export interface PerfTimerOptions {
  onSlow?: (msg: string, opts?: { description?: string }) => void;
}

/** يبدأ قياس أداء عملية ويُعيد دالة لإنهائها */
export function startPerfTimer(label: string, options?: PerfTimerOptions): () => void {
  const entry: PerfEntry = { label, startTime: performance.now() };
  const startedAt = entry.startTime;

  return () => {
    entry.endTime = performance.now();
    entry.durationMs = entry.endTime - entry.startTime;

    // إسقاط القياسات المتأثرة بتعليق التبويب
    if (entry.durationMs > IGNORE_ABOVE_MS || lastHiddenAt > startedAt) return;

    const slowThreshold = label.startsWith('invoke:') ? INVOKE_SLOW_THRESHOLD_MS : SLOW_THRESHOLD_MS;

    if (entry.durationMs > slowThreshold) {
      const durationSec = (entry.durationMs / 1000).toFixed(1);
      logger.error(`[Perf] عملية بطيئة جداً: "${label}" استغرقت ${Math.round(entry.durationMs)}ms`);
      recentSlowQueries.push(entry);

      options?.onSlow?.('⚠️ عملية بطيئة', {
        description: `"${label}" استغرقت ${durationSec} ثانية`,
      });

      if (recentSlowQueries.length > 50) recentSlowQueries.shift();
    } else if (entry.durationMs > WARN_THRESHOLD_MS) {
      logger.warn(`[Perf] عملية بطيئة: "${label}" استغرقت ${Math.round(entry.durationMs)}ms`);
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

    if (loadTime > SLOW_THRESHOLD_MS) {
      logger.warn(`[Perf] تحميل الصفحة بطيء: ${loadTime}ms (DOM interactive: ${domInteractive}ms)`);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(measureLoad);
    return;
  }

  (window as unknown as { setTimeout: typeof setTimeout }).setTimeout(measureLoad, 3000);
}
