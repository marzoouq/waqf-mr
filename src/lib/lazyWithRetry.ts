import { lazy, type ComponentType } from 'react';

/** مفتاح حارس إعادة المحاولة مرتبط بالـ chunk المحدد */
function retryKey(importPath: string): string {
  return `chunk_retry:${importPath}`;
}

// ─── تعافي تلقائي عند فشل تحميل chunk قديم ───
export function lazyWithRetry(importFn: () => Promise<{ default: ComponentType }>) {
  // استخدام toString للتمييز بين chunks مختلفة
  const fnId = importFn.toString().slice(0, 120);

  return lazy(() =>
    importFn().then(mod => {
      // مسح حارس إعادة المحاولة الخاص بهذا الـ chunk فقط
      sessionStorage.removeItem(retryKey(fnId));
      return mod;
    }).catch((error: Error) => {
      const isChunkError =
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('error loading dynamically imported module');

      if (isChunkError) {
        const key = retryKey(fnId);
        const retried = sessionStorage.getItem(key);
        if (!retried) {
          sessionStorage.setItem(key, '1');
          // مسح كاش الأصول القديمة فقط
          caches.delete('static-assets').catch(() => {});
          window.location.reload();
          // رمي الخطأ مباشرة — إذا نجح الـ reload لن يصل لهنا
          throw error;
        }
        // إذا فشلت المحاولة الثانية، أزل الحارس وارمي الخطأ
        sessionStorage.removeItem(key);
      }
      throw error;
    })
  );
}
