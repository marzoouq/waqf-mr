import { fmt } from '@/utils/format/format';

interface Props {
  expensesByType: Record<string, number>;
  totalExpenses: number;
  vatAmount: number;
}

const DisclosureExpensesBlock = ({ expensesByType, totalExpenses, vatAmount }: Props) => (
  <div>
    <h3 className="font-bold text-lg mb-3 text-destructive">المصروفات</h3>
    <div className="space-y-2">
      {Object.entries(expensesByType).map(([type, amount]) => (
        <div key={type} className="flex justify-between items-center py-2 border-b border-dashed">
          <span>{type}</span>
          <span className="text-destructive font-medium">-{fmt(amount)} ر.س</span>
        </div>
      ))}
      <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
        <span>إجمالي المصروفات التشغيلية</span>
        <span className="text-destructive">-{fmt(totalExpenses - vatAmount)} ر.س</span>
      </div>
      {vatAmount > 0 && (
        <div className="flex justify-between items-center py-2 border-b border-dashed">
          <span>ضريبة القيمة المضافة</span>
          <span className="text-destructive font-medium">-{fmt(vatAmount)} ر.س</span>
        </div>
      )}
      <div className="flex justify-between items-center py-2 font-bold bg-destructive/15 rounded px-2">
        <span>إجمالي المصروفات والضريبة</span>
        <span className="text-destructive">-{fmt(totalExpenses)} ر.س</span>
      </div>
    </div>
  </div>
);

export default DisclosureExpensesBlock;
