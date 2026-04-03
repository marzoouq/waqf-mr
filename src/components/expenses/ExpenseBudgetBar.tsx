/**
 * E-2: شريط تقدم الميزانية التقديرية للمصروفات
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Target } from 'lucide-react';
import { Expense } from '@/types/database';
import { safeNumber } from '@/utils/safeNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { fmt } from '@/utils/format';
import { useExpenseBudgets, useSaveBudget } from '@/hooks/data/useExpenseBudgets';
import type { BudgetRow } from '@/hooks/data/useExpenseBudgets';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';

interface ExpenseBudgetBarProps {
  expenses: Expense[];
  fiscalYearId: string;
  isClosed?: boolean;
}

const ExpenseBudgetBar = ({ expenses, fiscalYearId, isClosed }: ExpenseBudgetBarProps) => {
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: budgets = [] } = useExpenseBudgets(fiscalYearId);

  const { spentByType, allTypes, budgetMap } = useMemo(() => {
    const spentMap = new Map<string, number>();
    expenses.forEach(e => {
      spentMap.set(e.expense_type, (spentMap.get(e.expense_type) || 0) + safeNumber(e.amount));
    });
    const bMap = new Map<string, BudgetRow>();
    budgets.forEach(b => bMap.set(b.expense_type, b));
    const types = new Set<string>();
    budgets.forEach(b => types.add(b.expense_type));
    expenses.forEach(e => types.add(e.expense_type));
    return { spentByType: spentMap, allTypes: Array.from(types).sort(), budgetMap: bMap };
  }, [budgets, expenses]);

  const saveBudget = useSaveBudget(fiscalYearId, budgetMap);

  if (!fiscalYearId || isFyAll(fiscalYearId) || !isFyReady(fiscalYearId)) return null;
  if (allTypes.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Target className="w-5 h-5 text-primary" />الميزانية التقديرية للمصروفات</CardTitle>
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
                  {isOver80 && !isOver100 && <Badge variant="outline" className="text-warning border-warning/40 gap-1 text-[11px]"><AlertTriangle className="w-3 h-3" /> تحذير 80%</Badge>}
                  {isOver100 && <Badge variant="destructive" className="gap-1 text-[11px]"><AlertTriangle className="w-3 h-3" /> تجاوز!</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{fmt(spent)} / {budgetAmount > 0 ? fmt(budgetAmount) : '—'} ر.س</span>
                  {budgetAmount > 0 && <span className="font-bold">({percentage}%)</span>}
                  {!isClosed && (
                    editingType === type ? (
                      <div className="flex items-center gap-1">
                        <Input name="editValue" id="expense-budget-bar-field-1" type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-24 h-7 text-xs" dir="ltr" min={0} />
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { const amt = parseFloat(editValue); if (!Number.isFinite(amt) || amt < 0) { toast.error('مبلغ غير صالح'); return; } saveBudget.mutate({ expenseType: type, amount: amt }); setEditingType(null); }} disabled={saveBudget.isPending}>حفظ</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingType(null)}>✕</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => { setEditingType(type); setEditValue(budgetAmount.toString()); }}>تعديل</Button>
                    )
                  )}
                </div>
              </div>
              <Progress value={Math.min(percentage, 100)} className={`h-2 ${isOver100 ? '[&>div]:bg-destructive' : isOver80 ? '[&>div]:bg-warning' : ''}`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ExpenseBudgetBar;
