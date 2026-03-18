/**
 * A-1: قائمة تحقق (Checklist) قبل إقفال السنة المالية.
 * تتحقق من اكتمال العمليات الأساسية قبل السماح بالإقفال.
 */
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from './closeYearChecklist.utils';

interface CloseYearChecklistProps {
  items: ChecklistItem[];
  className?: string;
}

const CloseYearChecklist: React.FC<CloseYearChecklistProps> = ({ items, className }) => {
  const hasErrors = items.some(i => !i.passed && i.severity === 'error');

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-muted-foreground mb-1">فحص ما قبل الإقفال:</p>
      <ul className="space-y-1.5">
        {items.map((item, idx) => {
          const Icon = item.passed ? CheckCircle : item.severity === 'error' ? XCircle : AlertTriangle;
          const color = item.passed
            ? 'text-success'
            : item.severity === 'error'
              ? 'text-destructive'
              : 'text-warning';

          return (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
              <div>
                <span className={item.passed ? 'text-muted-foreground' : 'text-foreground'}>{item.label}</span>
                {item.detail && !item.passed && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {hasErrors && (
        <p className="text-xs text-destructive font-medium mt-2">
          ⚠️ يوجد عناصر حرجة لم تكتمل — يُنصح بمعالجتها قبل الإقفال
        </p>
      )}
    </div>
  );
};

export default CloseYearChecklist;
