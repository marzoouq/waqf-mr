/**
 * مكوّن رسم ملخص التحصيل — يُحمّل بشكل كسول (lazy)
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface CollectionSummaryChartProps {
  onTime: number;
  late: number;
  partial?: number;
}

const CollectionSummaryChart = ({ onTime, late, partial = 0 }: CollectionSummaryChartProps) => {
  // CS-01: guard للبيانات الفارغة
  if (onTime === 0 && late === 0 && partial === 0) {
    return (
      <div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center rounded-full bg-muted/30">
        <span className="text-xs text-muted-foreground">لا توجد بيانات</span>
      </div>
    );
  }

  const data = [
    { name: 'محصّل', value: onTime },
    ...(partial > 0 ? [{ name: 'جزئي', value: partial }] : []),
    { name: 'متأخر', value: late },
  ];

  const colors = [
    'hsl(var(--success))',
    ...(partial > 0 ? ['hsl(var(--warning))'] : []),
    'hsl(var(--destructive))',
  ];

  return (
    <div className="w-[180px] h-[180px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {colors.map((color, i) => (
              <Cell key={i} fill={color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} formatter={(value?: number, name?: string) => [`${value ?? 0} فاتورة`, name ?? '']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CollectionSummaryChart;
