/**
 * عرض مخصص للوحة المحاسب — يُبرز البيانات التشغيلية والتحصيلية
 * (موجة 17) قُسِّم إلى ثلاث بطاقات منفصلة في components/dashboard/views/accountant/
 */
import { memo } from 'react';
import {
  AlertTriangle, Clock, Banknote, FileWarning, Link as LinkIcon,
} from 'lucide-react';
import { fmtInt } from '@/utils/format/format';
import type { AccountantMetrics } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';
import MetricCard from './accountant/MetricCard';
import OverdueInvoicesCard from './accountant/OverdueInvoicesCard';
import MonthlyCollectionCard from './accountant/MonthlyCollectionCard';

interface AccountantDashboardViewProps {
  metrics: AccountantMetrics;
  isLoading: boolean;
}

const AccountantDashboardView = ({ metrics, isLoading }: AccountantDashboardViewProps) => {
  if (isLoading) return null;

  return (
    <div className="space-y-4">
      {/* صف المقاييس السريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          title="فواتير متأخرة"
          value={metrics.overdueInvoices.length}
          subtitle={metrics.overdueTotal > 0 ? `${fmtInt(metrics.overdueTotal)} ر.س` : undefined}
          icon={AlertTriangle}
          color={metrics.overdueInvoices.length > 0 ? 'bg-destructive' : 'bg-success'}
          link="/dashboard/contracts"
        />
        <MetricCard
          title="فواتير معلقة"
          value={metrics.pendingInvoicesCount}
          icon={Clock}
          color="bg-warning"
          link="/dashboard/contracts"
        />
        <MetricCard
          title="إجمالي المُحصّل"
          value={`${fmtInt(metrics.totalCollected)} ر.س`}
          subtitle={metrics.totalExpected > 0 ? `من ${fmtInt(metrics.totalExpected)} ر.س` : undefined}
          icon={Banknote}
          color="bg-success"
        />
        <MetricCard
          title="ZATCA غير مُرسل"
          value={metrics.unsubmittedZatcaCount}
          icon={FileWarning}
          color={metrics.unsubmittedZatcaCount > 0 ? 'bg-warning' : 'bg-muted-foreground'}
          link="/dashboard/zatca"
        />
        <MetricCard
          title="عقود بدون سنة"
          value={metrics.orphanedContractsCount}
          icon={LinkIcon}
          color={metrics.orphanedContractsCount > 0 ? 'bg-destructive' : 'bg-muted-foreground'}
          link="/dashboard/contracts"
        />
      </div>

      {/* البطاقات التفصيلية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverdueInvoicesCard invoices={metrics.overdueInvoices} total={metrics.overdueTotal} />
        <MonthlyCollectionCard data={metrics.monthlyCollection} />
      </div>
    </div>
  );
};

export default memo(AccountantDashboardView);
