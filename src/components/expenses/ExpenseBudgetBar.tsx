/**
 * E-2: شريط تقدم الميزانية التقديرية للمصروفات
 * يعرض نسبة الصرف لكل فئة مع تحذير عند تجاوز 80%
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Target } from 'lucide-react';
import { Expense } from '@/types/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExpenseBudgetBarProps {
  expenses: Expense[];
  fiscalYearId: string;
  isClosed?: boolean;
}

interface BudgetRow {
  id: string;
  expense_type: string;
  budget_amount: number;
  fiscal_year_id: string;
}

const ExpenseBudgetBar = ({ expenses, fiscalYearId, isClosed }: ExpenseBudgetBarProps) => {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // جلب الميزانيات
  const { data: budgets = [] } = useQuery({
    queryKey: ['expense_budgets', fiscalYearId],
    enabled: !!fiscalYearId && fiscalYearId !== 'all' && fiscalYearId !== '__none__',
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from('expense_budgets')
        .select('*')
        .eq('fiscal_year_id', fiscalYearId);
      if (error) throw error;
      return (data || []) as unknown as BudgetRow[];
    },
  });

  // حساب المصروف الفعلي لكل فئة
  const spentByType = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      map.set(e.expense_type, (map.get(e.expense_type) || 0) + Number(e.amount));
    });
    return map;
  }, [expenses]);

  // كل الأنواع (ميزانية + فعلي)
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    budgets.forEach(b => types.add(b.expense_type));
    expenses.forEach(e => types.add(e.expense_type));
    return Array.from(types).sort();
  }, [budgets, expenses]);

  const budgetMap = useMemo(() => {
    const map = new Map<string, BudgetRow>();
    budgets.forEach(b => map.set(b.expense_type, b));
    return map;
  }, [budgets]);

  // حفظ/تحديث ميزانية
  const saveBudget = useMutation({
    mutationFn: async ({ expenseType, amount }: { expenseType: string; amount: number }) => {
      const existing = budgetMap.get(expenseType);
      const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
      if (existing) {
        const { error } = await db
          .from('expense_budgets')
          .update({ budget_amount: amount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from('expense_budgets')
          .insert({ fiscal_year_id: fiscalYearId, expense_type: expenseType, budget_amount: amount });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_budgets', fiscalYearId] });
      toast.success('تم حفظ الميزانية');
      setEditingType(null);
    },
    onError: () => toast.error('فشل حفظ الميزانية'),
  });

  if (!fiscalYearId || fiscalYearId === 'all' || fiscalYearId === '__none__') return null;
  if (allTypes.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-5 h-5 text-primary" />
          الميزانية التقديرية للمصروفات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allTypes.map(type => {
          const budget = budgetMap.get(type);
          const budgetAmount = budget?.budget_amount || 0;
          const spent = spentByType.get(type) || 0;
          const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
          const isOver80 = percentage >= 80;
          const isOver100 = percentage > 100;

          return (
            <div key={type} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{type}</span>
                  {isOver80 && !isOver100 && (
                    <Badge variant="outline" className="text-warning border-warning/40 gap-1 text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> تحذير 80%
                    </Badge>
                  )}
                  {isOver100 && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> تجاوز!
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{spent.toLocaleString()} / {budgetAmount > 0 ? budgetAmount.toLocaleString() : '—'} ر.س</span>
                  {budgetAmount > 0 && <span className="font-bold">({percentage}%)</span>}
                  {!isClosed && (
                    editingType === type ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-24 h-7 text-xs"
                          dir="ltr"
                          min={0}
                        />
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          onClick={() => {
                            const amt = parseFloat(editValue);
                            if (!Number.isFinite(amt) || amt < 0) { toast.error('مبلغ غير صالح'); return; }
                            saveBudget.mutate({ expenseType: type, amount: amt });
                          }}
                          disabled={saveBudget.isPending}
                        >حفظ</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingType(null)}>✕</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary"
                        onClick={() => { setEditingType(type); setEditValue(budgetAmount.toString()); }}
                      >تعديل</Button>
                    )
                  )}
                </div>
              </div>
              <Progress
                value={Math.min(percentage, 100)}
                className={`h-2 ${isOver100 ? '[&>div]:bg-destructive' : isOver80 ? '[&>div]:bg-warning' : ''}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ExpenseBudgetBar;
