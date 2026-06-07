import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { classifyError, isRetryableCategory } from '@/utils/error/getErrorStatus';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isAuditMode } from '@/lib/auditMode';

// في وضع التدقيق (Lighthouse / ?audit=1) نُسكت كل النشاط الخلفي
// حتى يصل المتصفح إلى networkidle ولا يتوقف Lighthouse.
const AUDIT = isAuditMode();

const queryCache = new QueryCache({
  onError: (error, query) => {
    const { category } = classifyError(error);
    if (category === 'auth') return;
    // طباعة meta لربط الفشل بمصدره (table/queryKey/label/page) بدلاً من stack مصغّر مجهول.
    logger.error('[QueryCache] خطأ في جلب البيانات', {
      message: error.message,
      queryKey: query.queryKey,
      meta: query.meta ?? null,
    });
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // #11 perf: تجاهل أخطاء auth — يعرضها AuthContext/ProtectedRoute بشكل أنسب
    const { category } = classifyError(error);
    if (category === 'auth') return;
    if (!mutation.options.onError) {
      uiNotify.error('حدث خطأ أثناء حفظ البيانات', {
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
      // وضع التدقيق: staleTime مرتفع جداً + بدون retry — لمنع موجات refetch.
      staleTime: AUDIT ? 60 * 60_000 : STALE_FINANCIAL,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (AUDIT) return false;
        const { category } = classifyError(error);
        if (!isRetryableCategory(category)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: !AUDIT,
      refetchOnMount: AUDIT ? false : true,
    },
  },
});
