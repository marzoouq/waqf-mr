/**
 * دوال البحث الشامل — مستخرجة من useGlobalSearch
 */
import { supabase } from '@/integrations/supabase/client';
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { isFyReady } from '@/constants/fiscalYearIds';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'property' | 'contract' | 'beneficiary' | 'expense';
  path: string;
}

export async function executeGlobalSearch(
  term: string,
  options: { isAdmin: boolean; basePath: string; fiscalYearId?: string | null },
  signal: AbortSignal,
): Promise<SearchResult[]> {
  if (term.length < 2) return [];

  const searchResults: SearchResult[] = [];
  const pattern = `%${term}%`;
  const { isAdmin, basePath, fiscalYearId } = options;

  const contractSelectFields = 'id, contract_number, tenant_name, status, fiscal_year_id';
  const contractFilter = `contract_number.ilike.${pattern},tenant_name.ilike.${pattern}`;

  const buildContractQuery = () => {
    if (isAdmin) {
      let q = supabase.from('contracts').select(contractSelectFields).or(contractFilter).limit(5);
      if (isFyReady(fiscalYearId)) q = q.eq('fiscal_year_id', fiscalYearId!);
      return q.abortSignal(signal);
    } else {
      let q = supabase.from('contracts_safe').select(contractSelectFields).or(contractFilter).limit(5);
      if (isFyReady(fiscalYearId)) q = q.eq('fiscal_year_id', fiscalYearId!);
      return q.abortSignal(signal);
    }
  };

  const buildExpensesQuery = () => {
    let q = supabase.from('expenses').select('id, expense_type, description, amount, fiscal_year_id').or(`expense_type.ilike.${pattern},description.ilike.${pattern}`).limit(5);
    if (isFyReady(fiscalYearId)) q = q.eq('fiscal_year_id', fiscalYearId!);
    return q.abortSignal(signal);
  };

  const [propsRes, contractsRes, bensRes, expsRes] = await Promise.all([
    supabase.from('properties').select('id, property_number, property_type, location').or(`property_number.ilike.${pattern},location.ilike.${pattern},property_type.ilike.${pattern}`).limit(5).abortSignal(signal),
    buildContractQuery(),
    isAdmin ? supabase.from('beneficiaries').select('id, name, share_percentage').ilike('name', pattern).limit(5).abortSignal(signal) : Promise.resolve({ data: null as null }),
    isAdmin ? buildExpensesQuery() : Promise.resolve({ data: null as null }),
  ]);

  if (propsRes.data) {
    for (const p of propsRes.data) {
      searchResults.push({ id: p.id, title: `${p.property_number} - ${p.property_type}`, subtitle: p.location, type: 'property', path: `${basePath}/properties` });
    }
  }
  if (contractsRes.data) {
    for (const c of contractsRes.data) {
      searchResults.push({ id: c.id!, title: `عقد ${c.contract_number}`, subtitle: c.tenant_name || `حالة: ${c.status}`, type: 'contract', path: `${basePath}/contracts` });
    }
  }
  if (bensRes.data) {
    for (const b of bensRes.data) {
      searchResults.push({ id: b.id, title: b.name, subtitle: `${b.share_percentage}%`, type: 'beneficiary', path: `${basePath}/beneficiaries` });
    }
  }
  if (expsRes.data) {
    for (const e of expsRes.data) {
      searchResults.push({ id: e.id, title: e.expense_type, subtitle: `${fmt(safeNumber(e.amount))} ر.س${e.description ? ` — ${e.description}` : ''}`, type: 'expense', path: `${basePath}/expenses` });
    }
  }

  return searchResults;
}
