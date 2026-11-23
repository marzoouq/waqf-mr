/**
 * ملخص المصروفات (الهوية الوقفية) — الضريبة لا تدخل هنا؛ تُعرض في سطرها المستقل.
 */
import { useMemo } from 'react';
import { Paperclip, Calculator, Star } from 'lucide-react';
import { Expense } from '@/types';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { fmt } from '@/utils/format/format';

interface ExpenseSummaryCardsProps {
  expenses: Expense[];
  totalExpenses: number;
  documentedCount: number;
  documentationRate: number;
  isLoading: boolean;
}

const ExpenseSummaryCards = ({ expenses, totalExpenses, documentedCount, documentationRate, isLoading }: ExpenseSummaryCardsProps) => {
  const { avg, topType, topTypeAmount } = useMemo(() => {
    const count = expenses.length;
    const avg = count > 0 ? Math.round(totalExpenses / count) : 0;
    const typeMap = new Map<string, number>();
    expenses.forEach(e => typeMap.set(e.expense_type, (typeMap.get(e.expense_type) || 0) + Number(e.amount)));
    let topType = '-';
    let topTypeAmount = 0;
    typeMap.forEach((amount, type) => { if (amount > topTypeAmount) { topTypeAmount = amount; topType = type; } });
    return { avg, topType, topTypeAmount };
  }, [expenses, totalExpenses]);

  return (
    <FigureTileGrid isLoading={isLoading}>
      <FigureTile label="إجمالي المصروفات" value={totalExpenses} icon={DOMAIN_ICONS.expense} tone="expense" />
      <FigureTile
        label="نسبة التوثيق" value={documentationRate} icon={Paperclip} unit="percent"
        tone={documentationRate >= 80 ? 'success' : 'warning'}
        hint={<span data-testid="documented-count"><bdi dir="ltr" className="num">{documentedCount}/{expenses.length}</bdi> مستند مرفق</span>}
      />
      <FigureTile label="متوسط المصروف" value={avg} icon={Calculator} />
      <FigureTile
        label="أعلى نوع" value={topType} icon={Star} tone="share" unit="text"
        hint={<><bdi dir="ltr" className="num">{fmt(topTypeAmount)}</bdi> ر.س</>}
      />
    </FigureTileGrid>
  );
};

export default ExpenseSummaryCards;
