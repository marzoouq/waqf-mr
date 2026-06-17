/**
 * شارات تصفية حالة الفحوصات
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CheckStatus } from '@/lib/diagnostics/types';

export type StatusFilter = CheckStatus | 'all';

interface Props {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<CheckStatus, number>;
}

const OPTIONS: { value: StatusFilter; label: string; cls: string }[] = [
  { value: 'all', label: 'الكل', cls: '' },
  { value: 'pass', label: 'ناجح', cls: 'text-success' },
  { value: 'warn', label: 'تحذير', cls: 'text-warning' },
  { value: 'fail', label: 'فشل', cls: 'text-destructive' },
  { value: 'info', label: 'معلومة', cls: 'text-info' },
];

export default function StatusFilterChips({ value, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-3" role="toolbar" aria-label="تصفية الفحوصات بحسب الحالة">
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        const count = opt.value === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[opt.value];
        return (
          <Button
            key={opt.value}
            size="sm"
            variant={active ? 'default' : 'outline'}
            onClick={() => onChange(opt.value)}
            className="h-8"
          >
            <span className={opt.cls}>{opt.label}</span>
            <Badge variant="secondary" className="ms-2 text-xs">{count}</Badge>
          </Button>
        );
      })}
    </div>
  );
}
