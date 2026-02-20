/**
 * هوكات إدارة الحسابات الختامية (CRUD)
 * يوفر: useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount
 * الجدول: accounts | يخزن القيم المالية المحسوبة لكل سنة مالية
 */
import { createCrudFactory } from '@/hooks/useCrudFactory';
import { Account } from '@/types/database';

const accountsCrud = createCrudFactory<'accounts', Account>({
  table: 'accounts',
  queryKey: 'accounts',
  orderBy: 'created_at',
  ascending: false,
  label: 'الحساب',
});

export const useAccounts = accountsCrud.useList;
export const useCreateAccount = accountsCrud.useCreate;
export const useUpdateAccount = accountsCrud.useUpdate;
export const useDeleteAccount = accountsCrud.useDelete;
