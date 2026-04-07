/**
 * هوك إدارة المستخدمين — منظّم يجمع البيانات + العمليات + حالة UI
 */
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useRegistrationEnabled, useAdminUsers, useOrphanedBeneficiaries, useUnlinkedBeneficiaries } from './useUserManagementData';
import type { ManagedUser } from './useUserManagementData';
import {
  useCreateUserMutation, useConfirmEmailMutation, useUpdateEmailMutation,
  useUpdatePasswordMutation, useSetRoleMutation, useDeleteUserMutation,
  useLinkBeneficiaryMutation, useToggleRegistration,
} from './useUserManagementMutations';

export type { ManagedUser } from './useUserManagementData';

export const useUserManagement = () => {
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
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // بحث وفلتر
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilterUser, setStatusFilterUser] = useState<string>('all');

  // استعلامات البيانات
  const { data: registrationEnabled = false } = useRegistrationEnabled();
  const { data: usersResult = { users: [] as ManagedUser[], total: 0, nextPage: null as number | null }, isLoading, isError, error } = useAdminUsers(currentPage);
  // #19: لا تجلب بيانات المستفيدين إلا عند الحاجة (الصفحة مفتوحة فعلاً)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: orphanedBeneficiaries = [] } = useOrphanedBeneficiaries(showAdvanced);
  const { data: unlinkedBeneficiaries = [] } = useUnlinkedBeneficiaries(showAdvanced);

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

  // Mutations
  const toggleRegistrationMut = useToggleRegistration();
  const createUser = useCreateUserMutation(() => {
    setIsCreateOpen(false);
    setCreateForm({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' });
    setCurrentPage(1);
  });
  const confirmEmail = useConfirmEmailMutation();
  const updateEmail = useUpdateEmailMutation(() => setEditingUser(null));
  const updatePassword = useUpdatePasswordMutation(() => { setPasswordDialog(null); setNewPassword(''); });
  const setRoleMutation = useSetRoleMutation(() => setEditingUser(null));
  const deleteUser = useDeleteUserMutation(() => { setDeleteTarget(null); setCurrentPage(1); });
  const linkBeneficiary = useLinkBeneficiaryMutation();

  // تتبع pendingConfirmId يدوياً
  const wrappedConfirmEmail = {
    ...confirmEmail,
    mutate: (userId: string) => { setPendingConfirmId(userId); confirmEmail.mutate(userId, { onSettled: () => setPendingConfirmId(null) }); },
    mutateAsync: async (userId: string) => { setPendingConfirmId(userId); try { return await confirmEmail.mutateAsync(userId); } finally { setPendingConfirmId(null); } },
  };

  const toggleRegistration = async (enabled: boolean) => {
    toggleRegistrationMut.mutate(enabled);
  };

  const isSelf = (userId: string) => userId === currentUser?.id;

  return {
    users, totalUsers, nextPage, isLoading, isError, error,
    orphanedBeneficiaries, unlinkedBeneficiaries,
    registrationEnabled, toggling: toggleRegistrationMut.isPending,
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
    userSearch, setUserSearch,
    roleFilter, setRoleFilter,
    statusFilterUser, setStatusFilterUser,
    toggleRegistration,
    createUser, confirmEmail: wrappedConfirmEmail, updateEmail, updatePassword,
    setRole: setRoleMutation, deleteUser, linkBeneficiary,
    isSelf,
  };
};
