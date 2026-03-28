/**
 * هوك إدارة المستخدمين — CRUD + فلترة + ربط مستفيدين
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_SETTINGS, STALE_MESSAGING } from '@/lib/queryStaleTime';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { useAuth } from '@/contexts/AuthContext';

export interface ManagedUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
}

const callAdminApi = async (body: Record<string, unknown>) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("يجب تسجيل الدخول أولاً");
  // supabase.functions.invoke يُرسل الـ token تلقائياً — لا حاجة لـ header يدوي
  const res = await supabase.functions.invoke('admin-manage-users', {
    body,
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
};

export const useUserManagement = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // حالة الحوارات
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' });
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // بحث وفلتر
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilterUser, setStatusFilterUser] = useState<string>('all');

  // إعداد التسجيل العام
  const { data: registrationEnabled = false } = useQuery({
    queryKey: ['registration-enabled'],
    staleTime: STALE_SETTINGS,
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'registration_enabled')
        .maybeSingle();
      return data?.value === 'true';
    },
  });

  const toggleRegistration = async (enabled: boolean) => {
    setToggling(true);
    try {
      await callAdminApi({ action: 'toggle_registration', enabled });
      queryClient.invalidateQueries({ queryKey: ['registration-enabled'] });
      toast.success(enabled ? 'تم تفعيل التسجيل العام' : 'تم إيقاف التسجيل العام');
    } catch (e: unknown) {
      toast.error(getSafeErrorMessage(e));
    } finally {
      setToggling(false);
    }
  };

  // جلب المستخدمين
  const { data: usersResult = { users: [] as ManagedUser[], total: 0, nextPage: null as number | null }, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', currentPage],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const result = await callAdminApi({ action: 'list_users', page: currentPage });
      return {
        users: result.users as ManagedUser[],
        total: (result.total as number) ?? (result.users as ManagedUser[]).length,
        nextPage: (result.nextPage as number | null) ?? null,
      };
    },
    enabled: !!currentUser,
    retry: 2,
  });

  const allUsers = usersResult.users;
  const totalUsers = usersResult.total;
  const nextPage = usersResult.nextPage;

  // فلترة محلية
  const users = useMemo(() => {
    let result = allUsers;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      result = result.filter(u => u.email.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => (u.role || 'none') === roleFilter);
    }
    if (statusFilterUser === 'confirmed') {
      result = result.filter(u => !!u.email_confirmed_at);
    } else if (statusFilterUser === 'unconfirmed') {
      result = result.filter(u => !u.email_confirmed_at);
    }
    return result;
  }, [allUsers, userSearch, roleFilter, statusFilterUser]);

  // مستفيدين بدون ربط
  const { data: orphanedBeneficiaries = [] } = useQuery({
    queryKey: ['orphaned-beneficiaries'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, name, email, user_id')
        .or('email.is.null,email.eq.,user_id.is.null');
      return data || [];
    },
    enabled: !!currentUser,
  });

  const { data: unlinkedBeneficiaries = [] } = useQuery({
    queryKey: ['unlinked-beneficiaries'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, name, user_id')
        .is('user_id', null);
      return data || [];
    },
    enabled: !!currentUser,
  });

  // Mutations
  const linkBeneficiary = useMutation({
    mutationFn: async ({ beneficiaryId, userId }: { beneficiaryId: string; userId: string }) => {
      const { error } = await supabase.from('beneficiaries').update({ user_id: userId }).eq('id', beneficiaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlinked-beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-beneficiaries'] });
      toast.success('تم ربط المستخدم بالمستفيد بنجاح');
    },
    onError: () => toast.error('فشل ربط المستخدم بالمستفيد'),
  });

  const createUser = useMutation({
    mutationFn: (data: { email: string; password: string; role: string; nationalId: string; name: string }) =>
      callAdminApi({ action: 'create_user', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم إنشاء المستخدم بنجاح');
      setIsCreateOpen(false);
      setCreateForm({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' });
      setCurrentPage(1);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const confirmEmail = useMutation({
    mutationFn: async (userId: string) => {
      setPendingConfirmId(userId);
      return callAdminApi({ action: 'confirm_email', userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تفعيل البريد الإلكتروني');
      setPendingConfirmId(null);
    },
    onError: (e: Error) => {
      toast.error(getSafeErrorMessage(e));
      setPendingConfirmId(null);
    },
  });

  const updateEmail = useMutation({
    mutationFn: (data: { userId: string; email: string }) =>
      callAdminApi({ action: 'update_email', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث البريد الإلكتروني');
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const updatePassword = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      callAdminApi({ action: 'update_password', ...data }),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور');
      setPasswordDialog(null);
      setNewPassword('');
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const setRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      callAdminApi({ action: 'set_role', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم تحديث الدور');
      setEditingUser(null);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminApi({ action: 'delete_user', userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف المستخدم');
      setDeleteTarget(null);
      setCurrentPage(1);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
  });

  const isSelf = (userId: string) => userId === currentUser?.id;

  return {
    // بيانات
    users, totalUsers, nextPage, isLoading, isError, error,
    orphanedBeneficiaries, unlinkedBeneficiaries,
    registrationEnabled, toggling,
    // حالات الحوار
    isCreateOpen, setIsCreateOpen,
    editingUser, setEditingUser,
    passwordDialog, setPasswordDialog,
    newPassword, setNewPassword,
    showPassword, setShowPassword,
    createForm, setCreateForm,
    editEmail, setEditEmail,
    editRole, setEditRole,
    deleteTarget, setDeleteTarget,
    pendingConfirmId,
    currentPage, setCurrentPage,
    // فلاتر
    userSearch, setUserSearch,
    roleFilter, setRoleFilter,
    statusFilterUser, setStatusFilterUser,
    // إجراءات
    toggleRegistration,
    createUser, confirmEmail, updateEmail, updatePassword,
    setRole: setRoleMutation, deleteUser, linkBeneficiary,
    isSelf,
    queryClient,
  };
};
