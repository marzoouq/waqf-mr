/**
 * مراقبة أداء شاملة — تتبع بطء الاستعلامات وتنبّه المستخدم عند تجاوز الحد (5 ثوانٍ)
 */
import { logger } from '@/lib/logger';

const SLOW_QUERY_THRESHOLD_MS = 5000;

interface PerfEntry {
  label: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

const recentSlowQueries: PerfEntry[] = [];

/** خيارات اختيارية للتنبيه — تُمرر عند الاستدعاء بدلاً من global state */
interface PerfTimerOptions {
  onSlow?: (msg: string, opts?: { description?: string }) => void;
}

/**
 * يبدأ قياس أداء عملية معينة ويُعيد دالة لإنهائها
 */
export function startPerfTimer(label: string, options?: PerfTimerOptions): () => void {
  const entry: PerfEntry = { label, startTime: performance.now() };

  return () => {
    entry.endTime = performance.now();
    entry.durationMs = entry.endTime - entry.startTime;

    if (entry.durationMs > SLOW_QUERY_THRESHOLD_MS) {
      const durationSec = (entry.durationMs / 1000).toFixed(1);
      logger.warn(`[Perf] عملية بطيئة: "${label}" استغرقت ${Math.round(entry.durationMs)}ms`);
      recentSlowQueries.push(entry);

      // تنبيه المستخدم عبر callback
      options?.onSlow?.('⚠️ عملية بطيئة', {
        description: `"${label}" استغرقت ${durationSec} ثانية`,
      });

      // احتفظ بآخر 50 فقط
      if (recentSlowQueries.length > 50) recentSlowQueries.shift();
    }
  };
}

/**
 * يُعيد قائمة بالعمليات البطيئة الأخيرة (للتشخيص)
 */
export function getSlowQueries(): readonly PerfEntry[] {
  return recentSlowQueries;
}

/**
 * يمسح سجل العمليات البطيئة — يُستدعى عند تسجيل الخروج لمنع تسرب بيانات بين المستخدمين
 */
export function clearSlowQueries(): void {
  recentSlowQueries.length = 0;
}

/**
 * يقيس وقت تحميل الصفحة ويسجل التحذيرات
 */
export function reportPageLoadMetrics(): void {
  if (typeof window === 'undefined' || !window.performance) return;

  // في بيئة التطوير، Vite يضخّم loadEventEnd بسبب HMR — تجاهل القياس
  if (import.meta.env.DEV) return;

  // تأجيل القياس ليتم بعد اكتمال التحميل
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
