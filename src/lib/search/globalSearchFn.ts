/**
 * globalSearchFn — مُجمِّع نتائج البحث الشامل
 *
 * يستهلك lib/services/searchService ويُشكّل النتائج الموحّدة للـ UI.
 * لا يحتوي SQL مباشراً.
 */
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import {
  searchProperties,
  searchContracts,
  searchBeneficiaries,
  searchExpenses,
} from '@/lib/services/searchService';

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

  const { isAdmin, basePath, fiscalYearId } = options;
  const opts = { pattern: `%${term}%`, fiscalYearId: fiscalYearId ?? undefined, signal };

  const [props, contracts, beneficiaries, expenses] = await Promise.all([
    searchProperties(opts),
    searchContracts(opts, isAdmin ? 'admin' : 'safe'),
    isAdmin ? searchBeneficiaries(opts) : Promise.resolve([]),
    isAdmin ? searchExpenses(opts) : Promise.resolve([]),
  ]);

  const results: SearchResult[] = [];

  for (const p of props) {
    results.push({
      id: p.id,
      title: `${p.property_number} - ${p.property_type}`,
      subtitle: p.location,
      type: 'property',
      path: `${basePath}/properties`,
    });
  }
  for (const c of contracts) {
    results.push({
      id: c.id,
      title: `عقد ${c.contract_number}`,
      subtitle: c.tenant_name || `حالة: ${c.status}`,
      type: 'contract',
      path: `${basePath}/contracts`,
    });
  }
  for (const b of beneficiaries) {
    results.push({
      id: b.id,
      title: b.name,
      subtitle: `${b.share_percentage}%`,
      type: 'beneficiary',
      path: `${basePath}/beneficiaries`,
    });
  }
  for (const e of expenses) {
    results.push({
      id: e.id,
      title: e.expense_type,
      subtitle: `${fmt(safeNumber(e.amount))} ر.س${e.description ? ` — ${e.description}` : ''}`,
      type: 'expense',
      path: `${basePath}/expenses`,
    });
  }

  return results;
}
