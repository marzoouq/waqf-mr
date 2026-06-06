/**
 * Sub-hooks لحالة نماذج وحوارات إدارة المستخدمين.
 * مستخرجة من `useUserManagement` لتقليل كثافة `useState` فيه.
 * كل sub-hook يحمل قطعة state مرتبطة منطقياً + setters + reset.
 */
import { useCallback, useState } from 'react';
import type { ManagedUser } from './useUserManagementData';

const DEFAULT_CREATE_FORM = { email: '', password: '', role: 'beneficiary', nationalId: '', name: '' };

export function useCreateUserForm() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);

  const resetCreateForm = useCallback(() => {
    setCreateForm(DEFAULT_CREATE_FORM);
  }, []);

  return { isCreateOpen, setIsCreateOpen, createForm, setCreateForm, resetCreateForm };
}

export function useEditUserForm() {
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  return { editingUser, setEditingUser, editEmail, setEditEmail, editRole, setEditRole };
}

export function usePasswordDialogState() {
  const [passwordDialog, setPasswordDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetPasswordDialog = useCallback(() => {
    setPasswordDialog(null);
    setNewPassword('');
  }, []);

  return {
    passwordDialog,
    setPasswordDialog,
    newPassword,
    setNewPassword,
    showPassword,
    setShowPassword,
    resetPasswordDialog,
  };
}

export function useUserFilters() {
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilterUser, setStatusFilterUser] = useState<string>('all');

  return {
    userSearch,
    setUserSearch,
    roleFilter,
    setRoleFilter,
    statusFilterUser,
    setStatusFilterUser,
  };
}
