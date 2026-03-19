/**
 * هوكات إدارة العقود (CRUD)
 * يوفر: useContracts (جلب مع ربط العقار والوحدة), useCreateContract, useUpdateContract, useDeleteContract
 * الجدول: contracts | الربط: properties, units
 */
import { createCrudFactory } from './useCrudFactory';
import { Contract } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

/** Contracts filtered by fiscal year */
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

/**
 * عقود آمنة للمستفيد/الواقف — تقرأ من عرض contracts_safe
 * تخفي بيانات المستأجر الشخصية (هوية، ضريبي، عنوان)
 */
export const useContractsSafeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['contracts_safe', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__' && fiscalYearId !== '__skip__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('contracts_safe')
        .select('id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, updated_at, tenant_id_number, tenant_id_type, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, notes')
        .order('start_date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      if (fiscalYearId === 'all') {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
