/**
 * طبقة domain: تجميع الدخل حسب السنة المالية وإرجاع IncomeComparison[] جاهز للعرض.
 * يعتمد على طبقة data: `useIncomeComparisonRaw`.
 */
import { useMemo } from 'react';
import { useIncomeComparisonRaw, type IncomeComparison } from '@/hooks/data/financial/income/useIncomeComparison';
import { safeNumber } from '@/utils/format/safeNumber';

export type { IncomeComparison } from '@/hooks/data/financial/income/useIncomeComparison';

export const useIncomeComparison = () => {
  const query = useIncomeComparisonRaw();

  const data = useMemo<IncomeComparison[]>(() => {
    const raw = query.data;
    if (!raw || !raw.years.length) return [];
    const totalsMap = new Map<string, number>();
    for (const row of raw.income) {
      if (!row.fiscal_year_id) continue;
      totalsMap.set(row.fiscal_year_id, (totalsMap.get(row.fiscal_year_id) ?? 0) + safeNumber(row.amount));
    }
    const results = raw.years.map(fy => ({ label: fy.label, total: totalsMap.get(fy.id) ?? 0 }));
    return results.reverse();
  }, [query.data]);

  return { ...query, data };
};
