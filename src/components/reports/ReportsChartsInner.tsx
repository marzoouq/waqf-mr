/**
 * رسوم بيانية لصفحة التقارير — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { fmt } from '@/utils/format';

const REPORT_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))',
  'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))',
  'hsl(var(--accent))', 'hsl(var(--chart-4))',
];

const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };

interface DataItem { name: string; value: number }

interface ReportsChartsInnerProps {
  incomeSourceData: DataItem[];
  expenseTypeData: DataItem[];
}

const ReportsChartsInner: React.FC<ReportsChartsInnerProps> = ({ incomeSourceData, expenseTypeData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-before-page">
    <div style={{ minWidth: 0 }}>
      {incomeSourceData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={incomeSourceData} cx="50%" cy="50%" labelLine label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} outerRadius={90} fill="hsl(var(--primary))" dataKey="value" style={{ fontSize: '12px' }}>
              {incomeSourceData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number | undefined) => `${fmt(value ?? 0)} ر.س`} contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
      )}
    </div>
    <div style={{ minWidth: 0 }}>
      {expenseTypeData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={expenseTypeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number | undefined) => `${fmt(value ?? 0)} ر.س`} contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
      )}
    </div>
  </div>
);

export default ReportsChartsInner;
