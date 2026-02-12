import { useCrudFactory } from '@/hooks/useCrudFactory';
import { Account } from '@/types/database';

const accountsCrud = useCrudFactory<'accounts', Account>({
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
