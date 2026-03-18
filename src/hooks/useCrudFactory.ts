import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T]['Row'];
type Insert<T extends TableName> = Tables[T]['Insert'];
type Update<T extends TableName> = Tables[T]['Update'];

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
  /** Max rows to fetch – defaults to 500 */
  limit?: number;
  /** Arabic entity label for toast messages (e.g. 'العقار') */
  label: string;
  /** Callback after successful create – receives the created row */
  onCreateSuccess?: (data: TData) => void;
  /** Callback after successful update */
  onUpdateSuccess?: (data: TData) => void;
  /** ms before data is considered stale — defaults to 60 000 (1 min) */
  staleTime?: number;
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
    staleTime = 60_000,
  } = config;

  /** List / fetch all rows */
  const useList = (): UseQueryResult<TData[]> => {
    return useQuery({
      queryKey: [queryKey],
      staleTime,
      queryFn: async () => {
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .order(orderBy, { ascending })
          .limit(limit);

        if (error) throw error;
        // تحذير عند وصول البيانات للحد الأقصى
        if (data && data.length === limit) {
          toast.warning(`تم عرض أول ${limit} سجل فقط من ${label}. قد توجد سجلات إضافية لم تُعرض.`);
        }
        return data as TData[];
      },
    });
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
        toast.success(`تم إضافة ${label} بنجاح`);
        onCreateSuccess?.(data);
      },
      onError: (error) => {
        logger.error(`${label} create error:`, error);
        toast.error(`حدث خطأ أثناء إضافة ${label}`);
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
        toast.success(`تم تحديث ${label} بنجاح`);
        onUpdateSuccess?.(data);
      },
      onError: (error) => {
        logger.error(`${label} update error:`, error);
        toast.error(`حدث خطأ أثناء تحديث ${label}`);
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
        toast.success(`تم حذف ${label} بنجاح`);
      },
      onError: (error) => {
        logger.error(`${label} delete error:`, error);
        toast.error(`حدث خطأ أثناء حذف ${label}`);
      },
    });
  };

  return { useList, useCreate, useUpdate, useDelete };
}
