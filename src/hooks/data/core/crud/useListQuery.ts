/**
 * useListQuery — استعلام قائمة مع تصفح وحماية حد أقصى
 * مفصول عن useCrudFactory لتقليل تعقيد الملف الرئيسي.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { crudNotifyAdapter } from '@/lib/notify';
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

    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;

    const query: UseQueryResult<TData[]> = useQuery({
      queryKey: [queryKey, { page }],
      staleTime,
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(table)
          .select(select, { count: 'exact' })
          .order(orderBy, { ascending })
          .range(rangeFrom, rangeTo);

        if (error) throw error;
        if (count !== null) setTotalCount(count);

        if (page === 0 && count !== null && count > limit) {
          const key = `limit-warn-${queryKey}`;
          if (!limitWarnShown.has(key)) {
            limitWarnShown.add(key);
            notify.info(`يتم عرض أول ${limit} سجل من ${label}. استخدم التصفح لمشاهدة المزيد.`);
            setTimeout(() => { limitWarnShown.delete(key); }, 300_000);
          }
        }

        return data as TData[];
      },
    });

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

    return useMemo(() => ({
      ...query,
      page,
      nextPage,
      prevPage,
      goToPage,
      hasNextPage,
      hasPrevPage,
      pageSize: limit,
    }), [query, page, nextPage, prevPage, goToPage, hasNextPage, hasPrevPage]);
  };

  return { useList, getQueryOptions };
}
