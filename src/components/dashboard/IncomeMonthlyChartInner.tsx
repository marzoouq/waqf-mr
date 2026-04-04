/**
 * مكوّن الرسم البياني الداخلي للدخل الشهري — يُحمّل بشكل كسول (lazy)
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmt } from '@/utils/format/format';
import { useChartReady } from '@/hooks/ui/useChartReady';

interface IncomeMonthlyChartInnerProps {
  chartData: Array<{ month: string; actual: number; expected: number; gap: number }>;
}

const IncomeMonthlyChartInner = ({ chartData }: IncomeMonthlyChartInnerProps) => {
  const { ref, ready } = useChartReady();

  return (
    <div ref={ref} className="h-[280px] min-h-[280px] min-w-0" dir="ltr">
      {ready && (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: 'inherit' }}
              formatter={((value: number | undefined, name: string | undefined) => [
                `${fmt(value ?? 0)} ر.س`,
                name === 'actual' ? 'الفعلي' : 'المتوقع',
              ]) as never}
            />
            <Legend formatter={(value: string) => value === 'actual' ? 'الفعلي' : 'المتوقع'} />
            <Bar dataKey="expected" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} name="expected" />
            <Bar dataKey="actual" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="actual" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default IncomeMonthlyChartInner;
