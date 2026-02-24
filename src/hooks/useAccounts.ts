/**
 * هوكات إدارة الحسابات الختامية (CRUD)
 * يوفر: useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useAccountByFiscalYear
 * الجدول: accounts | يخزن القيم المالية المحسوبة لكل سنة مالية
 */
import { createCrudFactory } from '@/hooks/useCrudFactory';
import { Account } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

/**
 * جلب الحسابات مع فلترة server-side بالسنة المالية (label).
 * إذا لم يُمرر label، يجلب كل الحسابات.
 */
export const useAccountByFiscalYear = (fiscalYearLabel?: string) => {
  return useQuery({
    queryKey: ['accounts', 'fiscal_year', fiscalYearLabel ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (fiscalYearLabel) {
        query = query.eq('fiscal_year', fiscalYearLabel);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
};
