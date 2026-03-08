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
export const useAccountByFiscalYear = (
  fiscalYearLabel?: string,
  fiscalYearId?: string,
) => {
  return useQuery({
    queryKey: ['accounts', 'fiscal_year', fiscalYearId ?? fiscalYearLabel ?? 'all'],
    enabled: fiscalYearId !== '__none__',
    staleTime: 30_000,
    retry: 2,
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (fiscalYearId) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      } else if (fiscalYearLabel) {
        query = query.eq('fiscal_year', fiscalYearLabel);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Fallback: إذا لم تُرجع نتائج بـ fiscal_year_id، نبحث بـ fiscal_year (النص)
      if ((!data || data.length === 0) && fiscalYearId && fiscalYearLabel) {
        const { data: fallbackData, error: fbError } = await supabase
          .from('accounts')
          .select('*')
          .eq('fiscal_year', fiscalYearLabel)
          .order('created_at', { ascending: false })
          .limit(100);
        if (fbError) throw fbError;
        return fallbackData ?? [];
      }

      return data ?? [];
    },
  });
};
