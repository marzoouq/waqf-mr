/**
 * رسوم بيانية للوحة الواقف — يُحمَّل كسولاً.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fmt } from '@/utils/format';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--accent-foreground))', 'hsl(var(--muted-foreground))'];

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};
const formatArabicMonth = (month: unknown) => {
  const parts = String(month ?? '').split('-');
  return ARABIC_MONTHS[parts[1]] || String(month);
};

interface MonthlyItem { month: string; income: number; expenses: number }
interface ExpenseItem { name: string; value: number }

interface WaqifChartsInnerProps {
  monthlyData: MonthlyItem[];
  expenseData: ExpenseItem[];
}

const WaqifChartsInner: React.FC<WaqifChartsInnerProps> = ({ monthlyData, expenseData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {monthlyData.length > 0 && (
      <div className="h-[280px]" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={formatArabicMonth} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
            <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: 'inherit' }} formatter={(v: number | undefined) => fmt(v ?? 0) + ' ر.س'} labelFormatter={formatArabicMonth} />
            <Bar dataKey="income" name="الدخل" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="المصروفات" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}

    {expenseData.length > 0 && (
      <div className="h-[280px]" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" startAngle={90} endAngle={-270}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {expenseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} formatter={(v: number | undefined) => fmt(v ?? 0) + ' ر.س'} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

export default WaqifChartsInner;
