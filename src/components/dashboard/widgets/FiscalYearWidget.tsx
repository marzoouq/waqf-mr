/**
 * D-3: ويدجت السنة المالية — أيام متبقية + نسبة إنجاز زمني + مالي.
 * يعرض معلومات مختلفة حسب حالة السنة (نشطة/مقفلة).
 * S6-2: حسابات التواريخ والتقدم استُخرجت إلى useFiscalYearWidget.
 */
import SectionHeading from '@/components/layout/SectionHeading';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, CheckCircle2, Lock } from 'lucide-react';
import { useFiscalYearWidget } from '@/hooks/page/admin/dashboard/useFiscalYearWidget';

interface FiscalYearInfo {
  label: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface FiscalYearWidgetProps {
  fiscalYear: FiscalYearInfo | null;
  totalIncome: number;
  contractualRevenue: number;
}

const FiscalYearWidget: React.FC<FiscalYearWidgetProps> = ({
  fiscalYear,
  totalIncome,
  contractualRevenue,
}) => {
  if (!fiscalYear) return null;

  // عرض مُبسّط للسنة المقفلة/المسودة
  if (fiscalYear.status !== 'active') {
    const statusLabel = fiscalYear.status === 'closed' ? 'مُقفلة' : 'مسودة';
    return (
      <section aria-label="السنة المالية">
        <SectionHeading title="السنة المالية" />
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Lock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span className="tabular-nums">{fiscalYear.label}</span>
            <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            من {fmtLongDate(fiscalYear.start_date)} إلى {fmtLongDate(fiscalYear.end_date)}
          </p>
        </div>
      </section>
    );
  }

  // السنة النشطة — عرض كامل مع تقدم زمني ومالي
  return <ActiveFiscalYearWidget fiscalYear={fiscalYear} totalIncome={totalIncome} contractualRevenue={contractualRevenue} />;
};

/** ويدجت السنة النشطة — منطق محسوب في useFiscalYearWidget (S6-2) */
const ActiveFiscalYearWidget: React.FC<{ fiscalYear: FiscalYearInfo; totalIncome: number; contractualRevenue: number }> = ({
  fiscalYear, totalIncome, contractualRevenue,
}) => {
  const {
    totalDays,
    remainingDays,
    timeProgress,
    rawFinancialProgress,
    exceededTarget,
    financialProgress,
  } = useFiscalYearWidget({ fiscalYear, totalIncome, contractualRevenue });

  const financialTone = financialProgress >= timeProgress ? 'success' : 'warning';
  return (
    <section aria-label="السنة المالية">
      <SectionHeading title="السنة المالية" />
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground tabular-nums">{fiscalYear.label}</p>
            <p className="text-xs text-muted-foreground">تنتهي في {fmtLongDate(fiscalYear.end_date)}</p>
          </div>
          <div className="text-end">
            <p className={`flex items-center justify-end gap-1 text-lg font-bold tabular-nums ${remainingDays <= 7 ? 'text-destructive' : remainingDays <= 30 ? 'text-warning' : 'text-foreground'}`}>
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {remainingDays}
            </p>
            <p className="text-[11px] text-muted-foreground">يوماً متبقية من {totalDays}</p>
          </div>
        </div>

        <ProgressRow label="التقدم الزمني" value={timeProgress} display={`${timeProgress}%`} barClass="[&>div]:bg-primary" />
        <ProgressRow
          label="التحصيل المالي"
          icon={<TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden="true" />}
          value={financialProgress}
          display={exceededTarget ? `${rawFinancialProgress}%` : `${financialProgress}%`}
          valueClass={financialTone === 'success' ? 'text-success' : 'text-warning'}
          barClass={financialTone === 'success' ? '[&>div]:bg-success' : '[&>div]:bg-warning'}
          badge={exceededTarget ? (
            <Badge variant="outline" className="text-[10px] border-success text-success gap-1">
              <CheckCircle2 className="w-3 h-3" />
              تجاوز الهدف
            </Badge>
          ) : null}
        />
      </div>
    </section>
  );
};

const fmtLongDate = (d: string) =>
  new Date(d).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });

const ProgressRow = ({ label, value, display, barClass, valueClass = 'text-foreground', badge, icon }: {
  label: string; value: number; display: string; barClass: string; valueClass?: string; badge?: React.ReactNode; icon?: React.ReactNode;
}) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
        {badge}
      </span>
      <span className={`font-bold tabular-nums ${valueClass}`}>{display}</span>
    </div>
    <Progress value={value} className={`h-1.5 ${barClass}`} />
  </div>
);

export default FiscalYearWidget;
