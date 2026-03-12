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

/** Contracts filtered by fiscal year (admin/accountant — full data) */
export const useContractsByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__' && fiscalYearId !== '__skip__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('*, property:properties(*), unit:units(*)')
        .order('start_date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      if (fiscalYearId === 'all') {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
  });
};

/** Contracts filtered by fiscal year (beneficiary/waqif — tenant PII stripped) */
export const useContractsSafeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts_safe', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__' && fiscalYearId !== '__skip__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('contracts_safe' as any)
        .select('*')
        .order('start_date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      if (fiscalYearId === 'all') {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Contract[];
    },
  });
};
