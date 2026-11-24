/**
 * رأس «مركز قيادة الوقف» — يجمع التحية والتاريخ والسنة المالية والإجراءات في شريط وقفي واحد.
 * presentational: كل القيم تصل جاهزة؛ تقدّم السنة يأتي من useFiscalYearWidget القائم.
 */
import type { ReactNode } from 'react';
import { Lock, CalendarDays, Sun, Moon } from 'lucide-react';
import type { GreetingData } from '@/hooks/ui/useGreeting';
import { useFiscalYearWidget } from '@/hooks/page/admin/dashboard/useFiscalYearWidget';
import { ltr } from '@/utils/format/bidi';

interface FiscalYearInfo {
  label: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface AdminCommandHeaderProps {
  greetingData: GreetingData;
  /** سطر الترحيب الجاهز من هوك الصفحة */
  subtitle: string;
  fiscalYear: FiscalYearInfo | null;
  totalIncome: number;
  contractualRevenue: number;
  actions?: ReactNode;
}

const STATUS_LABEL: Record<string, string> = { active: 'سنة نشطة', closed: 'سنة مقفلة', draft: 'مسودة' };

const AdminCommandHeader = ({ greetingData, subtitle, fiscalYear, totalIncome, contractualRevenue, actions }: AdminCommandHeaderProps) => {
  const GreetingIcon = greetingData.greetingIconName === 'sun' ? Sun : Moon;
  return (
    <section aria-label="مركز قيادة الوقف" className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground waqf-frame">
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-sidebar-primary/20" aria-hidden="true" />
      <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs sm:text-sm text-primary-foreground/75">
            <GreetingIcon className="h-4 w-4 text-sidebar-primary" aria-hidden="true" />
            {greetingData.greeting} — {subtitle}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">مركز قيادة الوقف</h1>
          <p className="flex items-center gap-1.5 text-xs text-primary-foreground/70 tabular-nums">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {greetingData.hijriDate} · {greetingData.gregorianDate}
          </p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
        {fiscalYear && (
          <div className="lg:col-span-2">
            {fiscalYear.status === 'active'
              ? <ActiveYearStrip fiscalYear={fiscalYear} totalIncome={totalIncome} contractualRevenue={contractualRevenue} />
              : <ClosedYearStrip fiscalYear={fiscalYear} />}
          </div>
        )}
      </div>
    </section>
  );
};

const ClosedYearStrip = ({ fiscalYear }: { fiscalYear: FiscalYearInfo }) => (
  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-foreground/10 bg-ink/25 px-4 py-3 text-sm">
    <Lock className="h-4 w-4 text-sidebar-primary" aria-hidden="true" />
    <span className="font-bold tabular-nums">{ltr(fiscalYear.label)}</span>
    <span className="rounded-full bg-sidebar-primary px-2.5 py-0.5 text-xs font-bold text-sidebar-primary-foreground">
      {STATUS_LABEL[fiscalYear.status] ?? fiscalYear.status}
    </span>
    <span className="text-xs text-primary-foreground/70">وضع اطّلاع وتدقيق — الأرقام كما صدرت</span>
  </div>
);

const ActiveYearStrip = ({ fiscalYear, totalIncome, contractualRevenue }: { fiscalYear: FiscalYearInfo; totalIncome: number; contractualRevenue: number }) => {
  const { remainingDays, totalDays, timeProgress, financialProgress, rawFinancialProgress, exceededTarget } =
    useFiscalYearWidget({ fiscalYear, totalIncome, contractualRevenue });
  return (
    <div className="grid gap-3 rounded-xl border border-primary-foreground/10 bg-ink/25 px-4 py-3 sm:grid-cols-[auto_1fr_1fr] sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        <span className="font-bold tabular-nums">{ltr(fiscalYear.label)}</span>
        <span className="rounded-full bg-sidebar-primary px-2.5 py-0.5 text-xs font-bold text-sidebar-primary-foreground">{STATUS_LABEL.active}</span>
        <span className="text-xs text-primary-foreground/75 tabular-nums">متبقٍ {remainingDays} من {totalDays} يوماً</span>
      </div>
      <StripBar label="التقدم الزمني" value={timeProgress} display={`${timeProgress}%`} />
      <StripBar label="التحصيل من التعاقدي" value={financialProgress} display={`${exceededTarget ? rawFinancialProgress : financialProgress}%`} />
    </div>
  );
};

const StripBar = ({ label, value, display }: { label: string; value: number; display: string }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-[11px] text-primary-foreground/75">
      <span>{label}</span>
      <span className="font-bold tabular-nums text-primary-foreground">{display}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/15" dir="rtl">
      <div className="h-full rounded-full bg-sidebar-primary transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  </div>
);

export default AdminCommandHeader;
