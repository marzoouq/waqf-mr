/**
 * useListQuery — استعلام قائمة مع تصفح وحماية حد أقصى
 * مفصول عن useCrudFactory لتقليل تعقيد الملف الرئيسي.
 *
 * ملاحظات تصميمية مهمة (لمنع تكرار عطل
 * "The provided callback is no longer runnable"):
 *  1) لا نلفّ نتيجة useQuery داخل useMemo + spread، لأن خصائص UseQueryResult
 *     تعتمد على getters متعقَّبة مربوطة بـ QueryObserver نشط؛ تخزينها في
 *     closure طويل العمر يسبب الخطأ عند إبطال الـ Observer.
 *  2) queryFn يبقى نقياً — لا setState داخله. نقلنا تحديث totalCount إلى
 *     useEffect يعتمد على بيانات الاستعلام.
 *  3) نضيف meta للاستعلام لتسهيل التتبع عبر QueryCache.onError المركزي.
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

interface ListQueryResultRaw<TData> {
  rows: TData[];
  count: number | null;
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
    const lastErrorRef = useRef<unknown>(null);

    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;

    const rawQuery = useQuery<ListQueryResultRaw<TData>>({
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
        return { rows: (data ?? []) as TData[], count: count ?? null };
      },
    });

    // تحديث totalCount + تحذير الحد الأقصى عبر effect (لا side effects داخل queryFn)
    useEffect(() => {
      const c = rawQuery.data?.count;
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
    }, [rawQuery.data, page]); // eslint-disable-line react-hooks/exhaustive-deps

    // تسجيل أخطاء الاستعلام والتعافي منها — يساعد على تتبع المصدر بدون toast إضافي
    useEffect(() => {
      if (rawQuery.error && rawQuery.error !== lastErrorRef.current) {
        lastErrorRef.current = rawQuery.error;
        logger.error('[useList] فشل استعلام', {
          table, queryKey, label, page,
          message: (rawQuery.error as Error)?.message,
        });
      } else if (!rawQuery.error && lastErrorRef.current && rawQuery.isSuccess) {
        logger.info('[useList] تعافي بعد فشل سابق', { table, queryKey, page });
        lastErrorRef.current = null;
      }
    }, [rawQuery.error, rawQuery.isSuccess, page]);

    // نُعيد كائناً يتوافق مع UseQueryResult<TData[]> عبر تحويل data فقط.
    // الـ spread يتم مرة واحدة لكل render — لا closures طويلة العمر.
    const query = rawQuery as unknown as UseQueryResult<TData[]>;
    const data = rawQuery.data?.rows;

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

    return {
      ...query,
      data,
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
