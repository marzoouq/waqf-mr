/**
 * مراقبة أداء أساسية — تتبع بطء الاستعلامات وتحذر عند تجاوز الحد
 */
import { logger } from '@/lib/logger';

const SLOW_QUERY_THRESHOLD_MS = 3000;

interface PerfEntry {
  label: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

const recentSlowQueries: PerfEntry[] = [];

/**
 * يبدأ قياس أداء عملية معينة ويُعيد دالة لإنهائها
 */
export function startPerfTimer(label: string): () => void {
  const entry: PerfEntry = { label, startTime: performance.now() };

  return () => {
    entry.endTime = performance.now();
    entry.durationMs = entry.endTime - entry.startTime;

    if (entry.durationMs > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[Perf] عملية بطيئة: "${label}" استغرقت ${Math.round(entry.durationMs)}ms`);
      recentSlowQueries.push(entry);
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

  // تأجيل القياس ليتم بعد اكتمال التحميل
  requestIdleCallback?.(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;

    const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
    const domInteractive = Math.round(nav.domInteractive - nav.startTime);

    if (loadTime > 5000) {
      logger.warn(`[Perf] تحميل الصفحة بطيء: ${loadTime}ms (DOM interactive: ${domInteractive}ms)`);
    }
  }) ?? setTimeout(() => {
    // fallback if requestIdleCallback not available
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;
    const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
    if (loadTime > 5000) {
      logger.warn(`[Perf] تحميل الصفحة بطيء: ${loadTime}ms`);
    }
  }, 3000);
}
