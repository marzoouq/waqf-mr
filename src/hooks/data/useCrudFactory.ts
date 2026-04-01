import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useState, useCallback, useMemo } from 'react';

import type {
  CrudTableName, CrudRow, CrudInsert, CrudUpdate,
  CrudNotifications, CrudFactoryConfig, PaginatedQueryResult,
} from '@/types/crudFactory';

// إعادة تصدير الأنواع للتوافق مع الاستيرادات الحالية
export type { CrudNotifications, CrudFactoryConfig, PaginatedQueryResult } from '@/types/crudFactory';

// سجل تتبع تحذيرات الحد الأقصى — بديل آمن عن تخزين في window
const limitWarnShown = new Set<string>();

/** الإشعارات الافتراضية عبر sonner toast */
const defaultNotifications: Required<CrudNotifications> = {
  onSuccess: (msg) => toast.success(msg),
  onError: (msg) => toast.error(msg),
  onInfo: (msg) => toast.info(msg),
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCrudFactory<T extends CrudTableName, TData = CrudRow<T>>(
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

  const notify = { ...defaultNotifications, ...customNotifications };

  /** List / fetch all rows — مع دعم التصفح (pagination) */
  const useList = (): PaginatedQueryResult<TData> => {
    const [page, setPage] = useState(0);

    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;

    const query = useQuery({
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
      select: (data: TData[]) => {
        if (page === 0 && data && data.length === limit) {
          const key = `limit-warn-${queryKey}`;
          if (!limitWarnShown.has(key)) {
            limitWarnShown.add(key);
            notify.onInfo(`يتم عرض أول ${limit} سجل من ${label}. استخدم التصفح لمشاهدة المزيد.`);
            setTimeout(() => { limitWarnShown.delete(key); }, 300_000);
          }
        }
        return data;
      },
    });

    const hasNextPage = (query.data?.length ?? 0) === limit;
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
  const useCreate = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: CrudInsert<T>) => {
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
        notify.onSuccess(`تم إضافة ${label} بنجاح`);
        onCreateSuccess?.(data);
      },
      onError: (error) => {
        logger.error(`${label} create error:`, error);
        notify.onError(`حدث خطأ أثناء إضافة ${label}`);
      },
    });
  };

  /** Update an existing row by id */
  const useUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, ...payload }: CrudUpdate<T> & { id: string }) => {
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
        notify.onSuccess(`تم تحديث ${label} بنجاح`);
        onUpdateSuccess?.(data);
      },
      onError: (error) => {
        logger.error(`${label} update error:`, error);
        notify.onError(`حدث خطأ أثناء تحديث ${label}`);
      },
    });
  };

  /** Delete a row by id */
  const useDelete = () => {
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
        notify.onSuccess(`تم حذف ${label} بنجاح`);
      },
      onError: (error) => {
        logger.error(`${label} delete error:`, error);
        notify.onError(`حدث خطأ أثناء حذف ${label}`);
      },
    });
  };

  return { useList, useCreate, useUpdate, useDelete };
}
