/**
 * شريط تقدم موحّد للتحصيل/الإشغال (الهوية الوقفية) — النسبة تُعرض كما تصل.
 */
import type { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';

interface ProgressSummaryBarProps {
  label: string;
  /** النسبة 0–100 */
  rate: number;
  meta?: ReactNode;
  className?: string;
}

const rateClasses = (rate: number) =>
  rate >= 80 ? { text: 'text-success', bar: '[&>div]:bg-success' }
    : rate >= 50 ? { text: 'text-warning', bar: '[&>div]:bg-warning' }
      : { text: 'text-destructive', bar: '[&>div]:bg-destructive' };

const ProgressSummaryBar = ({ label, rate, meta, className }: ProgressSummaryBarProps) => {
  const c = rateClasses(rate);
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm space-y-2.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className={cn('num text-base font-extrabold', c.text)}><bdi dir="ltr">{rate.toFixed(0)}%</bdi></span>
      </div>
      <Progress value={rate} className={cn('h-2.5', c.bar)} />
      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
    </div>
  );
};

export default ProgressSummaryBar;
