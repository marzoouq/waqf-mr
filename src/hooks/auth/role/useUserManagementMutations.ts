/**
 * عمليات إدارة المستخدمين — mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { callAdminApi } from './useUserManagementData';

export const useCreateUserMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; role: string; nationalId: string; name: string }) =>
      callAdminApi({ action: 'create_user', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      uiNotify.success('تم إنشاء المستخدم بنجاح');
      onSuccess?.();
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useConfirmEmailMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => callAdminApi({ action: 'confirm_email', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      uiNotify.success('تم تفعيل البريد الإلكتروني');
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useUpdateEmailMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; email: string }) =>
      callAdminApi({ action: 'update_email', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      uiNotify.success('تم تحديث البريد الإلكتروني');
      onSuccess?.();
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useUpdatePasswordMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      callAdminApi({ action: 'update_password', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }); 
      uiNotify.success('تم تحديث كلمة المرور');
      onSuccess?.();
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useSetRoleMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      callAdminApi({ action: 'set_role', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-beneficiaries'] });
      uiNotify.success('تم تحديث الدور');
      onSuccess?.();
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useDeleteUserMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'delete_user', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      uiNotify.success('تم حذف المستخدم');
      onSuccess?.();
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useLinkBeneficiaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ beneficiaryId, userId }: { beneficiaryId: string; userId: string }) =>
      callAdminApi({ action: 'link_beneficiary', beneficiaryId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlinked-beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
      uiNotify.success('تم ربط المستخدم بالمستفيد بنجاح');
    },
    onError: (e: unknown) => uiNotify.error(getSafeErrorMessage(e)),
  });
};

export const useToggleRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await callAdminApi({ action: 'toggle_registration', enabled });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: appSettingsKeys.prefixes.registrationEnabled });
      uiNotify.success(enabled ? 'تم تفعيل التسجيل العام' : 'تم إيقاف التسجيل العام');
    },
    onError: (e: unknown) => uiNotify.error(getSafeErrorMessage(e)),
  });
};
