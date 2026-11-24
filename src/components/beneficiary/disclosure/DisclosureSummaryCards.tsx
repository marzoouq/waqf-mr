/**
 * بطاقات ملخص الإفصاح (الهوية الوقفية) — المصروفات منفصلة دائماً، والأرقام تُعرض كما تصل.
 */
import { TrendingUp, TrendingDown, Wallet, CheckCircle, Clock, Percent } from 'lucide-react';
import { EstimatedShareBadge, FigureTile } from '@/components/common';
import { DISTRIBUTIONS_LABELS } from '@/constants/beneficiaryCopy';

interface Props {
  totalIncome: number;
  totalExpenses: number;
  /** ضريبة القيمة المضافة — بطاقة مستقلة لا تُجمع مع المصروفات */
  vatAmount: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  waqfCorpusPrevious: number;
  /** CR-02: هل السنة مغلقة؟ */
  isClosed?: boolean;
}

const DisclosureSummaryCards = ({
  totalIncome, totalExpenses, vatAmount, myShare, totalReceived, pendingAmount, waqfCorpusPrevious, isClosed = false,
}: Props) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
    <FigureTile
      label={isClosed ? 'حصتي النهائية' : 'حصتي التقديرية'}
      value={myShare}
      icon={Wallet}
      tone="share"
      badge={<EstimatedShareBadge isEstimated={!isClosed} />}
      className="col-span-2 lg:col-span-1"
    />
    <FigureTile label="إجمالي الإيرادات" value={totalIncome} icon={TrendingUp} tone="income" />
    <FigureTile label="المصروفات التشغيلية" value={totalExpenses} icon={TrendingDown} tone="expense" />
    {vatAmount > 0 && (
      <FigureTile label="ضريبة القيمة المضافة" value={vatAmount} icon={Percent} tone="vat" />
    )}
    {waqfCorpusPrevious > 0 && (
      <FigureTile label="مبلغ مرحّل من العام السابق" value={waqfCorpusPrevious} icon={Wallet} tone="neutral" />
    )}
    <FigureTile label={DISTRIBUTIONS_LABELS.totalReceived} value={totalReceived} icon={CheckCircle} tone="success" />
    {pendingAmount > 0 && (
      <FigureTile label={DISTRIBUTIONS_LABELS.pending} value={pendingAmount} icon={Clock} tone="warning" />
    )}
  </div>
);

export default DisclosureSummaryCards;
