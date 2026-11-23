import { memo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Banknote, TrendingDown, XCircle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { EXPENSE_RATIO_FULL_DEFICIT } from '@/utils/financial/computations/ratios';
import SectionHeading from '@/components/layout/SectionHeading';
import { cn } from '@/lib/cn';

interface DashboardAlertsProps {
  usingFallbackPct: boolean;
  expiringContractsCount: number;
  orphanedContractsCount: number;
  pendingAdvancesCount?: number;
  collectionRate?: number;
  expenseRatio?: number;
  /** يمكن للمستخدم الحالي الموافقة على السُلف (الناظر فقط) */
  canApproveAdvances?: boolean;
  /** يمكن للمستخدم الحالي ضبط النسب الافتراضية (الناظر فقط) */
  canConfigureRatios?: boolean;
}

interface AttentionItem {
  key: string;
  tone: 'danger' | 'warning';
  icon: LucideIcon;
  title: string;
  description: string;
  to?: string;
}

const TONE = {
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/15 text-warning-foreground',
} as const;

/** قسم «يحتاج انتباهك» — يجمع كل التنبيهات في بطاقة واحدة بالترتيب حسب الأولوية */
const DashboardAlerts = ({ usingFallbackPct, expiringContractsCount, orphanedContractsCount, pendingAdvancesCount = 0, collectionRate, expenseRatio = 0, canApproveAdvances = false, canConfigureRatios = false }: DashboardAlertsProps) => {
  const items: AttentionItem[] = [];

  if (expenseRatio > 100) {
    items.push({
      key: 'deficit', tone: 'danger', icon: XCircle, title: 'تحذير: عجز مالي', to: '/dashboard/expenses',
      description: expenseRatio === EXPENSE_RATIO_FULL_DEFICIT
        ? 'يوجد إنفاق مسجّل بدون أي دخل في الفترة الحالية — راجع المصروفات'
        : `المصروفات تتجاوز الدخل بنسبة ${expenseRatio - 100}% — راجع المصروفات`,
    });
  }
  if (orphanedContractsCount > 0) {
    items.push({
      key: 'orphaned', tone: 'danger', icon: AlertTriangle, title: 'عقود بدون سنة مالية', to: '/dashboard/contracts',
      description: `${orphanedContractsCount} عقد غير مربوط بسنة مالية ولن يظهر في التقارير`,
    });
  }
  if (collectionRate !== null && collectionRate !== undefined && collectionRate > 0 && collectionRate < 50) {
    items.push({
      key: 'collection', tone: 'danger', icon: TrendingDown, title: 'معدل التحصيل منخفض', to: '/dashboard/invoices',
      description: `معدل التحصيل ${collectionRate}% — راجع الفواتير المتأخرة`,
    });
  }
  if (pendingAdvancesCount > 0) {
    items.push({
      key: 'advances', tone: 'warning', icon: Banknote, title: 'سُلف بانتظار الموافقة',
      to: canApproveAdvances ? '/dashboard/accounts' : undefined,
      description: `${pendingAdvancesCount} طلب سُلفة معلق${canApproveAdvances ? '' : ' — تحتاج موافقة الناظر'}`,
    });
  }
  if (expiringContractsCount > 0) {
    items.push({
      key: 'expiring', tone: 'warning', icon: Clock, title: 'عقود تنتهي قريباً', to: '/dashboard/contracts',
      description: `${expiringContractsCount} عقد ينتهي خلال ${EXPIRING_SOON_DAYS} يوماً القادمة`,
    });
  }
  if (usingFallbackPct && canConfigureRatios) {
    items.push({
      key: 'fallback', tone: 'warning', icon: AlertTriangle, title: 'نسب افتراضية مُستخدمة', to: '/dashboard/accounts',
      description: 'الناظر 10% والواقف 5% — اضبطها من الحسابات',
    });
  }

  return (
    <section aria-label="يحتاج انتباهك">
      <SectionHeading title="يحتاج انتباهك" count={items.length} />
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-foreground">لا شيء يحتاج إجراء الآن</p>
        </div>
      ) : (
        <ul className="rounded-2xl border bg-card shadow-sm divide-y overflow-hidden">
          {items.map((it) => {
            const body = (
              <>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE[it.tone])}>
                  <it.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{it.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{it.description}</span>
                </span>
                {it.to && <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </>
            );
            return (
              <li key={it.key}>
                {it.to ? (
                  <Link to={it.to} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 p-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default memo(DashboardAlerts);
