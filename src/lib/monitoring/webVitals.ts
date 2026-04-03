/**
 * تهيئة ومراقبة Core Web Vitals (LCP, CLS, INP, FCP, TTFB)
 * يُخزّن آخر قراءة لكل مؤشر في الذاكرة ويُصدّرها لصفحة التشخيص
 */
import type { Metric } from 'web-vitals';

export interface VitalsSnapshot {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  updatedAt: number;
}

const snapshot: VitalsSnapshot = {
  lcp: null,
  cls: null,
  inp: null,
  fcp: null,
  ttfb: null,
  updatedAt: 0,
};

function handleMetric(metric: Metric) {
  const key = metric.name.toLowerCase() as keyof Omit<VitalsSnapshot, 'updatedAt'>;
  if (key in snapshot) {
    (snapshot as Record<string, number | null>)[key] = Math.round(metric.value * 100) / 100;
    snapshot.updatedAt = Date.now();
  }
}

let initialized = false;

/** يُستدعى مرة واحدة من main.tsx */
export async function initWebVitals(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const { onLCP, onCLS, onINP, onFCP, onTTFB } = await import('web-vitals');
    onLCP(handleMetric);
    onCLS(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
  } catch {
    // مكتبة web-vitals غير متاحة — تجاهل بصمت
  }
}

/** إرجاع لقطة القراءات الحالية */
export function getVitalsSnapshot(): VitalsSnapshot {
  return { ...snapshot };
}
