/**
 * مكوّن الرسوم البيانية للوحة التحكم — يُحمّل بشكل كسول (lazy)
 * يحتوي على: رسم الدخل/المصروفات الشهري + توزيع المصروفات الدائري
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

const formatArabicMonth = (month: unknown) => {
  const parts = String(month ?? '').split('-');
  return ARABIC_MONTHS[parts[1]] || String(month);
};

const tooltipStyle = { direction: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'inherit' };

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
  'hsl(var(--accent-foreground))',
  'hsl(var(--muted-foreground))',
];

interface DashboardChartsProps {
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
  expenseTypes: Array<{ name: string; value: number }>;
}

const DashboardCharts = ({ monthlyData, expenseTypes }: DashboardChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Income vs Expenses Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>الدخل والمصروفات الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={formatArabicMonth} />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => `${(value ?? 0).toLocaleString()} ر.س`} contentStyle={tooltipStyle} labelFormatter={formatArabicMonth} />
                <Legend />
                <Bar dataKey="income" fill="hsl(var(--primary))" name="الدخل" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--secondary))" name="المصروفات" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>

      {/* Expense Distribution */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>توزيع المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  style={{ fontSize: '12px' }}
                >
                  {expenseTypes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => `${(value ?? 0).toLocaleString()} ر.س`} contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
