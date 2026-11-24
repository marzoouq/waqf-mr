import { fmt } from '@/utils/format/format';
import InfoHint from './InfoHint';

interface Props {
  expensesByType: Record<string, number>;
  /** إجمالي المصروفات التشغيلية الرسمي كما يصل من الخادم (لا يشمل الضريبة) */
  totalExpenses: number;
  vatAmount: number;
}

export const VAT_HINT = 'ضريبة مستحقة على إيرادات الإيجار، وليست مصروفاً تشغيلياً.';

const Row = ({ label, amount, hint }: { label: string; amount: number; hint?: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-dashed">
    <span className="flex items-center gap-1">{label}{hint && <InfoHint text={hint} label={`شرح ${label}`} />}</span>
    <span className="text-destructive font-medium">-{fmt(amount)} ر.س</span>
  </div>
);

/**
 * المصروفات التشغيلية ثم الضريبة سطراً مستقلاً — بلا طرح ولا إجمالي مدمج.
 * الأرقام تُعرض كما تصل دون أي حساب في الواجهة.
 */
const DisclosureExpensesBlock = ({ expensesByType, totalExpenses, vatAmount }: Props) => (
  <div>
    <h3 className="font-bold text-lg mb-3 text-destructive">المصروفات</h3>
    <div className="space-y-2">
      {Object.entries(expensesByType).map(([type, amount]) => <Row key={type} label={type} amount={amount} />)}
      <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
        <span>إجمالي المصروفات التشغيلية</span>
        <span className="text-destructive">-{fmt(totalExpenses)} ر.س</span>
      </div>
    </div>
    {vatAmount > 0 && (
      <div className="mt-4">
        <h3 className="font-bold text-lg mb-3 text-vat">الضريبة</h3>
        <Row label="ضريبة القيمة المضافة" amount={vatAmount} hint={VAT_HINT} />
      </div>
    )}
  </div>
);

export default DisclosureExpensesBlock;
