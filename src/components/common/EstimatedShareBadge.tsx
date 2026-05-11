/**
 * EstimatedShareBadge — شارة الحصة التقديرية/النهائية (CR-02).
 */
import { Clock, CheckCircle2 } from 'lucide-react';
import { SHARE_BADGE } from '@/constants/beneficiaryCopy';

interface Props {
  /** true قبل إقفال السنة */
  isEstimated: boolean;
  className?: string;
  showHint?: boolean;
}

const EstimatedShareBadge = ({ isEstimated, className = '', showHint = false }: Props) => {
  const Icon = isEstimated ? Clock : CheckCircle2;
  const cfg = isEstimated ? SHARE_BADGE.estimated : SHARE_BADGE.final;
  const tone = isEstimated
    ? 'bg-warning/10 border-warning/30 text-warning'
    : 'bg-success/10 border-success/30 text-success';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${tone} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label}</span>
      {showHint && <span className="text-[10px] opacity-80">— {cfg.hint}</span>}
    </span>
  );
};

export default EstimatedShareBadge;
