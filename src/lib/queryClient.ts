import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { startPerfTimer } from '@/lib/performanceMonitor';

const queryCache = new QueryCache({
  onError: (error) => {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) return;
    logger.error('[QueryCache] خطأ في جلب البيانات:', error.message);
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (!mutation.options.onError) {
      toast.error('حدث خطأ أثناء حفظ البيانات', {
        description: error.message?.slice(0, 120),
      });
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// مراقبة أداء استعلامات React Query — تنبيه عند تجاوز 5 ثوانٍ
const activeTimers = new Map<string, () => void>();

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.action?.type === 'fetch') {
    const qHash = event.query.queryHash;
    const queryKey = event.query.queryKey;
    const label = Array.isArray(queryKey) ? queryKey.join('/') : String(queryKey);
    // أوقف المؤقت السابق إن وُجد (لمنع التكرار)
    activeTimers.get(qHash)?.();
    activeTimers.set(qHash, startPerfTimer(`Query: ${label}`));
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
