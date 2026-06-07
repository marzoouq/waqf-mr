import { lazy, type ComponentType } from 'react';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '@/lib/storage';
import { logger } from '@/lib/logger';

const RETRY_KEY = 'chunk_retry';
// TTL قصير لتجنّب تعطّل التعافي بعد reload واحد ناجح: العلامة تسقط تلقائياً.
const RETRY_TTL_MS = 10_000;

interface RetryFlag { ts: number }

function isStaleChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message || '';
  return (
    m.includes('Failed to fetch dynamically imported module') ||
    m.includes('Loading chunk') ||
    m.includes('error loading dynamically imported module') ||
    m.includes('Importing a module script failed') ||
    m.includes('Unable to preload CSS')
  );
}

// ─── تعافي تلقائي آمن عند فشل تحميل chunk قديم ───
export function lazyWithRetry<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
  label?: string,
) {
  return lazy(async () => {
    try {
      const mod = await importFn();
      safeSessionRemove(RETRY_KEY);
      return mod;
    } catch (error: unknown) {
      if (!isStaleChunkError(error)) {
        logger.error('[lazyWithRetry] فشل تحميل chunk غير قابل للتعافي', { label, error });
        throw error;
      }

      const flag = safeSessionGet<RetryFlag | string>(RETRY_KEY, '');
      const recent =
        typeof flag === 'object' && flag !== null && typeof flag.ts === 'number'
          ? Date.now() - flag.ts < RETRY_TTL_MS
          : !!flag; // توافق رجعي للقيمة القديمة '1'

      if (!recent) {
        safeSessionSet(RETRY_KEY, { ts: Date.now() } satisfies RetryFlag);
        logger.warn('[lazyWithRetry] chunk قديم — إعادة التحميل مرة واحدة', { label });
        try { await caches.delete('static-assets'); } catch { /* تجاهل */ }
        try { await caches.delete('lazy-vendor-chunks'); } catch { /* تجاهل */ }
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }

      // محاولة تعافي سابقة فشلت — لا نُعيد reload لمنع loop
      safeSessionRemove(RETRY_KEY);
      logger.error('[lazyWithRetry] فشل التعافي بعد إعادة تحميل سابقة', { label, error });
      throw error;
    }
  });
}
