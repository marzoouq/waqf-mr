import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface IncomeChartProps {
  income: Array<{ date: string; amount: number }>;
  contracts: Array<{ rent_amount: number; payment_type: string; start_date: string; end_date: string; status: string }>;
  fiscalYear?: { start_date: string; end_date: string } | null;
}

/**
 * I-3 + I-8: رسم بياني للإيرادات الفعلية مقابل المتوقعة شهرياً
 * المتوقع = مجموع إيجارات العقود النشطة مقسّمة على عدد الأشهر
 */
const IncomeMonthlyChart = ({ income, contracts, fiscalYear }: IncomeChartProps) => {
  const chartData = useMemo(() => {
    const startDate = fiscalYear ? new Date(fiscalYear.start_date) : new Date(new Date().getFullYear(), 0, 1);

    // حساب الإيراد المتوقع الشهري من العقود النشطة
    const activeContracts = contracts.filter(c => c.status === 'active');
    const monthlyExpected = activeContracts.reduce((sum, c) => {
      const rent = Number(c.rent_amount);
      // تحويل الإيجار السنوي إلى شهري
      return sum + (rent / 12);
    }, 0);

    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const actual = income
        .filter(item => {
          const d = new Date(item.date);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, item) => sum + Number(item.amount), 0);

      months.push({
        month: MONTH_NAMES[month],
        actual,
        expected: Math.round(monthlyExpected),
        gap: actual - Math.round(monthlyExpected),
      });
    }
    return months;
  }, [income, contracts, fiscalYear]);

  const totalActual = chartData.reduce((s, m) => s + m.actual, 0);
  const totalExpected = chartData.reduce((s, m) => s + m.expected, 0);
  const achievementRate = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            الدخل الشهري: فعلي مقابل المتوقع
          </span>
          <span className={`text-sm font-bold ${achievementRate >= 100 ? 'text-success' : achievementRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
            نسبة التحصيل: {achievementRate}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: 'inherit' }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} ر.س`,
                  name === 'actual' ? 'الفعلي' : 'المتوقع',
                ]}
              />
              <Legend formatter={(value: string) => value === 'actual' ? 'الفعلي' : 'المتوقع'} />
              <Bar dataKey="expected" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} name="expected" />
              <Bar dataKey="actual" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeMonthlyChart;
