/**
 * useCrudMutations — Create / Update / Delete mutations
 * مفصول عن useCrudFactory لتقليل تعقيد الملف الرئيسي.
 */
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { crudNotifyAdapter } from '@/lib/notify';
import type { CrudNotifications } from '@/lib/notify';
import type { TableName, Insert, Update, CrudFactoryConfig } from '../crudFactory.types';

interface BuildMutationOptions<T extends TableName, TData> {
  table: T;
  queryKey: string;
  label: string;
  notifications?: CrudNotifications;
  onCreateSuccess?: CrudFactoryConfig<T, TData>['onCreateSuccess'];
  onUpdateSuccess?: CrudFactoryConfig<T, TData>['onUpdateSuccess'];
}

export function buildMutationHelpers<T extends TableName, TData>(
  config: BuildMutationOptions<T, TData>,
) {
  const { table, queryKey, label, notifications, onCreateSuccess, onUpdateSuccess } = config;
  const notify = crudNotifyAdapter(notifications);

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

  return { useCreate, useUpdate, useDelete };
}
