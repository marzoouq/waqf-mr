/**
 * useListQuery — استعلام قائمة مع تصفح وحماية حد أقصى
 * مفصول عن useCrudFactory لتقليل تعقيد الملف الرئيسي.
 *
 * ملاحظات تصميمية مهمة (لمنع تكرار عطل
 * "The provided callback is no longer runnable"):
 *  1) لا نلفّ نتيجة useQuery داخل useMemo + spread، لأن خصائص UseQueryResult
 *     تعتمد على getters متعقَّبة مربوطة بـ QueryObserver نشط؛ تخزينها في
 *     closure طويل العمر يسبب الخطأ عند إبطال الـ Observer.
 *  2) queryFn يبقى نقياً — لا setState داخله. نلتقط count عبر ref ثم نزامنه
 *     مع state عبر useEffect.
 *  3) نضيف meta للاستعلام لتسهيل التتبع عبر QueryCache.onError المركزي.
 *  4) شكل البيانات في الكاش يبقى TData[] للحفاظ على توافق getQueryOptions/prefetch.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { crudNotifyAdapter } from '@/lib/notify';
import { logger } from '@/lib/logger';
import type { CrudNotifications } from '@/lib/notify';
import type {
  TableName, PaginatedQueryResult, CrudQueryOptions,
} from '@/types/data/crudFactory';

// سجل تتبع تحذيرات الحد الأقصى — بديل آمن عن التخزين في window
const limitWarnShown = new Set<string>();

interface BuildListOptions<T extends TableName> {
  table: T;
  queryKey: string;
  select: string;
  orderBy: string;
  ascending: boolean;
  limit: number;
  label: string;
  staleTime: number;
  notifications?: CrudNotifications;
}

export function buildListHelpers<T extends TableName, TData>(
  config: BuildListOptions<T>,
) {
  const { table, queryKey, select, orderBy, ascending, limit, label, staleTime, notifications } = config;
  const notify = crudNotifyAdapter(notifications);

  /** إرجاع query options لصفحة محددة — مفيد لـ prefetchQuery */
  const getQueryOptions = (page = 0): CrudQueryOptions => {
    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;
    return {
      queryKey: [queryKey, { page }],
      staleTime,
      queryFn: async () => {
        const { data, error } = await supabase
          .from(table)
          .select(select, { count: 'exact' })
          .order(orderBy, { ascending })
          .range(rangeFrom, rangeTo);
        if (error) throw error;
        return data as TData[];
      },
    };
  };

  const useList = (): PaginatedQueryResult<TData> => {
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const lastCountRef = useRef<number | null>(null);
    const lastErrorRef = useRef<unknown>(null);

    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;

    const query: UseQueryResult<TData[]> = useQuery<TData[]>({
      queryKey: [queryKey, { page }],
      staleTime,
      meta: { table, queryKey, label, page, rangeFrom, rangeTo },
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(table)
          .select(select, { count: 'exact' })
          .order(orderBy, { ascending })
          .range(rangeFrom, rangeTo);

        if (error) throw error;
        // التقاط العدد عبر ref فقط — لا setState داخل queryFn
        if (count !== null && count !== undefined) {
          lastCountRef.current = count;
        }
        return (data ?? []) as TData[];
      },
    });

    // مزامنة totalCount + تحذير الحد الأقصى — خارج queryFn لتفادي تداخل مع QueryObserver
    useEffect(() => {
      if (!query.isSuccess) return;
      const c = lastCountRef.current;
      if (typeof c === 'number') {
        setTotalCount(c);
        if (page === 0 && c > limit) {
          const key = `limit-warn-${queryKey}`;
          if (!limitWarnShown.has(key)) {
            limitWarnShown.add(key);
            notify.info(`يتم عرض أول ${limit} سجل من ${label}. استخدم التصفح لمشاهدة المزيد.`);
            setTimeout(() => { limitWarnShown.delete(key); }, 300_000);
          }
        }
      }
    }, [query.isSuccess, query.dataUpdatedAt, page]);

    // تسجيل أخطاء الاستعلام والتعافي منها — يساعد على تتبع المصدر بدون toast إضافي
    useEffect(() => {
      if (query.error && query.error !== lastErrorRef.current) {
        lastErrorRef.current = query.error;
        logger.error('[useList] فشل استعلام', {
          table, queryKey, label, page,
          message: (query.error as Error)?.message,
        });
      } else if (!query.error && lastErrorRef.current && query.isSuccess) {
        logger.info('[useList] تعافي بعد فشل سابق', { table, queryKey, page });
        lastErrorRef.current = null;
      }
    }, [query.error, query.isSuccess, page]);

    const hasNextPage = (page + 1) * limit < totalCount;
    const hasPrevPage = page > 0;

    const nextPage = useCallback(() => {
      if (hasNextPage) setPage((p) => p + 1);
    }, [hasNextPage]);

    const prevPage = useCallback(() => {
      if (hasPrevPage) setPage((p) => Math.max(0, p - 1));
    }, [hasPrevPage]);

    const goToPage = useCallback((p: number) => {
      setPage(Math.max(0, p));
    }, []);

    // spread يتم مرة واحدة لكل render — لا closures طويلة العمر مع UseQueryResult
    return {
      ...query,
      page,
      nextPage,
      prevPage,
      goToPage,
      hasNextPage,
      hasPrevPage,
      pageSize: limit,
    };
  };

  return { useList, getQueryOptions };
}
