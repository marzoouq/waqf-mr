/**
 * عرض مخصص للوحة المحاسب — يُبرز البيانات التشغيلية والتحصيلية
 */
import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, FileWarning, Receipt,
  Banknote, CheckCircle, Clock, Link as LinkIcon,
} from 'lucide-react';
import { fmtInt } from '@/utils/format/format';
import type { AccountantMetrics } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';

interface AccountantDashboardViewProps {
  metrics: AccountantMetrics;
  isLoading: boolean;
}

/** بطاقة ملخص سريعة */
const MetricCard = memo(function MetricCard({
  title, value, subtitle, icon: Icon, color, link,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  link?: string;
}) {
  const content = (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return link ? <Link to={link} className="block">{content}</Link> : content;
});

/** بطاقة الفواتير المتأخرة */
const OverdueInvoicesCard = memo(function OverdueInvoicesCard({
  invoices, total,
}: {
  invoices: AccountantMetrics['overdueInvoices'];
  total: number;
}) {
  if (!invoices.length) {
    return (
      <Card className="shadow-sm border-success/30">
        <CardContent className="py-6 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="text-sm text-muted-foreground">لا توجد فواتير متأخرة — ممتاز!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          فواتير متأخرة ({invoices.length})
          <Badge variant="destructive" className="mr-auto">{fmtInt(total)} ر.س</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {invoices.slice(0, 10).map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-destructive shrink-0" />
                  <span className="font-medium text-sm truncate">{inv.invoiceNumber}</span>
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive shrink-0">
                    متأخر {inv.daysOverdue} يوم
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {inv.tenantName} — عقار {inv.propertyNumber}
                </p>
              </div>
              <span className="font-bold text-sm text-destructive shrink-0 mr-2">
                {fmtInt(inv.amount)} ر.س
              </span>
            </div>
          ))}
        </div>
        {invoices.length > 10 && (
          <Link to="/dashboard/contracts" className="block mt-3">
            <Button variant="outline" size="sm" className="w-full">
              عرض جميع الفواتير المتأخرة ({invoices.length})
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
});

/** بطاقة التحصيل الشهري */
const MonthlyCollectionCard = memo(function MonthlyCollectionCard({
  data,
}: {
  data: AccountantMetrics['monthlyCollection'];
}) {
  if (!data.length) return null;

  // آخر 6 أشهر فقط
  const recent = data.slice(-6);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          ملخص التحصيل الشهري
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recent.map(item => {
            const color = item.rate >= 80 ? 'bg-success' : item.rate >= 50 ? 'bg-warning' : 'bg-destructive';
            const textColor = item.rate >= 80 ? 'text-success' : item.rate >= 50 ? 'text-warning' : 'text-destructive';
            return (
              <div key={item.month} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {fmtInt(item.collected)} / {fmtInt(item.expected)} ر.س
                    </span>
                    <span className={`font-bold ${textColor}`}>{item.rate}%</span>
                  </div>
                </div>
                <Progress value={item.rate} className={`h-2 [&>div]:${color}`} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

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
