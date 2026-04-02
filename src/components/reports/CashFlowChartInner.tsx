/**
 * رسم التدفق النقدي الشهري — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface MonthData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  cumulative: number;
}

interface CashFlowChartInnerProps {
  monthlyData: MonthData[];
  fmt: (v: number) => string;
}

const CashFlowChartInner: React.FC<CashFlowChartInnerProps> = ({ monthlyData, fmt }) => (
  <div className="h-[350px] min-w-0 min-h-[1px]" dir="ltr">
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: 'inherit' }}
          formatter={((value: number | undefined, name: string | undefined) => [
            `${fmt(value ?? 0)} ر.س`,
            name === 'income' ? 'الدخل' : name === 'expenses' ? 'المصروفات' : 'الصافي',
          ]) as never}
        />
        <Legend
          formatter={(value: string) =>
            value === 'income' ? 'الدخل' : value === 'expenses' ? 'المصروفات' : 'الصافي'
          }
        />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="income" />
        <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="expenses" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default CashFlowChartInner;
