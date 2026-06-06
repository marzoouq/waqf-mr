import { fmt } from '@/utils/format/format';

interface Props {
  incomeBySource: Record<string, number>;
  totalIncome: number;
}

const DisclosureIncomeBlock = ({ incomeBySource, totalIncome }: Props) => (
  <div>
    <h3 className="font-bold text-lg mb-3 text-success">الإيرادات</h3>
    <div className="space-y-2">
      {Object.entries(incomeBySource).map(([source, amount]) => (
        <div key={source} className="flex justify-between items-center py-2 border-b border-dashed">
          <span>{source}</span>
          <span className="text-success font-medium">+{fmt(amount)} ر.س</span>
        </div>
      ))}
      <div
        className="flex justify-between items-center py-2 font-bold bg-success/10 rounded px-2"
        title="مجموع الدخل المسجّل دفترياً — قد يتضمن قيوداً يدوية. للتحصيل النقدي الفعلي راجع صفحة الفواتير."
      >
        <span>إجمالي الدخل المسجّل دفترياً</span>
        <span className="text-success">+{fmt(totalIncome)} ر.س</span>
      </div>
    </div>
  </div>
);

export default DisclosureIncomeBlock;
