/**
 * تقرير التدفق النقدي — يستخدم مكونات فرعية مستخرجة.
 */
import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import { fmtInt } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowData } from '@/hooks/reports/useCashFlowData';
import CashFlowSummaryCards from './CashFlowSummaryCards';
import CashFlowTable from './CashFlowTable';

const CashFlowChartInner = lazy(() => import('./CashFlowChartInner'));

interface CashFlowReportProps {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  fiscalYear?: { label: string; start_date: string; end_date: string } | null;
}

const CashFlowReport = ({ income, expenses, fiscalYear }: CashFlowReportProps) => {
  const { monthlyData, totals } = useCashFlowData({ income, expenses, fiscalYear });
  const fmt = (v: number) => fmtInt(v);

  return (
    <div className="space-y-6">
      <CashFlowSummaryCards totals={totals} fmt={fmt} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="w-5 h-5" />
            التدفق النقدي الشهري {fiscalYear ? `(${fiscalYear.label})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[350px] w-full rounded-lg" />}>
            <CashFlowChartInner monthlyData={monthlyData} fmt={fmt} />
          </Suspense>
        </CardContent>
      </Card>

      <CashFlowTable monthlyData={monthlyData} totals={totals} fmt={fmt} />
    </div>
  );
};

export default CashFlowReport;
