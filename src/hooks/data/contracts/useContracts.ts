/**
 * هوكات إدارة العقود (CRUD)
 * يوفر: useContracts (جلب مع ربط العقار والوحدة), useCreateContract, useUpdateContract, useDeleteContract
 * الجدول: contracts | الربط: properties, units
 */
import { createCrudFactory } from '../core/useCrudFactory';
import { Contract } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';

/** أعمدة العقد المطلوبة للواجهة — بدون PII خام */
const CONTRACT_SELECT_FIELDS = 'id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, notes, tenant_id_number, tenant_id_type, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, created_at, updated_at';
const CONTRACT_SELECT_WITH_JOINS = `${CONTRACT_SELECT_FIELDS}, property:properties(id, property_number, property_type, location), unit:units(id, unit_number, unit_type, floor, status)`;

const contractsCrud = createCrudFactory<'contracts', Contract>({
  table: 'contracts',
  queryKey: 'contracts',
  select: CONTRACT_SELECT_WITH_JOINS,
  label: 'العقد',
});

export const useContracts = contractsCrud.useList;
export const useCreateContract = contractsCrud.useCreate;
export const useUpdateContract = contractsCrud.useUpdate;
export const useDeleteContract = contractsCrud.useDelete;
export const contractsQueryOptions = contractsCrud.getQueryOptions;

/** Contracts filtered by fiscal year */
export const useContractsByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts', 'fiscal_year', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(CONTRACT_SELECT_WITH_JOINS)
        .order('start_date', { ascending: false });
      if (!isFyAll(fiscalYearId)) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      if (isFyAll(fiscalYearId)) {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
  });
};

/**
 * عقود آمنة للمستفيد/الواقف — تقرأ من عرض contracts_safe
 * تخفي بيانات المستأجر الشخصية (هوية، ضريبي، عنوان)
 */
export const useContractsSafeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts_safe', 'fiscal_year', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let query = supabase
        .from('contracts_safe')
        .select('id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, updated_at, notes')
        .order('start_date', { ascending: false });
      if (!isFyAll(fiscalYearId)) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      if (isFyAll(fiscalYearId)) {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
