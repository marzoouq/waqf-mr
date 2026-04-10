import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useState, useCallback, useMemo } from 'react';
import { crudNotifyAdapter } from '@/lib/notify';
import type {
  TableName, Row, Insert, Update,
  CrudFactoryConfig, PaginatedQueryResult, CrudQueryOptions,
} from './crudFactory.types';

// إعادة تصدير الأنواع للتوافق
export type { CrudNotifications } from './crudFactory.types';

// سجل تتبع تحذيرات الحد الأقصى — بديل آمن عن تخزين في window
const limitWarnShown = new Set<string>();

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCrudFactory<T extends TableName, TData = Row<T>>(
  config: CrudFactoryConfig<T, TData>,
) {
  const {
    table,
    queryKey,
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    limit = 500,
    label,
    onCreateSuccess,
    onUpdateSuccess,
    staleTime = STALE_FINANCIAL,
    notifications: customNotifications,
  } = config;

  const notify = crudNotifyAdapter(customNotifications);

  // ---------------------------------------------------------------------------
  // Query options — قابلة لإعادة الاستخدام في prefetch
  // ---------------------------------------------------------------------------

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

  /** List / fetch all rows — مع دعم التصفح (pagination) */
  const useList = (): PaginatedQueryResult<TData> => {
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;

    const query = useQuery({
      queryKey: [queryKey, { page }],
      staleTime,
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from(table)
          .select(select, { count: 'exact' })
          .order(orderBy, { ascending })
          .range(rangeFrom, rangeTo);

        if (error) throw error;
        // تخزين العدد الكلي لحساب hasNextPage بدقة
        if (count !== null) setTotalCount(count);

        // تحذير فقط في الصفحة الأولى لتجنب التكرار
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

  /** Create a new row */
  const useCreate = (): UseMutationResult<TData, Error, Insert<T>> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: Insert<T>) => {
        const { data, error } = await supabase
          .from(table)
          .insert(payload as never)
          .select()
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error(`فشل إنشاء ${label} — لم يُعاد أي سجل`);
        return data as TData;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        notify.success(`تم إضافة ${label} بنجاح`);
        onCreateSuccess?.(data);
      },
      onError: (error) => {
        logger.error(`${label} create error:`, error);
        notify.error(`حدث خطأ أثناء إضافة ${label}`);
      },
    });
  };

  /** Update an existing row by id */
  const useUpdate = (): UseMutationResult<TData, Error, Update<T> & { id: string }> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, ...payload }: Update<T> & { id: string }) => {
        const { data, error } = await supabase
          .from(table)
          .update(payload as never)
          .eq('id' as never, id)
          .select()
          .single();

        if (error) throw error;
        return data as TData;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        notify.success(`تم تحديث ${label} بنجاح`);
        onUpdateSuccess?.(data);
      },
      onError: (error) => {
        logger.error(`${label} update error:`, error);
        notify.error(`حدث خطأ أثناء تحديث ${label}`);
      },
    });
  };

  /** Delete a row by id */
  const useDelete = (): UseMutationResult<void, Error, string> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id' as never, id);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        notify.success(`تم حذف ${label} بنجاح`);
      },
      onError: (error) => {
        logger.error(`${label} delete error:`, error);
        notify.error(`حدث خطأ أثناء حذف ${label}`);
      },
    });
  };

  return { useList, useCreate, useUpdate, useDelete, getQueryOptions };
}
