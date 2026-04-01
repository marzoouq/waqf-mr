/**
 * تحميل مسبق للـ chunks الثقيلة (PDF, html2canvas, الرسوم البيانية)
 * عند hover على الأزرار ذات الصلة — لتجنب تأخير أول استخدام
 */

const preloaded = new Set<string>();

function preloadOnIdle(importFn: () => Promise<unknown>, key: string): void {
  if (preloaded.has(key)) return;
  preloaded.add(key);

  const load = () => {
    importFn().catch(() => {
      // السماح بإعادة المحاولة لاحقاً
      preloaded.delete(key);
    });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(load, { timeout: 5000 });
  } else {
    setTimeout(load, 200);
  }
}

/** تحميل مسبق لمكتبات PDF عند hover على زر الطباعة/التصدير */
export function preloadPdfChunks(): void {
  preloadOnIdle(() => import('jspdf'), 'jspdf');
  preloadOnIdle(() => import('html2canvas'), 'html2canvas');
}

/** تحميل مسبق لمكتبات الرسوم البيانية */
export function preloadChartChunks(): void {
  preloadOnIdle(() => import('recharts'), 'recharts');
}
