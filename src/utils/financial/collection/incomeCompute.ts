/**
 * دوال نقية لحساب ملخص الدخل وتصفية/ترتيب السجلات.
 * مستخرجة من `useIncomePage` للحفاظ على الحجم الموصى به للهوكات.
 */
import type { Income } from '@/types';
import type { FilterState } from '@/types/ui';
import { safeNumber } from '@/utils/format/safeNumber';

export type IncomeSortField = 'amount' | 'date' | 'source' | null;
export type SortDir = 'asc' | 'desc';

export interface IncomeSummaryCards {
  count: number;
  avg: number;
  topSource: string;
  topSourceAmount: number;
}

export function buildIncomeSummaryCards(income: Income[], totalIncome: number): IncomeSummaryCards {
  const count = income.length;
  const avg = count > 0 ? Math.round(totalIncome / count) : 0;
  const sourceMap = new Map<string, number>();
  income.forEach(i => sourceMap.set(i.source, (sourceMap.get(i.source) || 0) + safeNumber(i.amount)));
  let topSource = '-';
  let topSourceAmount = 0;
  sourceMap.forEach((amount, source) => {
    if (amount > topSourceAmount) { topSourceAmount = amount; topSource = source; }
  });
  return { count, avg, topSource, topSourceAmount };
}

export function filterAndSortIncome(
  income: Income[],
  searchQuery: string,
  filters: FilterState,
  sortField: IncomeSortField,
  sortDir: SortDir,
): Income[] {
  let result = income.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.source.toLowerCase().includes(q) &&
          !(item.notes || '').toLowerCase().includes(q) &&
          !item.date.includes(q)) return false;
    }
    if (filters.category && item.source !== filters.category) return false;
    if (filters.propertyId && item.property_id !== filters.propertyId) return false;
    if (filters.dateFrom && item.date < filters.dateFrom) return false;
    if (filters.dateTo && item.date > filters.dateTo) return false;
    return true;
  });

  if (sortField) {
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'amount') cmp = safeNumber(a.amount) - safeNumber(b.amount);
      else if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'source') cmp = a.source.localeCompare(b.source, 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }
  return result;
}
