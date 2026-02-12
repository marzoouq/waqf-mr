/**
 * هوكات إدارة الإيرادات (CRUD)
 * يوفر: useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear
 * الجدول: income | الربط: properties | الترتيب: حسب التاريخ
 * عند إضافة دخل جديد: يتم إرسال إشعار تلقائي لجميع المستفيدين
 */
import { useCrudFactory } from './useCrudFactory';
import { Income } from '@/types/database';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const incomeCrud = useCrudFactory<'income', Income>({
  table: 'income',
  queryKey: 'income',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'الدخل',
  onCreateSuccess: (data) => {
    notifyAllBeneficiaries(
      'دخل جديد',
      `تم تسجيل دخل جديد (${data.source}) بمبلغ ${Number(data.amount).toLocaleString('ar-SA')} ريال`,
      'payment',
      '/beneficiary/disclosure',
    );
  },
});

export const useIncome = incomeCrud.useList;
export const useCreateIncome = incomeCrud.useCreate;
export const useUpdateIncome = incomeCrud.useUpdate;
export const useDeleteIncome = incomeCrud.useDelete;

/** Income filtered by fiscal year */
export const useIncomeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['income', 'fiscal_year', fiscalYearId],
    queryFn: async () => {
      let query = supabase.from('income').select('*, property:properties(*)').order('date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Income[];
    },
  });
};
