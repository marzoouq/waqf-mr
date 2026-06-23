/**
 * useDashboardPrefetch — جلب مسبق لبيانات لوحة التحكم
 *
 * مفصول عن FiscalYearContext (#24 من تقرير الفحص) لفصل المسؤوليات:
 *   - FiscalYearContext: إدارة حالة السنة المالية فقط
 *   - useDashboardPrefetch: تحسين أداء (يمكن تعطيله مستقلاً)
 *
 * يُستهلك حصراً في FiscalYearProvider لإبقاء التأثير محصوراً بمكان واحد.
 *
 * #10 perf: AbortController يلغي prefetch السابق عند تغيير سريع للـ fiscalYearId
 * — يمنع تكدس طلبات shadow على الخادم.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import { dashboardKeys } from '@/lib/queryKeys/dashboardKeys';
import type { FiscalYear } from '@/hooks/data/financial/fiscalYears/useFiscalYears';

interface UseDashboardPrefetchArgs {
  fiscalYearId: string;
  fiscalYears: FiscalYear[];
}

export function useDashboardPrefetch({ fiscalYearId, fiscalYears }: UseDashboardPrefetchArgs): void {
  const { role, signOut } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrAccountant = role === 'admin' || role === 'accountant';
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAdminOrAccountant || !isFyReady(fiscalYearId) || isFyAll(fiscalYearId)) return;

    // ألغِ أي prefetch سابق قبل بدء واحد جديد (يمنع race conditions عند تبديل السنة بسرعة)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fy = fiscalYears.find(f => f.id === fiscalYearId);
    queryClient.prefetchQuery({
      // مفتاح موحّد عبر dashboardKeys — يعتمد على fiscalYearId فقط
      // (label تم استبعاده لمنع double-invalidation — انظر dashboardKeys.ts)
      queryKey: dashboardKeys.summary(fiscalYearId),
      queryFn: async ({ signal }) => {
        if (controller.signal.aborted) throw new Error('aborted');
        // ملاحظة: invoke() لا يدعم signal فعلياً (Supabase SDK v2 لا يلغي النقل)
        // لذا نُبقي فحوص aborted يدوياً قبل/بعد لمنع تلويث الكاش عند تغيير سريع للسنة.
        const data = await invoke<unknown>(
          'dashboard-summary',
          { body: { fiscal_year_id: fiscalYearId, fiscal_year_label: fy?.label } },
          { onAuthError: async () => { await signOut(); } },
        );
        if (controller.signal.aborted) throw new Error('aborted');
        return data;
      },
      staleTime: 2 * 60 * 1000,
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signOut/queryFn مستقران؛ تشغيل عند تغيُّر السنة/الدور فقط
  }, [fiscalYearId, fiscalYears, queryClient, isAdminOrAccountant]);
}
