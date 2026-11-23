import { fmt } from '@/utils/format/format';
import InfoHint from './InfoHint';

interface Props {
  expensesByType: Record<string, number>;
  totalExpenses: number;
  vatAmount: number;
  /** السنة المقفلة تُعرض كما صدرت دون تغيير */
  isClosed?: boolean;
}

export const VAT_HINT = 'ضريبة مستحقة على إيرادات الإيجار، وليست مصروفاً تشغيلياً.';

const Row = ({ label, amount, hint }: { label: string; amount: number; hint?: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-dashed">
    <span className="flex items-center gap-1">{label}{hint && <InfoHint text={hint} label={`شرح ${label}`} />}</span>
    <span className="text-destructive font-medium">-{fmt(amount)} ر.س</span>
  </div>
);

const DisclosureExpensesBlock = ({ expensesByType, totalExpenses, vatAmount, isClosed = false }: Props) => {
  const entries = Object.entries(expensesByType);
  // السنوات غير المقفلة: الإجمالي التشغيلي = مجموع البنود، والضريبة سطر مستقل بلا إجمالي مدمج
  const operationalTotal = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div>
      <h3 className="font-bold text-lg mb-3 text-destructive">المصروفات</h3>
      <div className="space-y-2">
        {entries.map(([type, amount]) => <Row key={type} label={type} amount={amount} />)}
        {isClosed ? (
          <>
            <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
              <span>إجمالي المصروفات التشغيلية</span>
              <span className="text-destructive">-{fmt(totalExpenses - vatAmount)} ر.س</span>
            </div>
            {vatAmount > 0 && <Row label="ضريبة القيمة المضافة" amount={vatAmount} />}
            <div className="flex justify-between items-center py-2 font-bold bg-destructive/15 rounded px-2">
              <span>إجمالي المصروفات والضريبة</span>
              <span className="text-destructive">-{fmt(totalExpenses)} ر.س</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
              <span>إجمالي المصروفات التشغيلية</span>
              <span className="text-destructive">-{fmt(operationalTotal)} ر.س</span>
            </div>
            {vatAmount > 0 && <Row label="ضريبة القيمة المضافة" amount={vatAmount} hint={VAT_HINT} />}
          </>
        )}
      </div>
    </div>
  );
};

export default DisclosureExpensesBlock;
