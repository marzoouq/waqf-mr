/**
 * عرض مخصص للوحة المحاسب — يُبرز البيانات التشغيلية والتحصيلية
 * البطاقتان H-02 (إجمالي الإيرادات) و H-03 (صافي الريع المتاح) خلف feature flag
 * يتحكم بها الناظر عبر شبكة إظهار/إخفاء الميزات (`accountant.financial_cards`).
 */
import { memo } from 'react';
import {
  AlertTriangle, Clock, Banknote, FileWarning, FileX, TrendingUp, Wallet,
} from 'lucide-react';
import { fmtInt } from '@/utils/format/format';
import { DashboardSkeleton } from '@/components/common';
import { useFeatureVisibility } from '@/hooks/data/settings/permissions/useFeatureVisibility';
import type { AccountantMetrics } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';
import type { AggregatedData } from '@/types/financial/dashboard';
import MetricCard from './accountant/MetricCard';
import OverdueInvoicesCard from './accountant/OverdueInvoicesCard';
import MonthlyCollectionCard from './accountant/MonthlyCollectionCard';

interface AccountantDashboardViewProps {
  metrics: AccountantMetrics;
  aggregated: AggregatedData | null;
  isLoading: boolean;
}

const AccountantDashboardView = ({ metrics, aggregated, isLoading }: AccountantDashboardViewProps) => {
  const { isVisible } = useFeatureVisibility();
  const showFinancial = isVisible('accountant', 'financial_cards');

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* صف المقاييس السريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="فواتير متأخرة"
          value={metrics.overdueInvoices.length}
          rawValue={metrics.overdueInvoices.length}
          subtitle={metrics.overdueTotal > 0 ? `${fmtInt(metrics.overdueTotal)} ر.س` : undefined}
          icon={AlertTriangle}
          color={metrics.overdueInvoices.length > 0 ? 'bg-destructive' : 'bg-success'}
          link="/dashboard/invoices?status=overdue"
          trend={metrics.overdueTrend}
          trendColor="destructive"
        />
        <MetricCard
          title="فواتير معلقة"
          value={metrics.pendingInvoicesCount}
          rawValue={metrics.pendingInvoicesCount}
          icon={Clock}
          color="bg-warning"
          link="/dashboard/invoices?status=pending"
        />
        <MetricCard
          title="إجمالي المُحصّل"
          value={`${fmtInt(metrics.totalCollected)} ر.س`}
          rawValue={metrics.totalCollected}
          numericSuffix=" ر.س"
          subtitle={metrics.totalExpected > 0 ? `من ${fmtInt(metrics.totalExpected)} ر.س` : undefined}
          icon={Banknote}
          color="bg-success"
          trend={metrics.collectedTrend}
          trendColor="success"
        />
        <MetricCard
          title="ZATCA غير مُرسل"
          value={metrics.unsubmittedZatcaCount}
          rawValue={metrics.unsubmittedZatcaCount}
          icon={FileWarning}
          color={metrics.unsubmittedZatcaCount > 0 ? 'bg-warning' : 'bg-muted-foreground'}
          subtitle="إدارة المراسلة للناظر"
        />
        <MetricCard
          title="عقود بدون فواتير"
          value={metrics.orphanedContractsCount}
          rawValue={metrics.orphanedContractsCount}
          icon={FileX}
          color={metrics.orphanedContractsCount > 0 ? 'bg-destructive' : 'bg-muted-foreground'}
          link="/dashboard/contracts"
        />
      </div>

      {/* H-02 / H-03 — مقاييس مالية مُجمَّعة خلف feature flag */}
      {showFinancial && aggregated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" data-testid="accountant-financial-cards">
          <MetricCard
            title="إجمالي الإيرادات (السنة)"
            value={`${fmtInt(aggregated.totals.total_income)} ر.س`}
            rawValue={aggregated.totals.total_income}
            numericSuffix=" ر.س"
            icon={TrendingUp}
            color="bg-primary"
          />
          <MetricCard
            title="صافي الريع المتاح للتوزيع"
            value={`${fmtInt(aggregated.totals.available_amount)} ر.س`}
            rawValue={aggregated.totals.available_amount}
            numericSuffix=" ر.س"
            subtitle={`بعد الضريبة والزكاة والحصص`}
            icon={Wallet}
            color="bg-success"
          />
        </div>
      )}

      {/* البطاقات التفصيلية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverdueInvoicesCard invoices={metrics.overdueInvoices} total={metrics.overdueTotal} />
        <MonthlyCollectionCard data={metrics.monthlyCollection} />
      </div>
    </div>
  );
};

export default memo(AccountantDashboardView);
