/**
 * تهيئة مراقبة أداء React Query — تُستدعى مرة واحدة من main.tsx
 * مُستخرجة من queryClient.ts لفصل side effects عن الإنشاء
 */
import { startPerfTimer } from '@/lib/monitoring';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';

const activeTimers = new Map<string, () => void>();
const MAX_ACTIVE_TIMERS = 50;

export function initQueryMonitoring(): void {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action?.type === 'fetch') {
      const qHash = event.query.queryHash;
      const queryKey = event.query.queryKey;
      const label = Array.isArray(queryKey) ? queryKey.join('/') : String(queryKey);
      // منع تراكم المؤقتات — حذف الأقدم إن تجاوز الحد
      if (activeTimers.size >= MAX_ACTIVE_TIMERS) {
        const oldestKey = activeTimers.keys().next().value;
        if (oldestKey) {
          activeTimers.get(oldestKey)?.();
          activeTimers.delete(oldestKey);
        }
      }
      activeTimers.get(qHash)?.();
      activeTimers.set(qHash, startPerfTimer(`Query: ${label}`, {
        onSlow: (msg, opts) => toast.warning(msg, opts),
      }));
    }

    if (
      event.type === 'updated' &&
      (event.action?.type === 'success' || event.action?.type === 'error')
    ) {
      const qHash = event.query.queryHash;
      const endTimer = activeTimers.get(qHash);
      if (endTimer) {
        endTimer();
        activeTimers.delete(qHash);
      }
    }

    // تنظيف المؤقت عند حذف query من الكاش (منع تسرب الذاكرة)
    if (event.type === 'removed') {
      const qHash = event.query.queryHash;
      const endTimer = activeTimers.get(qHash);
      if (endTimer) {
        endTimer();
        activeTimers.delete(qHash);
      }
    }
  });
}
