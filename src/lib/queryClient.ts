import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';

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
      defaultNotify.error('حدث خطأ أثناء حفظ البيانات', {
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
      // #33: تخفيض الافتراضي من 5د إلى 60ث — أرضية آمنة لـ realtime/UI sync.
      // queries محددة (مثل البيانات الثابتة) تستخدم STALE_STATIC = 5د عبر تمرير صريح.
      staleTime: 60 * 1000,
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
