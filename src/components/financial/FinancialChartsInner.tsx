/**
 * رسوم بيانية لصفحة التقارير المالية للمستفيد — يُحمَّل كسولاً.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { fmt } from '@/utils/format/format';
import { formatArabicMonth, tooltipStyleRtl } from '@/utils/chart/chartHelpers';
import ChartBox from '@/components/common/ChartBox';

const FINANCIAL_COLORS = [
  'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--info))',
  'hsl(var(--warning))', 'hsl(var(--chart-4))', 'hsl(var(--primary))',
];

interface FillDataItem { name: string; value: number; fill: string }
interface DataItem { name: string; value: number }
interface MonthlyItem { month: string; income: number }

interface FinancialChartsInnerProps {
  incomeVsExpenses: FillDataItem[];
  distributionData: FillDataItem[];
  incomePieData: DataItem[];
  expensesPieData: DataItem[];
  monthlyData: MonthlyItem[];
}

const FinancialChartsInner: React.FC<FinancialChartsInnerProps> = ({
  incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
}) => (
  <>
    {/* Charts Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <ChartBox height={250} className="px-2 sm:px-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={incomeVsExpenses}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
            <Tooltip formatter={((value: number | undefined) => fmt(value ?? 0) + ' ر.س') as never} contentStyle={tooltipStyleRtl} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {incomeVsExpenses.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox height={250} className="px-2 sm:px-0">
        {distributionData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <Pie data={distributionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={((value: number | undefined) => fmt(value ?? 0) + ' ر.س') as never} contentStyle={tooltipStyleRtl} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
        )}
      </ChartBox>
    </div>

    {/* Charts Row 2 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <ChartBox height={250} className="px-2 sm:px-0">
        {incomePieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <Pie data={incomePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                {incomePieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={FINANCIAL_COLORS[index % FINANCIAL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={((value: number | undefined) => fmt(value ?? 0) + ' ر.س') as never} contentStyle={tooltipStyleRtl} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
        )}
      </ChartBox>

      <ChartBox>
        {expensesPieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <Pie data={expensesPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} style={{ fontSize: '11px' }}>
                {expensesPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={FINANCIAL_COLORS[index % FINANCIAL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={((value: number | undefined) => fmt(value ?? 0) + ' ر.س') as never} contentStyle={tooltipStyleRtl} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
        )}
      </ChartBox>
    </div>

    {/* Monthly Trend */}
    <ChartBox>
      {monthlyData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={formatArabicMonth} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
            <Tooltip formatter={((value: number | undefined) => fmt(Math.round(value ?? 0)) + ' ر.س') as never} contentStyle={tooltipStyleRtl} labelFormatter={formatArabicMonth} />
            <Bar dataKey="income" fill="hsl(var(--success))" name="الإيرادات" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات شهرية</div>
      )}
    </ChartBox>
  </>
);

export default FinancialChartsInner;
