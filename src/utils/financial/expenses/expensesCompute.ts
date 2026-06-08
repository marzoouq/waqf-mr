/**
 * دوال نقية لتصفية وترتيب سجلات المصروفات.
 * مستخرجة من `useExpensesPage` للحفاظ على حجم الهوك.
 */
import type { Expense } from '@/types';
import type { FilterState } from '@/types/ui';
import { safeNumber } from '@/utils/format/safeNumber';

export type ExpenseSortField = 'amount' | 'date' | 'expense_type' | null;
export type SortDir = 'asc' | 'desc';

export function filterAndSortExpenses(
  expenses: Expense[],
  searchQuery: string,
  filters: FilterState,
  sortField: ExpenseSortField,
  sortDir: SortDir,
): Expense[] {
  let result = expenses.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.expense_type.toLowerCase().includes(q) &&
          !(item.description || '').toLowerCase().includes(q) &&
          !item.date.includes(q)) return false;
    }
    if (filters.category && item.expense_type !== filters.category) return false;
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
      else if (sortField === 'expense_type') cmp = a.expense_type.localeCompare(b.expense_type, 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }
  return result;
}
