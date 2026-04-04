/**
 * رسوم بيانية المقارنة السنوية — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { fmt } from '@/utils/format/format';
import { tooltipStyleRtl } from '@/utils/chart/chartHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChartReady } from '@/hooks/ui/useChartReady';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))',
  'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))',
  'hsl(var(--accent))', 'hsl(var(--chart-4))',
];

/** حاوية رسم بياني مع useChartReady */
const ChartBox: React.FC<{ height?: number | string; children: React.ReactNode }> = ({ height = 300, children }) => {
  const { ref, ready } = useChartReady();
  return (
    <div ref={ref} className="min-w-0 min-h-[1px]" style={{ height }}>
      {ready && children}
    </div>
  );
};

export interface YoYChartsSectionProps {
  comparisonData: Record<string, unknown>[];
  year1Label: string;
  year2Label: string;
  expensesByType1: Array<{ name: string; value: number }>;
  expensesByType2: Array<{ name: string; value: number }>;
}

const YoYChartsSectionInner = ({
  comparisonData, year1Label, year2Label,
  expensesByType1, expensesByType2,
}: YoYChartsSectionProps) => (
  <>
    {/* مقارنة الدخل الشهري */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">مقارنة الدخل الشهري</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartBox height="clamp(300px, 50vw, 400px)">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyleRtl} formatter={((value: number | undefined, name: string | undefined) => [`${fmt(value ?? 0)} ر.س`, name ?? '']) as never} />
              <Legend />
              <Bar dataKey={`دخل ${year1Label}`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey={`دخل ${year2Label}`} fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </CardContent>
    </Card>

    {/* مقارنة صافي الدخل الشهري */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">مقارنة صافي الدخل الشهري</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartBox height="clamp(250px, 40vw, 300px)">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart data={comparisonData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyleRtl} formatter={((value: number | undefined, name: string | undefined) => [`${fmt(value ?? 0)} ر.س`, name ?? '']) as never} />
              <Legend />
              <Line type="monotone" dataKey="net1" stroke="hsl(var(--primary))" strokeWidth={2} name={`صافي ${year1Label}`} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="net2" stroke="hsl(var(--success))" strokeWidth={2} name={`صافي ${year2Label}`} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </CardContent>
    </Card>

    {/* توزيع المصروفات */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Badge variant="outline">{year1Label}</Badge>
            توزيع المصروفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByType1.length > 0 ? (
            <ChartBox height={280}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={expensesByType1} cx="50%" cy="50%" labelLine outerRadius={85} dataKey="value" style={{ fontSize: '11px' }}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {expensesByType1.map((_entry, index) => (
                      <Cell key={`cell-y1-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={((value: number | undefined) => `${fmt(value ?? 0)} ر.س`) as never} contentStyle={tooltipStyleRtl} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Badge variant="secondary">{year2Label}</Badge>
            توزيع المصروفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByType2.length > 0 ? (
            <ChartBox height={280}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={expensesByType2} cx="50%" cy="50%" labelLine outerRadius={85} dataKey="value" style={{ fontSize: '11px' }}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {expensesByType2.map((_entry, index) => (
                      <Cell key={`cell-y2-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={((value: number | undefined) => `${fmt(value ?? 0)} ر.س`) as never} contentStyle={tooltipStyleRtl} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>
    </div>
  </>
);

export default YoYChartsSectionInner;
