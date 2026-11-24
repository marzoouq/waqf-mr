import { cn } from '@/lib/cn';
import { STATUS_MAP } from './contractsViewShared';

const TONE: Record<string, string> = {
  active: 'bg-primary/10 text-primary ring-primary/20',
  expired: 'bg-muted text-muted-foreground ring-border',
  cancelled: 'bg-warning/10 text-warning ring-warning/20',
};

/** شارة حالة العقد الموحّدة (عرض فقط). */
export default function ContractStatusChip({ status }: { status: string | null }) {
  const key = status ?? '';
  const label = STATUS_MAP[key]?.label ?? key;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', TONE[key] ?? TONE.expired)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', key === 'active' ? 'bg-primary' : 'bg-muted-foreground/60')} aria-hidden="true" />
      {label}
    </span>
  );
}
