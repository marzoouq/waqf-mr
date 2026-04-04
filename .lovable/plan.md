
# إصلاح `lazyWithRetry.ts` — إزالة AbortController

## التغيير

**ملف واحد**: `src/lib/lazyWithRetry.ts`

استبدال كامل المحتوى بنسخة مبسّطة:

- **إزالة**: `AbortController`، `signal.aborted` checks، `(loadPromise as any).__abort`
- **إبقاء**: منطق chunk retry (sessionStorage + reload + `caches.delete`)
- **إضافة**: generic type `<T extends ComponentType<any>>` لنوعية أفضل

```typescript
import { lazy, type ComponentType } from 'react';

export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await importFn();
      sessionStorage.removeItem('chunk_retry');
      return mod;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('error loading dynamically imported module');

      if (isChunkError) {
        const retried = sessionStorage.getItem('chunk_retry');
        if (!retried) {
          sessionStorage.setItem('chunk_retry', '1');
          try { await caches.delete('static-assets'); } catch (_) {}
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        sessionStorage.removeItem('chunk_retry');
      }
      throw error;
    }
  });
}
```

## السبب

`AbortController` + `__abort` يتعارض مع React 18 Suspense ويسبب `callback is no longer runnable`. النسخة المبسّطة تترك لـ React التحكم الكامل.

## الملفات المتأثرة

1. `src/lib/lazyWithRetry.ts` — استبدال كامل
