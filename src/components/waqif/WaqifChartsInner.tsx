/**
 * رسوم بيانية للوحة الواقف — يُحمَّل كسولاً.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fmt } from '@/utils/format';
import { CHART_COLORS, formatArabicMonth, tooltipStyleRtl } from '@/utils/chartHelpers';

interface MonthlyItem { month: string; income: number; expenses: number }
interface ExpenseItem { name: string; value: number }

interface WaqifChartsInnerProps {
  monthlyData: MonthlyItem[];
  expenseData: ExpenseItem[];
}

const WaqifChartsInner: React.FC<WaqifChartsInnerProps> = ({ monthlyData, expenseData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {monthlyData.length > 0 && (
      <div className="h-[280px] min-w-0 min-h-[1px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={formatArabicMonth} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
            <Tooltip contentStyle={tooltipStyleRtl} formatter={((v: number | undefined) => fmt(v ?? 0) + ' ر.س') as never} labelFormatter={formatArabicMonth} />
            <Bar dataKey="income" name="الدخل" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="المصروفات" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}

    {expenseData.length > 0 && (
      <div className="h-[280px] min-w-0 min-h-[1px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" startAngle={90} endAngle={-270}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {expenseData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyleRtl} formatter={(v: number | undefined) => fmt(v ?? 0) + ' ر.س'} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

export default WaqifChartsInner;
