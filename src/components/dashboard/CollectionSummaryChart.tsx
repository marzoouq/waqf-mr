/**
 * مكوّن رسم ملخص التحصيل — يُحمّل بشكل كسول (lazy)
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface CollectionSummaryChartProps {
  onTime: number;
  late: number;
}

const CollectionSummaryChart = ({ onTime, late }: CollectionSummaryChartProps) => {
  const data = [
    { name: 'منتظم', value: onTime },
    { name: 'متأخر', value: late },
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
            <Cell fill="hsl(var(--success))" />
            <Cell fill="hsl(var(--destructive))" />
          </Pie>
          <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} formatter={(value) => [`${value} فاتورة`, undefined]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CollectionSummaryChart;
