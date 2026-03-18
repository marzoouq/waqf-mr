/**
 * المكون الداخلي للرسم الدائري — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmt } from '@/utils/format';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(var(--secondary))',
  'hsl(142 76% 36%)',     // أخضر
  'hsl(38 92% 50%)',      // برتقالي
  'hsl(280 65% 60%)',     // بنفسجي
  'hsl(190 90% 40%)',     // تركواز
  'hsl(350 80% 55%)',     // وردي
];

interface DataItem {
  name: string;
  value: number;
}

const ExpensePieChartInner: React.FC<{ data: DataItem[] }> = ({ data }) => {

  return (
    <ResponsiveContainer width="100%" height={280}>
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
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number | undefined) => [`${fmt(value ?? 0)} ر.س`, '']}
          contentStyle={{ direction: 'rtl', fontSize: 12 }}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(value: string) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpensePieChartInner;
