/**
 * المكون الداخلي للرسم الدائري — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmt } from '@/utils/format/format';
import { useChartReady } from '@/hooks/ui/useChartReady';
import { CHART_COLORS } from '@/utils/chart/chartHelpers';

interface DataItem {
  name: string;
  value: number;
}

const ExpensePieChartInner: React.FC<{ data: DataItem[] }> = memo(({ data }) => {
  const { ref, ready } = useChartReady();

  return (
    <div ref={ref} className="w-full h-[280px] min-h-[1px] min-w-0">
      {ready && (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={((value: number | undefined) => [`${fmt(value ?? 0)} ر.س`, '']) as never}
              contentStyle={{ direction: 'rtl', fontSize: 12 }}
            />
            <Legend
              verticalAlign="bottom"
              formatter={(value: string) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

ExpensePieChartInner.displayName = 'ExpensePieChartInner';
export default ExpensePieChartInner;
