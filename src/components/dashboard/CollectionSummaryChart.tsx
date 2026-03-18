/**
 * مكوّن رسم ملخص التحصيل — يُحمّل بشكل كسول (lazy)
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface CollectionSummaryChartProps {
  onTime: number;
  late: number;
}

const CollectionSummaryChart = ({ onTime, late }: CollectionSummaryChartProps) => {
  // CS-01: guard للبيانات الفارغة
  if (onTime === 0 && late === 0) {
    return (
      <div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center rounded-full bg-muted/30">
        <span className="text-xs text-muted-foreground">لا توجد بيانات</span>
      </div>
    );
  }

  const data = [
    { name: 'محصّل', value: onTime },
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
          {/* CS-05: إصلاح Tooltip formatter — إضافة name */}
          <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} formatter={(value: number, name: string) => [`${value} فاتورة`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CollectionSummaryChart;
