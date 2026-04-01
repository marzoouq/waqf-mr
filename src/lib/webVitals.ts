/**
 * قياس Core Web Vitals (LCP, CLS, INP) وتسجيلها في نظام المراقبة
 * يُستدعى مرة واحدة من main.tsx
 */
import { onLCP, onCLS, onINP, type Metric } from 'web-vitals';
import { logger } from '@/lib/logger';

/** حدود الأداء حسب توصيات Google */
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
};

/** آخر قيم مقاسة — متاحة للعرض في صفحة التشخيص */
const latestMetrics: Record<string, Metric> = {};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = THRESHOLDS[name];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value > t.poor) return 'poor';
  return 'needs-improvement';
}

function handleMetric(metric: Metric): void {
  latestMetrics[metric.name] = metric;

  const rating = getRating(metric.name, metric.value);
  const unit = metric.name === 'CLS' ? '' : 'ms';
  const val = metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value);

  const prefix = rating === 'poor' ? '🔴' : rating === 'needs-improvement' ? '🟡' : '🟢';
  logger.info(`[WebVitals] ${prefix} ${metric.name}: ${val}${unit} (${rating})`);
}

/** بدء قياس Core Web Vitals */
export function initWebVitals(): void {
  // لا نقيس في بيئة التطوير — HMR يشوّه القيم
  if (import.meta.env.DEV) return;

  onLCP(handleMetric);
  onCLS(handleMetric);
  onINP(handleMetric);
}

/** استرجاع آخر قيم مقاسة */
export function getWebVitalsMetrics(): Record<string, Metric> {
  return { ...latestMetrics };
}
