/**
 * هوك إدارة المستخدمين — منسّق يجمع الاستعلامات والمعالجات
 * Queries مفصولة في useUserQueries.ts
 * Mutations مفصولة في useUserMutations.ts
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { useUserQueries } from './useUserQueries';
import { useUserMutations, callAdminApi } from './useUserMutations';

export type { ManagedUser } from './useUserQueries';

export const useUserManagement = () => {
  const queryClient = useQueryClient();

  // حالة الحوارات
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<import('./useUserQueries').ManagedUser | null>(null);
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

  // فلاتر
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilterUser, setStatusFilterUser] = useState<string>('all');

  // استعلامات
  const queries = useUserQueries(currentPage, { userSearch, roleFilter, statusFilterUser });

  // mutations
  const mutations = useUserMutations({
    onCreateSuccess: () => { setIsCreateOpen(false); setCreateForm({ email: '', password: '', role: 'beneficiary', nationalId: '', name: '' }); },
    onEditClose: () => setEditingUser(null),
    onPasswordClose: () => { setPasswordDialog(null); setNewPassword(''); },
    onDeleteClose: () => setDeleteTarget(null),
    setPendingConfirmId,
    setCurrentPage,
  });

  const toggleRegistration = useCallback(async (enabled: boolean) => {
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
  }, [queryClient]);

  return {
    ...queries, toggling,
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
    ...mutations,
    queryClient,
  };
};
