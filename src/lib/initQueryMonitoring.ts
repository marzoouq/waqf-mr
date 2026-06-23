/**
 * تهيئة مراقبة أداء React Query — تُستدعى مرة واحدة من main.tsx
 *
 * موجة الأداء (2026-06-23): تم تخفيف الاشتراك الذي كان يبدأ/ينهي مؤقتاً
 * لكل حدث fetch/success/error من QueryCache. كان هذا يُنتج عبئاً ثقيلاً
 * على main thread أثناء موجات الاستعلامات (يظهر كـ "message handler took ...ms").
 *
 * البديل: قياس الأداء أصبح داخل `rpc()` نفسه (startPerfTimer مركزي).
 * هنا نكتفي بتسجيل أخطاء QueryCache في وضع التطوير فقط.
 */
import { queryClient } from '@/lib/queryClient';
import { logger } from '@/lib/logger';

export function initQueryMonitoring(): void {
  if (!import.meta.env.DEV) return;

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action?.type === 'error') {
      const queryKey = event.query.queryKey;
      const label = Array.isArray(queryKey) ? queryKey.join('/') : String(queryKey);
      logger.warn(`[QueryCache] error في ${label}`);
    }
  });
}
