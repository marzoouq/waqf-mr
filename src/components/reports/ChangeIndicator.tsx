/**
 * ChangeIndicator — مؤشر نسبة التغيير بين قيمتين
 *
 * يعرض سهم صعود/نزول مع نسبة التغير، أو شرطة محايدة عند انعدام التغير.
 * مُستخرج من HistoricalComparisonPage ليُعاد استخدامه في تقارير المقارنة.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChangeIndicatorProps {
  current: number;
  previous: number;
}

export function ChangeIndicator({ current, previous }: ChangeIndicatorProps) {
  if (previous === 0 && current === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (previous === 0) return <TrendingUp className="w-4 h-4 text-success" />;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return <Minus className="w-4 h-4 text-muted-foreground" />;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${pct > 0 ? 'text-success' : 'text-destructive'}`}>
      {pct > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

export default ChangeIndicator;
