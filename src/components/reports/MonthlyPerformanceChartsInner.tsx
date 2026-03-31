/**
 * رسوم الأداء الشهري (أعمدة + منطقة) — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmt } from '@/utils/format';
import { tooltipStyleRtl } from '@/utils/chartHelpers';



interface MonthData {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

interface MonthlyPerformanceChartsInnerProps {
  monthlyData: MonthData[];
}

const MonthlyPerformanceChartsInner: React.FC<MonthlyPerformanceChartsInnerProps> = ({ monthlyData }) => (
  <>
    {/* Bar Chart: Income vs Expenses */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">مقارنة الدخل والمصروفات الشهرية</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[400px] min-w-0 min-h-[1px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={tooltipStyleRtl}
                formatter={((value: number | undefined, name: string | undefined) => [
                  `${fmt(value ?? 0)} ر.س`,
                  name === 'income' ? 'الدخل' : name === 'expenses' ? 'المصروفات' : 'الصافي',
                ]) as never}
                labelFormatter={(label) => label}
              />
              <Legend formatter={(value) => value === 'income' ? 'الدخل' : value === 'expenses' ? 'المصروفات' : 'الصافي'} />
              <Bar dataKey="income" fill="hsl(var(--success))" name="income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>

    {/* Area Chart: Net Trend */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">اتجاه صافي الدخل الشهري</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[300px] min-w-0 min-h-[1px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={tooltipStyleRtl}
                formatter={(value: number | undefined) => [`${fmt(value ?? 0)} ر.س`, 'صافي الدخل']}
              />
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="net"
                stroke="hsl(var(--primary))"
                fill="url(#netGradient)"
                strokeWidth={2}
                name="صافي الدخل"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </>
);

export default MonthlyPerformanceChartsInner;
