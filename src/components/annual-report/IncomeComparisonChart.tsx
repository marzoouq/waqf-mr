/**
 * رسم بياني لمقارنة الدخل عبر آخر 3-4 سنوات مالية
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useIncomeComparison } from '@/hooks/useAnnualReport';
import { Loader2, TrendingUp } from 'lucide-react';

const formatAmount = (v: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(v);

const IncomeComparisonChart: React.FC = () => {
  const { data = [], isLoading } = useIncomeComparison();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          مقارنة الدخل عبر السنوات المالية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis tickFormatter={(v: number) => formatAmount(v)} className="text-xs" />
              <Tooltip
                formatter={(v: number | undefined) => [formatAmount(v ?? 0) + ' ر.س', 'الدخل']}
                contentStyle={{ direction: 'rtl', fontFamily: 'Tajawal' }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeComparisonChart;
