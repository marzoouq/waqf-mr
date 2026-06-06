import { lazy, type ComponentType } from 'react';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '@/lib/storage';

const RETRY_KEY = 'chunk_retry';

// ─── تعافي تلقائي آمن عند فشل تحميل chunk قديم ───
export function lazyWithRetry<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await importFn();
      safeSessionRemove(RETRY_KEY);
      return mod;
    } catch (error: unknown) {
      const isChunkError =
        error instanceof Error && (
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('error loading dynamically imported module')
        );

      if (isChunkError) {
        const retried = safeSessionGet<string>(RETRY_KEY, '');
        if (!retried) {
          safeSessionSet(RETRY_KEY, '1');
          try { await caches.delete('static-assets'); } catch { /* تجاهل */ }
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        safeSessionRemove(RETRY_KEY);
      }
      throw error;
    }
  });
}
