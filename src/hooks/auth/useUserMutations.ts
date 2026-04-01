/**
 * Mutations إدارة المستخدمين — مفصولة من useUserManagement
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';

export const callAdminApi = async (body: Record<string, unknown>) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("يجب تسجيل الدخول أولاً");
  const res = await supabase.functions.invoke('admin-manage-users', { body });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};

interface UserMutationCallbacks {
  onCreateSuccess?: () => void;
  onEditClose?: () => void;
  onPasswordClose?: () => void;
  onDeleteClose?: () => void;
  setPendingConfirmId?: (id: string | null) => void;
  setCurrentPage?: (page: number) => void;
}

export function useUserMutations(callbacks: UserMutationCallbacks) {
  const qc = useQueryClient();

  const linkBeneficiary = useMutation({
    mutationFn: async ({ beneficiaryId, userId }: { beneficiaryId: string; userId: string }) => {
      const { error } = await supabase.from('beneficiaries').update({ user_id: userId }).eq('id', beneficiaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unlinked-beneficiaries'] });
      qc.invalidateQueries({ queryKey: ['orphaned-beneficiaries'] });
      toast.success('تم ربط المستخدم بالمستفيد بنجاح');
    },
    onError: () => toast.error('فشل ربط المستخدم بالمستفيد'),
  });

  const createUser = useMutation({
    mutationFn: (data: { email: string; password: string; role: string; nationalId: string; name: string }) =>
      callAdminApi({ action: 'create_user', ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم إنشاء المستخدم بنجاح');
      callbacks.onCreateSuccess?.();
      callbacks.setCurrentPage?.(1);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const confirmEmail = useMutation({
    mutationFn: async (userId: string) => {
      callbacks.setPendingConfirmId?.(userId);
      return callAdminApi({ action: 'confirm_email', userId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تفعيل البريد الإلكتروني');
      callbacks.setPendingConfirmId?.(null);
    },
    onError: (e: Error) => {
      toast.error(getSafeErrorMessage(e));
      callbacks.setPendingConfirmId?.(null);
    },
  });

  const updateEmail = useMutation({
    mutationFn: (data: { userId: string; email: string }) =>
      callAdminApi({ action: 'update_email', ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث البريد الإلكتروني');
      callbacks.onEditClose?.();
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const updatePassword = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      callAdminApi({ action: 'update_password', ...data }),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور');
      callbacks.onPasswordClose?.();
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const setRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      callAdminApi({ action: 'set_role', ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث الدور');
      callbacks.onEditClose?.();
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'delete_user', userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف المستخدم');
      callbacks.onDeleteClose?.();
      callbacks.setCurrentPage?.(1);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  return { linkBeneficiary, createUser, confirmEmail, updateEmail, updatePassword, setRole: setRoleMutation, deleteUser };
}
