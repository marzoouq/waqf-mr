import { lazy, type ComponentType } from 'react';

// ─── تعافي تلقائي عند فشل تحميل chunk قديم ───
export function lazyWithRetry(importFn: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    importFn().catch((error: Error) => {
      const isChunkError =
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('error loading dynamically imported module');

      if (isChunkError) {
        const retried = sessionStorage.getItem('chunk_retry');
        if (!retried) {
          sessionStorage.setItem('chunk_retry', '1');
          // مسح كاش الأصول القديمة فقط
          caches.delete('static-assets').catch(() => {});
          window.location.reload();
          // إرجاع وعد لا ينتهي لمنع عرض خطأ قبل إعادة التحميل
          return new Promise(() => {});
        }
        // إذا فشلت المحاولة الثانية، أزل الحارس وارمي الخطأ
        sessionStorage.removeItem('chunk_retry');
      }
      throw error;
    })
  );
}

// مسح حارس إعادة المحاولة عند التحميل الناجح
sessionStorage.removeItem('chunk_retry');
