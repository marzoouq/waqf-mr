/**
 * رسم بياني للمقارنة التاريخية — يُحمَّل كسولاً.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fmt, fmtSAR } from '@/utils/format';

const YEAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

interface Props {
  chartData: Record<string, string | number>[];
  yearLabels: string[];
}

const HistoricalComparisonChartInner: React.FC<Props> = ({ chartData, yearLabels }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis type="number" tickFormatter={(v: number) => fmt(v, 0)} stroke="hsl(var(--muted-foreground))" fontSize={10} />
      <YAxis type="category" dataKey="metric" width={70} stroke="hsl(var(--muted-foreground))" fontSize={10} />
      <Tooltip
        formatter={(value) => fmtSAR(Number(value))}
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          direction: 'rtl',
        }}
      />
      <Legend />
      {yearLabels.map((label, i) => (
        <Bar key={label} dataKey={label} fill={YEAR_COLORS[i]} radius={[0, 4, 4, 0]} />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export default HistoricalComparisonChartInner;
