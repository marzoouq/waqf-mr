import { lazy, type ComponentType } from 'react';

// ─── تعافي تلقائي آمن عند فشل تحميل chunk قديم ───
export function lazyWithRetry<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await importFn();
      sessionStorage.removeItem('chunk_retry');
      return mod;
    } catch (error: unknown) {
      const isChunkError =
        error instanceof Error && (
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('error loading dynamically imported module')
        );

      if (isChunkError) {
        const retried = sessionStorage.getItem('chunk_retry');
        if (!retried) {
          sessionStorage.setItem('chunk_retry', '1');
          try { await caches.delete('static-assets'); } catch (_) { /* تجاهل */ }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        sessionStorage.removeItem('chunk_retry');
      }
      throw error;
    }
  });
}
