/**
 * بطاقة رقم موحّدة (الهوية الوقفية) — عنوان، رقم بخط ثابت العرض، تلميح، ولون حسب المعنى.
 * presentational: الرقم يُعرض كما يُمرَّر دون أي حساب.
 */
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fmt } from '@/utils/format/format';

export type FigureTone = 'income' | 'expense' | 'vat' | 'share' | 'success' | 'warning' | 'neutral';

interface FigureTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: FigureTone;
  hint?: ReactNode;
  badge?: ReactNode;
  /** عرض الرقم كنسبة بدل مبلغ */
  unit?: 'currency' | 'percent' | 'count';
  className?: string;
  /** تلميح عند المرور (يشرح مصدر الرقم) */
  title?: string;
}

const TONES: Record<FigureTone, { icon: string; value: string; edge: string }> = {
  income: { icon: 'bg-success-muted text-success-foreground', value: 'text-foreground', edge: 'before:bg-success/70' },
  expense: { icon: 'bg-destructive/10 text-destructive', value: 'text-destructive', edge: 'before:bg-destructive/60' },
  vat: { icon: 'bg-vat-muted text-vat', value: 'text-vat', edge: 'before:bg-vat/60' },
  share: { icon: 'bg-bronze-soft text-bronze-foreground', value: 'text-bronze-foreground', edge: 'before:bg-bronze' },
  success: { icon: 'bg-success-muted text-success-foreground', value: 'text-success-foreground', edge: 'before:bg-success/70' },
  warning: { icon: 'bg-vat-muted text-vat', value: 'text-vat', edge: 'before:bg-vat/60' },
  neutral: { icon: 'bg-accent text-primary', value: 'text-foreground', edge: 'before:bg-primary/40' },
};

const formatValue = (value: number, unit: FigureTileProps['unit']) => {
  if (unit === 'percent') return `${value}%`;
  if (unit === 'count') return String(value);
  return fmt(value);
};

const FigureTile = ({ label, value, icon: Icon, tone = 'neutral', hint, badge, unit = 'currency', className, title }: FigureTileProps) => {
  const t = TONES[tone];
  return (
    <div
      title={title}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-2.5',
        'before:absolute before:inset-x-0 before:top-0 before:h-[3px]', t.edge,
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <span className={cn('w-8 h-8 rounded-lg grid place-items-center shrink-0', t.icon)}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="line-clamp-2 leading-snug">{label}</span>
        {badge && <span className="ms-auto shrink-0">{badge}</span>}
      </div>
      <p className={cn('num text-xl sm:text-2xl font-extrabold leading-none', t.value)}>
        <bdi dir="ltr">{formatValue(value, unit)}</bdi>
        {unit === 'currency' && <span className="ms-1.5 text-xs font-medium text-muted-foreground">ر.س</span>}
      </p>
      {hint && <p className="text-[11px] sm:text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};

export default FigureTile;
