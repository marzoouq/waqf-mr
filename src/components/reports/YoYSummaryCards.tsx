/**
 * بطاقات ملخص إضافية من v_fiscal_year_summary — تُعرض في مقارنة السنوات
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Receipt, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import type { FiscalYearSummary } from '@/hooks/data/financial/useFiscalYearSummary';
import { Skeleton } from '@/components/ui/skeleton';

interface YoYSummaryCardsProps {
  year1: FiscalYearSummary | null | undefined;
  year2: FiscalYearSummary | null | undefined;
  year1Label: string;
  year2Label: string;
  isLoading: boolean;
}

interface MetricRowProps {
  label: string;
  val1: number;
  val2: number;
  /** عكس لون التغيير (مثلاً الفواتير المعلقة: الزيادة سلبية) */
  invertColor?: boolean;
  isCount?: boolean;
}

function MetricRow({ label, val1, val2, invertColor, isCount }: MetricRowProps) {
  const diff = val2 - val1;
  const pct = val1 !== 0 ? ((diff / Math.abs(val1)) * 100) : 0;
  const isPositive = invertColor ? diff < 0 : diff > 0;
  const isNegative = invertColor ? diff > 0 : diff < 0;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3 text-xs sm:text-sm">
        <span className="tabular-nums">{isCount ? val1 : fmt(val1)}</span>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="tabular-nums">{isCount ? val2 : fmt(val2)}</span>
        {val1 !== 0 && (
          <Badge variant="outline" className={`text-[10px] ${color}`}>
            {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
          </Badge>
        )}
      </div>
    </div>
  );
}

const YoYSummaryCards = ({ year1, year2, year1Label, year2Label, isLoading }: YoYSummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!year1 || !year2) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* مؤشرات النشاط */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            مؤشرات النشاط
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            {year1Label} ← → {year2Label}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <MetricRow label="عدد سجلات الدخل" val1={year1.incomeCount} val2={year2.incomeCount} isCount />
          <MetricRow label="عدد سجلات المصروفات" val1={year1.expenseCount} val2={year2.expenseCount} invertColor isCount />
          <MetricRow label="عدد التوزيعات" val1={year1.distributionCount} val2={year2.distributionCount} isCount />
          <MetricRow label="إجمالي الموزّع" val1={year1.totalDistributed} val2={year2.totalDistributed} />
        </CardContent>
      </Card>

      {/* إحصائيات الفوترة */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            إحصائيات الفوترة
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            {year1Label} ← → {year2Label}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <MetricRow label="إجمالي المُفوتَر" val1={year1.totalInvoiced} val2={year2.totalInvoiced} />
          <MetricRow label="فواتير مدفوعة" val1={year1.paidInvoices} val2={year2.paidInvoices} isCount />
          <MetricRow label="فواتير معلّقة" val1={year1.pendingInvoices} val2={year2.pendingInvoices} invertColor isCount />
          <MetricRow label="الرصيد الصافي" val1={year1.netBalance} val2={year2.netBalance} />
        </CardContent>
      </Card>
    </div>
  );
};

export default YoYSummaryCards;
