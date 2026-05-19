/**
 * searchService — استعلامات البحث الشامل
 *
 * طبقة وصول بيانات (data-access service) لكيانات البحث.
 * تُستهلك من lib/search/globalSearchFn.ts (composer) أو من أي page hook
 * يحتاج بحثاً جزئياً. ليست pure — تعتمد على Supabase وAbortSignal.
 */
import { supabase } from '@/integrations/supabase/client';
import { isFyReady } from '@/constants/fiscalYearIds';

export interface SearchOpts {
  pattern: string;
  fiscalYearId?: string;
  limit?: number;
  signal: AbortSignal;
}

export interface PropertySearchRow {
  id: string;
  property_number: string;
  property_type: string;
  location: string;
}

export interface ContractSearchRow {
  id: string;
  contract_number: string;
  tenant_name: string | null;
  status: string;
  fiscal_year_id?: string | null;
}

export interface BeneficiarySearchRow {
  id: string;
  name: string;
  share_percentage: number;
}

export interface ExpenseSearchRow {
  id: string;
  expense_type: string;
  description: string | null;
  amount: number;
  fiscal_year_id?: string | null;
}

const CONTRACT_FIELDS = 'id, contract_number, tenant_name, status, fiscal_year_id';

export async function searchProperties({ pattern, limit = 5, signal }: SearchOpts): Promise<PropertySearchRow[]> {
  const { data } = await supabase
    .from('properties')
    .select('id, property_number, property_type, location')
    .or(`property_number.ilike.${pattern},location.ilike.${pattern},property_type.ilike.${pattern}`)
    .limit(limit)
    .abortSignal(signal);
  return (data ?? []) as PropertySearchRow[];
}

export async function searchContracts(
  { pattern, fiscalYearId, limit = 5, signal }: SearchOpts,
  variant: 'admin' | 'safe',
): Promise<ContractSearchRow[]> {
  const filter = `contract_number.ilike.${pattern},tenant_name.ilike.${pattern}`;
  if (variant === 'admin') {
    let q = supabase.from('contracts').select(CONTRACT_FIELDS).or(filter).limit(limit);
    if (isFyReady(fiscalYearId)) q = q.eq('fiscal_year_id', fiscalYearId!);
    const { data } = await q.abortSignal(signal);
    return (data ?? []) as ContractSearchRow[];
  }
  let q = supabase.from('contracts_safe').select(CONTRACT_FIELDS).or(filter).limit(limit);
  if (isFyReady(fiscalYearId)) q = q.eq('fiscal_year_id', fiscalYearId!);
  const { data } = await q.abortSignal(signal);
  return (data ?? []) as ContractSearchRow[];
}

export async function searchBeneficiaries({ pattern, limit = 5, signal }: SearchOpts): Promise<BeneficiarySearchRow[]> {
  const { data } = await supabase
    .from('beneficiaries')
    .select('id, name, share_percentage')
    .ilike('name', pattern)
    .limit(limit)
    .abortSignal(signal);
  return (data ?? []) as BeneficiarySearchRow[];
}

export async function searchExpenses({ pattern, fiscalYearId, limit = 5, signal }: SearchOpts): Promise<ExpenseSearchRow[]> {
  let q = supabase
    .from('expenses')
    .select('id, expense_type, description, amount, fiscal_year_id')
    .or(`expense_type.ilike.${pattern},description.ilike.${pattern}`)
    .limit(limit);
  if (isFyReady(fiscalYearId)) q = q.eq('fiscal_year_id', fiscalYearId!);
  const { data } = await q.abortSignal(signal);
  return (data ?? []) as ExpenseSearchRow[];
}
