import { lazy, type ComponentType } from 'react';

// ─── تعافي تلقائي عند فشل تحميل chunk قديم ───
export function lazyWithRetry(importFn: () => Promise<{ default: ComponentType }>) {
  return lazy(() => {
    // AbortController لمنع خطأ "callback is no longer runnable"
    const controller = new AbortController();

    const loadPromise = importFn().then(mod => {
      if (controller.signal.aborted) {
        // المكون أُلغي — نعيد وعداً لا ينتهي بدلاً من الانفجار
        return new Promise<{ default: ComponentType }>(() => {});
      }
      sessionStorage.removeItem('chunk_retry');
      return mod;
    }).catch((error: Error) => {
      if (controller.signal.aborted) {
        return new Promise<{ default: ComponentType }>(() => {});
      }

      const isChunkError =
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('error loading dynamically imported module');

      if (isChunkError) {
        const retried = sessionStorage.getItem('chunk_retry');
        if (!retried) {
          sessionStorage.setItem('chunk_retry', '1');
          caches.delete('static-assets').catch(() => {});
          window.location.reload();
          return new Promise<{ default: ComponentType }>(() => {});
        }
        sessionStorage.removeItem('chunk_retry');
      }
      throw error;
    });

    // ربط الإلغاء — React 18 يستدعي cleanup عند unmount أثناء Suspense
    (loadPromise as any).__abort = () => controller.abort();
    return loadPromise;
  });
}

