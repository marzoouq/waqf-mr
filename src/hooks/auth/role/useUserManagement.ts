/**
 * هوك إدارة المستخدمين — منظّم يجمع البيانات + العمليات + حالة UI
 * حالة النماذج والحوارات مستخرجة في `useUserManagementForms`.
 */
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useAdminUsers, useOrphanedBeneficiaries, useUnlinkedBeneficiaries } from './useUserManagementData';
import { useRegistrationEnabled } from '@/hooks/data/settings';
import type { ManagedUser } from './useUserManagementData';
import {
  useCreateUserMutation, useConfirmEmailMutation, useUpdateEmailMutation,
  useUpdatePasswordMutation, useSetRoleMutation, useDeleteUserMutation,
  useLinkBeneficiaryMutation, useToggleRegistration,
} from './useUserManagementMutations';
import {
  useCreateUserForm, useEditUserForm, usePasswordDialogState, useUserFilters,
} from './useUserManagementForms';

export type { ManagedUser } from './useUserManagementData';

export const useUserManagement = () => {
  const { user: currentUser } = useAuth();

  // sub-hooks لحالة UI المرتبطة منطقياً
  const createFormState = useCreateUserForm();
  const editFormState = useEditUserForm();
  const passwordState = usePasswordDialogState();
  const filtersState = useUserFilters();

  // حالة مستقلة منفردة
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // استعلامات البيانات
  const { data: registrationEnabled = false } = useRegistrationEnabled();
  const { data: usersResult = { users: [] as ManagedUser[], total: 0, nextPage: null as number | null }, isLoading, isError, error } = useAdminUsers(currentPage);
  // لا تجلب بيانات المستفيدين إلا عند الحاجة (الصفحة مفتوحة فعلاً)
  const { data: orphanedBeneficiaries = [] } = useOrphanedBeneficiaries(showAdvanced);
  const { data: unlinkedBeneficiaries = [] } = useUnlinkedBeneficiaries(showAdvanced);

  const allUsers = usersResult.users;
  const totalUsers = usersResult.total;
  const nextPage = usersResult.nextPage;

  // فلترة محلية
  const users = useMemo(() => {
    let result = allUsers;
    if (filtersState.userSearch) {
      const q = filtersState.userSearch.toLowerCase();
      result = result.filter(u => u.email.toLowerCase().includes(q));
    }
    if (filtersState.roleFilter !== 'all') {
      result = result.filter(u => (u.role || 'none') === filtersState.roleFilter);
    }
    if (filtersState.statusFilterUser === 'confirmed') {
      result = result.filter(u => !!u.email_confirmed_at);
    } else if (filtersState.statusFilterUser === 'unconfirmed') {
      result = result.filter(u => !u.email_confirmed_at);
    }
    return result;
  }, [allUsers, filtersState.userSearch, filtersState.roleFilter, filtersState.statusFilterUser]);

  // Mutations
  const toggleRegistrationMut = useToggleRegistration();
  const createUser = useCreateUserMutation(() => {
    createFormState.setIsCreateOpen(false);
    createFormState.resetCreateForm();
    setCurrentPage(1);
  });
  const confirmEmail = useConfirmEmailMutation();
  const updateEmail = useUpdateEmailMutation(() => editFormState.setEditingUser(null));
  const updatePassword = useUpdatePasswordMutation(() => passwordState.resetPasswordDialog());
  const setRoleMutation = useSetRoleMutation(() => editFormState.setEditingUser(null));
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
    showAdvanced, setShowAdvanced,
    registrationEnabled, toggling: toggleRegistrationMut.isPending,
    // create form
    isCreateOpen: createFormState.isCreateOpen,
    setIsCreateOpen: createFormState.setIsCreateOpen,
    createForm: createFormState.createForm,
    setCreateForm: createFormState.setCreateForm,
    // edit form
    editingUser: editFormState.editingUser,
    setEditingUser: editFormState.setEditingUser,
    editEmail: editFormState.editEmail,
    setEditEmail: editFormState.setEditEmail,
    editRole: editFormState.editRole,
    setEditRole: editFormState.setEditRole,
    // password dialog
    passwordDialog: passwordState.passwordDialog,
    setPasswordDialog: passwordState.setPasswordDialog,
    newPassword: passwordState.newPassword,
    setNewPassword: passwordState.setNewPassword,
    showPassword: passwordState.showPassword,
    setShowPassword: passwordState.setShowPassword,
    // delete + pagination
    deleteTarget, setDeleteTarget,
    pendingConfirmId,
    currentPage, setCurrentPage,
    // filters
    userSearch: filtersState.userSearch,
    setUserSearch: filtersState.setUserSearch,
    roleFilter: filtersState.roleFilter,
    setRoleFilter: filtersState.setRoleFilter,
    statusFilterUser: filtersState.statusFilterUser,
    setStatusFilterUser: filtersState.setStatusFilterUser,
    // actions
    toggleRegistration,
    createUser, confirmEmail: wrappedConfirmEmail, updateEmail, updatePassword,
    setRole: setRoleMutation, deleteUser, linkBeneficiary,
    isSelf,
  };
};
