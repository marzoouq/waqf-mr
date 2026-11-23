import { Link } from 'react-router-dom';
import { Check, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import ShareDeedShell from '@/components/beneficiary/ShareDeedShell';
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
    <ShareDeedShell label={<>حصتك من ريع {ltr(fiscalYearLabel) || '—'}</>} amount={myShare} badgeLabel={badge.label} badgeIcon={BadgeIcon}>
        {!isClosed && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/15">
              <div className="h-full rounded-full bg-sidebar-primary transition-[width] duration-500" style={{ width: `${fyProgress.percent}%` }} />
            </div>
            <p className="text-xs text-primary-foreground/75">
              {fyProgress.notStarted ? FY_STATE_COPY.notStarted.badge : `متبقي ${fyProgress.daysLeft} يوم على نهاية السنة — الرقم تقديري حتى الإقفال`}
            </p>
          </div>
        )}

        {deliveryStages.length > 0 && (
          <ol className="flex items-start rounded-xl bg-ink/25 border border-primary-foreground/10 px-3 py-3" aria-label="مراحل التسليم">
            {deliveryStages.map((st, i) => (
              <li key={st.key} className="flex flex-1 items-start last:flex-none">
                <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border-2',
                      st.done ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground' : 'border-primary-foreground/35 text-primary-foreground/50',
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
                  <span className={cn('mt-3.5 h-0.5 flex-1 rounded-full', deliveryStages[i + 1]?.done ? 'bg-sidebar-primary' : 'bg-primary-foreground/20')} aria-hidden="true" />
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
              className="flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary px-3 py-2.5 text-sm font-bold text-sidebar-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
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
    </ShareDeedShell>
  );
};

export default BeneficiaryStatsRow;
