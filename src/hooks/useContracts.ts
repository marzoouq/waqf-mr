/**
 * هوكات إدارة العقود (CRUD)
 * يوفر: useContracts (جلب مع ربط العقار والوحدة), useCreateContract, useUpdateContract, useDeleteContract
 * الجدول: contracts | الربط: properties, units
 */
import { createCrudFactory } from './useCrudFactory';
import { Contract } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const contractsCrud = createCrudFactory<'contracts', Contract>({
  table: 'contracts',
  queryKey: 'contracts',
  select: '*, property:properties(*), unit:units(*)',
  label: 'العقد',
});

export const useContracts = contractsCrud.useList;
export const useCreateContract = contractsCrud.useCreate;
export const useUpdateContract = contractsCrud.useUpdate;
export const useDeleteContract = contractsCrud.useDelete;

/** Contracts filtered by fiscal year */
export const useContractsByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('*, property:properties(*), unit:units(*)')
        .order('start_date', { ascending: false })
        .limit(500);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
  });
};
