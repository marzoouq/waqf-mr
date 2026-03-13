/**
 * هوكات إدارة الإيرادات (CRUD)
 * يوفر: useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear
 * الجدول: income | الربط: properties | الترتيب: حسب التاريخ
 */
import { createCrudFactory } from './useCrudFactory';
import { Income } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const incomeCrud = createCrudFactory<'income', Income>({
  table: 'income',
  queryKey: 'income',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'الدخل',
});

export const useIncome = incomeCrud.useList;
export const useCreateIncome = incomeCrud.useCreate;
export const useUpdateIncome = incomeCrud.useUpdate;
export const useDeleteIncome = incomeCrud.useDelete;

const PER_FY_LIMIT = 2000;

/** Income filtered by fiscal year */
export const useIncomeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['income', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from('income').select('*, property:properties(*)').order('date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId).limit(PER_FY_LIMIT);
      } else {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length >= PER_FY_LIMIT) {
        toast.warning('تم عرض أول 2,000 سجل إيرادات — قد توجد سجلات إضافية. يُرجى تضييق الفلترة.');
      }
      return data as Income[];
    },
  });
};
