import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Beneficiary } from '@/types/database';
import { fmt as fmtNum } from '@/utils/format';

interface Props {
  beneficiary: Beneficiary;
}

interface DistributionRow {
  fiscal_year: string;
  amount: number;
  date: string;
  status: string;
}

/** B-2: تاريخ التوزيعات لكل مستفيد — آخر 5 سنوات */
const DistributionHistory = ({ beneficiary }: Props) => {
  const { data: distributions = [], isLoading } = useQuery({
    queryKey: ['beneficiary-distribution-history', beneficiary.id],
    staleTime: 60_000,
    queryFn: async () => {
      // جلب التوزيعات مع بيانات الحساب للسنة المالية
      const { data, error } = await supabase
        .from('distributions')
        .select('amount, date, status, account_id, accounts!inner(fiscal_year)')
        .eq('beneficiary_id', beneficiary.id)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: Record<string, unknown>) => ({
        fiscal_year: (d.accounts as Record<string, unknown>)?.fiscal_year as string || '-',
        amount: Number(d.amount),
        date: d.date as string,
        status: d.status as string,
      })) as DistributionRow[];
    },
  });

  // تجميع حسب السنة المالية
  const yearlyData = useMemo(() => {
    const map = new Map<string, { total: number; count: number; lastDate: string }>();
    distributions.forEach((d) => {
      const existing = map.get(d.fiscal_year);
      if (existing) {
        existing.total += d.amount;
        existing.count += 1;
        if (d.date > existing.lastDate) existing.lastDate = d.date;
      } else {
        map.set(d.fiscal_year, { total: d.amount, count: 1, lastDate: d.date });
      }
    });
    return Array.from(map.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => b.year.localeCompare(a.year))
      .slice(0, 5); // آخر 5 سنوات
  }, [distributions]);

  const totalAllYears = yearlyData.reduce((sum, y) => sum + y.total, 0);

  const fmt = (n: number) => fmt(n);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (yearlyData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center">
          <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد توزيعات سابقة لـ {beneficiary.name}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          سجل التوزيعات — {beneficiary.name}
          <Badge variant="secondary" className="text-xs mr-auto">{yearlyData.length} سنوات</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">السنة المالية</TableHead>
                <TableHead className="text-right">المبلغ الإجمالي</TableHead>
                <TableHead className="text-right">عدد الدفعات</TableHead>
                <TableHead className="text-right">التغيّر</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyData.map((row, idx) => {
                const prevRow = yearlyData[idx + 1];
                const change = prevRow ? ((row.total - prevRow.total) / prevRow.total) * 100 : null;
                return (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell className="font-bold text-success">{fmt(row.total)} ر.س</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>
                      {change !== null ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${change > 0 ? 'text-success' : change < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 bg-muted/30 text-center border-t">
          <p className="text-xs text-muted-foreground">إجمالي التوزيعات ({yearlyData.length} سنوات): <span className="font-bold text-foreground">{fmt(totalAllYears)} ر.س</span></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DistributionHistory;
