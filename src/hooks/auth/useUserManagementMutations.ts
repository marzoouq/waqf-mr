/**
 * عمليات إدارة المستخدمين — mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { callAdminApi } from './useUserManagementData';

export const useCreateUserMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; role: string; nationalId: string; name: string }) =>
      callAdminApi({ action: 'create_user', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      defaultNotify.success('تم إنشاء المستخدم بنجاح');
      onSuccess?.();
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};

export const useConfirmEmailMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => callAdminApi({ action: 'confirm_email', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      defaultNotify.success('تم تفعيل البريد الإلكتروني');
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};

export const useUpdateEmailMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; email: string }) =>
      callAdminApi({ action: 'update_email', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      defaultNotify.success('تم تحديث البريد الإلكتروني');
      onSuccess?.();
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};

export const useUpdatePasswordMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      callAdminApi({ action: 'update_password', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }); 
      defaultNotify.success('تم تحديث كلمة المرور');
      onSuccess?.();
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};

export const useSetRoleMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      callAdminApi({ action: 'set_role', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      defaultNotify.success('تم تحديث الدور');
      onSuccess?.();
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};

export const useDeleteUserMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'delete_user', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      defaultNotify.success('تم حذف المستخدم');
      onSuccess?.();
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};

export const useLinkBeneficiaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ beneficiaryId, userId }: { beneficiaryId: string; userId: string }) => {
      const { error } = await supabase.from('beneficiaries').update({ user_id: userId }).eq('id', beneficiaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlinked-beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-beneficiaries'] });
      defaultNotify.success('تم ربط المستخدم بالمستفيد بنجاح');
    },
    onError: () => defaultNotify.error('فشل ربط المستخدم بالمستفيد'),
  });
};

export const useToggleRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await callAdminApi({ action: 'toggle_registration', enabled });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['registration-enabled'] });
      defaultNotify.success(enabled ? 'تم تفعيل التسجيل العام' : 'تم إيقاف التسجيل العام');
    },
    onError: (e: unknown) => defaultNotify.error(getSafeErrorMessage(e)),
  });
};
