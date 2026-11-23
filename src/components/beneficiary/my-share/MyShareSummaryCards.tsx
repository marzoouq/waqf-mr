/**
 * ملخص الحصة (الهوية الوقفية) — «صك الحصة» بالمبلغ والنسبة، ثم بطاقات: المستلم، المعلّق، السُّلف.
 * تتبع CR-02 و CR-09. الأرقام تُعرض كما تصل دون أي حساب.
 */
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, CheckCircle2, Banknote, ArrowLeft } from 'lucide-react';
import { FigureTile } from '@/components/common';
import ShareDeedShell from '@/components/beneficiary/ShareDeedShell';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { DISTRIBUTIONS_LABELS, SHARE_BADGE } from '@/constants/beneficiaryCopy';
import { cn } from '@/lib/cn';

interface Props {
  sharePercentage: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  paidAdvancesTotal: number;
  isClosed: boolean;
  advancesEnabled: boolean;
}

const MyShareSummaryCards = ({
  sharePercentage, myShare, totalReceived, pendingAmount,
  paidAdvancesTotal, isClosed, advancesEnabled,
}: Props) => {
  const badge = isClosed ? SHARE_BADGE.final : SHARE_BADGE.estimated;
  const DisclosureIcon = DOMAIN_ICONS.disclosure;
  return (
    <div className="space-y-4">
      <ShareDeedShell
        label={isClosed ? 'الحصة النهائية' : 'الحصة التقديرية'}
        amount={myShare}
        badgeLabel={badge.label}
        badgeIcon={isClosed ? CheckCircle2 : Clock}
        sub={<>نسبة الحصة <bdi dir="ltr" className="num font-bold text-primary-foreground">{sharePercentage}%</bdi> — {badge.hint}</>}
      >
        <Link
          to="/beneficiary/disclosure"
          className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
        >
          <DisclosureIcon className="h-4 w-4" aria-hidden="true" />
          كيف حُسبت حصتي؟
          <ArrowLeft className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Link>
      </ShareDeedShell>

      <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', advancesEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        <FigureTile label={DISTRIBUTIONS_LABELS.totalReceived} value={totalReceived} icon={CheckCircle} tone="success" />
        <FigureTile label={DISTRIBUTIONS_LABELS.pending} value={pendingAmount} icon={Clock} tone="warning" />
        {advancesEnabled && (
          <FigureTile label="السُّلف المصروفة" value={paidAdvancesTotal} icon={Banknote} tone="share" className="col-span-2 sm:col-span-1" />
        )}
      </div>
    </div>
  );
};

export default MyShareSummaryCards;
