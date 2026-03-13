import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const queryCache = new QueryCache({
  onError: (error) => {
    const status = (error as { status?: number })?.status;
    // Don't toast on 401/403 — handled by auth flow
    if (status === 401 || status === 403) return;
    logger.error('[QueryCache] خطأ في جلب البيانات:', error.message);
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // Only show global toast if the mutation didn't define its own onError
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
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
