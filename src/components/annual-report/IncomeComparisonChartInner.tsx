/**
 * رسم مقارنة الدخل عبر السنوات المالية — يُحمَّل كسولاً لتجنب تحميل recharts في الحزمة الأولية.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartReady } from '@/hooks/ui/useChartReady';

const formatAmount = (v: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(v);

interface IncomeComparisonChartInnerProps {
  data: Array<{ label: string; total: number }>;
}

const IncomeComparisonChartInner: React.FC<IncomeComparisonChartInnerProps> = ({ data }) => {
  const { ref, ready } = useChartReady();

  return (
    <div ref={ref} className="h-[250px] w-full min-w-0 min-h-[1px]" dir="ltr">
      {ready && (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis tickFormatter={(v: number) => formatAmount(v)} className="text-xs" />
            <Tooltip
              formatter={((v: number | undefined) => [formatAmount(v ?? 0) + ' ر.س', 'الدخل']) as never}
              contentStyle={{ direction: 'rtl', fontFamily: 'Tajawal' }}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default IncomeComparisonChartInner;
