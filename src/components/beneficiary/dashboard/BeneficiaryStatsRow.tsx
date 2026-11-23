import { Link } from 'react-router-dom';
import { Check, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AnimatedCounter } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { SHARE_BADGE, FY_STATE_COPY } from '@/constants/beneficiaryCopy';
import { fmt, fmtDate } from '@/utils/format/format';
import { cn } from '@/lib/cn';
import type { DeliveryStage } from '@/utils/dashboard/deliveryStages';
import { ltr } from '@/utils/format/bidi';

interface Distribution {
  id: string;
  amount: number;
  date: string;
  status: string;
}

interface FiscalYearProgress {
  percent: number;
  daysLeft: number;
  notStarted?: boolean;
}

interface BeneficiaryStatsRowProps {
  myShare: number;
  isClosed: boolean;
  distributions: Distribution[];
  fiscalYearLabel: string;
  fyProgress: FiscalYearProgress;
  /** مراحل التسليم للسنة المختارة */
  deliveryStages?: DeliveryStage[];
  /** إظهار روابط الحصة والإفصاح (لا تظهر للواقف) */
  showShareLinks?: boolean;
  /** @deprecated لم يعد يُعرض في بطاقة الحصة */
  myShareTrend?: number[];
}

/** بطاقة «حصتي» الرئيسية — أول ما يراه المستفيد */
const BeneficiaryStatsRow = ({
  myShare, isClosed, distributions, fiscalYearLabel, fyProgress, deliveryStages = [], showShareLinks = true,
}: BeneficiaryStatsRowProps) => {
  const lastPaid = distributions.reduce<Distribution | null>((acc, d) => {
    if (d.status !== 'paid') return acc;
    if (!acc) return d;
    return new Date(d.date).getTime() > new Date(acc.date).getTime() ? d : acc;
  }, null);

  const badge = isClosed ? SHARE_BADGE.final : SHARE_BADGE.estimated;
  const BadgeIcon = isClosed ? CheckCircle2 : Clock;
  const ShareIcon = DOMAIN_ICONS.share;
  const DisclosureIcon = DOMAIN_ICONS.disclosure;

  return (
    <section aria-label="حصتي" className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground shadow-lg animate-slide-up">
      {/* زخرفة هادئة */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary-foreground/5" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 left-24 h-40 w-40 rounded-full border border-secondary/20" aria-hidden="true" />

      <div className="relative p-5 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-primary-foreground/80">
            حصتك من ريع {ltr(fiscalYearLabel) || '—'}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground shrink-0">
            <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {badge.label}
          </span>
        </div>

        <p className="text-4xl sm:text-5xl font-bold tabular-nums leading-none tracking-tight">
          <AnimatedCounter value={myShare} decimals={2} />
          <span className="text-lg sm:text-xl font-medium text-primary-foreground/80 ms-2">ر.س</span>
        </p>

        {!isClosed && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/15">
              <div className="h-full rounded-full bg-secondary transition-[width] duration-500" style={{ width: `${fyProgress.percent}%` }} />
            </div>
            <p className="text-xs text-primary-foreground/75">
              {fyProgress.notStarted ? FY_STATE_COPY.notStarted.badge : `متبقي ${fyProgress.daysLeft} يوم على نهاية السنة — الرقم تقديري حتى الإقفال`}
            </p>
          </div>
        )}

        {deliveryStages.length > 0 && (
          <ol className="flex items-start" aria-label="مراحل التسليم">
            {deliveryStages.map((st, i) => (
              <li key={st.key} className="flex flex-1 items-start last:flex-none">
                <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border-2',
                      st.done ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-primary-foreground/35 text-primary-foreground/50',
                    )}
                    aria-hidden="true"
                  >
                    {st.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={cn('text-[11px] text-center leading-tight', st.done ? 'text-primary-foreground' : 'text-primary-foreground/60')}>
                    {st.label}
                    {st.date && <span className="block tabular-nums text-primary-foreground/70">{fmtDate(st.date)}</span>}
                    <span className="sr-only">{st.done ? ' — منجزة' : ' — لم تتم بعد'}</span>
                  </span>
                </div>
                {i < deliveryStages.length - 1 && (
                  <span className={cn('mt-3.5 h-0.5 flex-1 rounded-full', deliveryStages[i + 1]?.done ? 'bg-secondary' : 'bg-primary-foreground/20')} aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        )}

        {lastPaid && (
          <p className="text-xs text-primary-foreground/80 border-t border-primary-foreground/15 pt-3 tabular-nums">
            آخر توزيع مدفوع: <span className="font-bold text-primary-foreground">{fmt(Number(lastPaid.amount))} ر.س</span> — {fmtDate(lastPaid.date)}
          </p>
        )}

        {showShareLinks && (
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/beneficiary/my-share"
              className="flex items-center justify-center gap-2 rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <ShareIcon className="h-4 w-4" aria-hidden="true" />
              تفاصيل حصتي
            </Link>
            <Link
              to="/beneficiary/disclosure"
              className="flex items-center justify-center gap-2 rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <DisclosureIcon className="h-4 w-4" aria-hidden="true" />
              كيف حُسبت؟
              <ArrowLeft className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default BeneficiaryStatsRow;
