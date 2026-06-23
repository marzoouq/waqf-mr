/**
 * هوك بيانات ميزانيات المصروفات — طبقة بيانات نقية (لا توستات)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFySpecific } from '@/constants/fiscalYearIds';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

export interface BudgetRow {
  id: string;
  expense_type: string;
  budget_amount: number;
  fiscal_year_id: string;
}

export const useExpenseBudgets = (fiscalYearId: string) => {
  return useQuery({
    queryKey: financialKeys.expenses.budgets(fiscalYearId),
    enabled: !!isFySpecific(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: async ({ signal: _signal }) => {
      const { data, error } = await supabase
        .from('expense_budgets')
        .select('id, fiscal_year_id, expense_type, budget_amount, created_at, updated_at')
        .eq('fiscal_year_id', fiscalYearId);
      if (error) throw error;
      return (data || []) as BudgetRow[];
    },
  });
};

export const useSaveBudget = (fiscalYearId: string, budgetMap: Map<string, BudgetRow>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseType, amount }: { expenseType: string; amount: number }) => {
      const existing = budgetMap.get(expenseType);
      if (existing) {
        const { error } = await supabase
          .from('expense_budgets')
          .update({ budget_amount: amount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expense_budgets')
          .insert({ fiscal_year_id: fiscalYearId, expense_type: expenseType, budget_amount: amount });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.expenses.budgets(fiscalYearId) });
    },
  });
};
