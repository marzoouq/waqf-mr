/**
 * شارة مقارنة YoY — تظهر سهم ↑↓ ونسبة التغيير.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YoYBadgeProps {
  changePercent: number | null;
  /** عكس اللون — المصروفات: ارتفاع = سيء */
  invertColor?: boolean;
  className?: string;
}

const YoYBadge: React.FC<YoYBadgeProps> = ({ changePercent, invertColor = false, className }) => {
  if (changePercent === null) return null;

  const isPositive = changePercent > 0;
  const isNeutral = changePercent === 0;

  // اللون: الدخل ↑ = أخضر، المصروفات ↑ = أحمر
  const goodColor = 'text-success';
  const badColor = 'text-destructive';
  const neutralColor = 'text-muted-foreground';

  let color: string;
  if (isNeutral) {
    color = neutralColor;
  } else if (invertColor) {
    color = isPositive ? badColor : goodColor;
  } else {
    color = isPositive ? goodColor : badColor;
  }

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-medium', color, className)}>
      <Icon className="w-3 h-3" />
      {isNeutral ? null : <>{Math.abs(changePercent)}%</>}
    </span>
  );
};

export default YoYBadge;
