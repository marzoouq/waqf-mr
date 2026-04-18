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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';

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

    // #10: ألغِ أي prefetch سابق قبل بدء واحد جديد
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fy = fiscalYears.find(f => f.id === fiscalYearId);
    queryClient.prefetchQuery({
      queryKey: ['dashboard-summary', fiscalYearId],
      queryFn: async () => {
        if (controller.signal.aborted) throw new Error('aborted');
        const { data, error } = await supabase.functions.invoke('dashboard-summary', {
          body: { fiscal_year_id: fiscalYearId, fiscal_year_label: fy?.label },
        });
        if (controller.signal.aborted) throw new Error('aborted');
        // كشف جلسة منتهية — تسجيل خروج تلقائي عبر AuthContext لضمان cleanup كامل
        if (error?.message?.includes('401') || data?.error === 'Unauthorized') {
          await signOut();
          throw new Error('انتهت الجلسة');
        }
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
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
