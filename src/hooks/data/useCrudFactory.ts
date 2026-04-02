import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useState, useCallback, useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';

// سجل تتبع تحذيرات الحد الأقصى — بديل آمن عن تخزين في window
const limitWarnShown = new Set<string>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T]['Row'];
type Insert<T extends TableName> = Tables[T]['Insert'];
type Update<T extends TableName> = Tables[T]['Update'];

/** واجهة إشعارات CRUD — يمكن تمريرها لتخصيص أو إلغاء الرسائل */
export interface CrudNotifications {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onInfo?: (message: string) => void;
}

/** الإشعارات الافتراضية عبر sonner toast */
const defaultNotifications: Required<CrudNotifications> = {
  onSuccess: (msg) => toast.success(msg),
  onError: (msg) => toast.error(msg),
  onInfo: (msg) => toast.info(msg),
};

/** Configuration for the CRUD factory */
interface CrudFactoryConfig<T extends TableName, TData = Row<T>> {
  /** Supabase table name */
  table: T;
  /** React-query cache key */
  queryKey: string;
  /** Custom select string (e.g. '*, property:properties(*)') – defaults to '*' */
  select?: string;
  /** Column to order by – defaults to 'created_at' */
  orderBy?: string;
  /** Order direction – defaults to descending */
  ascending?: boolean;
  /** Max rows per page – defaults to 500 */
  limit?: number;
  /** Arabic entity label for toast messages (e.g. 'العقار') */
  label: string;
  /** Callback after successful create – receives the created row */
  onCreateSuccess?: (data: TData) => void;
  /** Callback after successful update */
  onUpdateSuccess?: (data: TData) => void;
  /** ms before data is considered stale — defaults to 60 000 (1 min) */
  staleTime?: number;
  /** تخصيص إشعارات — إذا لم يُحدد يُستخدم toast الافتراضي */
  notifications?: CrudNotifications;
}

/** نتيجة useList مع دعم التصفح */
interface PaginatedQueryResult<TData> extends Omit<UseQueryResult<TData[]>, 'data'> {
  data: TData[] | undefined;
  /** رقم الصفحة الحالية (يبدأ من 0) */
  page: number;
  /** الانتقال إلى الصفحة التالية */
  nextPage: () => void;
  /** الانتقال إلى الصفحة السابقة */
  prevPage: () => void;
  /** الانتقال إلى صفحة محددة */
  goToPage: (p: number) => void;
  /** هل توجد صفحة تالية */
  hasNextPage: boolean;
  /** هل توجد صفحة سابقة */
  hasPrevPage: boolean;
  /** حجم الصفحة */
  pageSize: number;
}

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

  const notify = { ...defaultNotifications, ...customNotifications };

  /** List / fetch all rows — مع دعم التصفح (pagination) */
  const useList = (): PaginatedQueryResult<TData> => {
    const [page, setPage] = useState(0);

    const rangeFrom = page * limit;
    const rangeTo = rangeFrom + limit - 1;

    const query = useQuery({
      // إضافة الصفحة للـ queryKey لتخزين كل صفحة بشكل مستقل
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
        // تحذير فقط في الصفحة الأولى لتجنب التكرار
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
  const useCreate = (): UseMutationResult<TData, Error, Insert<T>> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: Insert<T>) => {
        const { data, error } = await supabase
          .from(table)
          .insert(payload as never) // generic T can't be resolved at compile-time
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
  const useUpdate = (): UseMutationResult<TData, Error, Update<T> & { id: string }> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, ...payload }: Update<T> & { id: string }) => {
        const { data, error } = await supabase
          .from(table)
          .update(payload as never) // generic T can't be resolved at compile-time
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
