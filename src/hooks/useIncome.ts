/**
 * هوكات إدارة الإيرادات (CRUD)
 * يوفر: useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear
 * الجدول: income | الربط: properties | الترتيب: حسب التاريخ
 * عند إضافة دخل جديد: يتم إرسال إشعار تلقائي لجميع المستفيدين
 */
import { createCrudFactory } from './useCrudFactory';
import { Income } from '@/types/database';
// notifyAllBeneficiaries removed — notifications sent at distribution/close instead
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const incomeCrud = createCrudFactory<'income', Income>({
  table: 'income',
  queryKey: 'income',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'الدخل',
  // FIX #4: Removed automatic notifyAllBeneficiaries — was spamming beneficiaries on every single income entry.
  // Notifications are sent at distribution/fiscal-year-close instead.
});

export const useIncome = incomeCrud.useList;
export const useCreateIncome = incomeCrud.useCreate;
export const useUpdateIncome = incomeCrud.useUpdate;
export const useDeleteIncome = incomeCrud.useDelete;

/** Income filtered by fiscal year */
export const useIncomeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['income', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from('income').select('*, property:properties(*)').order('date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      // When filtering by specific fiscal year, fetch all records (no limit) for accurate financial calculations.
      // When 'all', cap at 1000 to avoid excessive payloads.
      if (fiscalYearId === 'all') {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Income[];
    },
  });
};
