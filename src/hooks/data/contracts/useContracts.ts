/**
 * هوكات إدارة العقود (CRUD)
 * يوفر: useContracts (جلب مع ربط العقار والوحدة), useCreateContract, useUpdateContract, useDeleteContract
 * + useCreateContractWithInvoices (R1/W7-006): إنشاء ذرّي مع توليد الفواتير
 * الجدول: contracts | الربط: properties, units
 */
import { createCrudFactory } from '../core/useCrudFactory';
import { Contract } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import { contractsKeys } from '@/lib/queryKeys/contractsKeys';
import { invoicesKeys } from '@/lib/queryKeys/invoicesKeys';

/**
 * أعمدة العقد الكاملة — تشمل PII للمستأجر (id_number, tax_number, address...).
 * تُستخدم فقط للمسارات المحمية بـ RLS للناظر/المحاسب.
 * لقراءة آمنة للمستفيد/الواقف استخدم `useContractsSafeByFiscalYear` الذي يقرأ من view `contracts_safe`.
 */
const CONTRACT_SELECT_FIELDS = 'id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, notes, tenant_id_number, tenant_id_type, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, created_at, updated_at';
const CONTRACT_SELECT_WITH_JOINS = `${CONTRACT_SELECT_FIELDS}, property:properties(id, property_number, property_type, location, vat_exempt), unit:units(id, unit_number, unit_type, floor, status)`;

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
    queryKey: contractsKeys.byFiscalYear(fiscalYearId),
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
    queryKey: contractsKeys.safeByFiscalYear(fiscalYearId),
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

/**
 * R1/W7-006 — إنشاء عقد + توليد فواتيره في معاملة ذرّية واحدة.
 * يستدعي RPC `create_contract_with_invoices` التي تضمن الـ rollback
 * إذا فشل توليد الفواتير، فلا تتبقّى عقود يتيمة بلا فواتير.
 *
 * مخرج: `{ contract_id, invoice_count }`.
 */
export const useCreateContractWithInvoices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contractPayload: Record<string, unknown>) => {
      const result = await rpc<Array<{ contract_id: string; invoice_count: number }>>(
        'create_contract_with_invoices',
        { p_contract: contractPayload },
      );
      const row = Array.isArray(result) ? result[0] : (result as unknown as { contract_id: string; invoice_count: number });
      if (!row?.contract_id) throw new Error('فشل إنشاء العقد الذرّي');
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractsKeys.prefixes.contracts });
      qc.invalidateQueries({ queryKey: invoicesKeys.prefixes.paymentInvoices });
      qc.invalidateQueries({ queryKey: invoicesKeys.prefixes.contractSummary });
    },
  });
};
