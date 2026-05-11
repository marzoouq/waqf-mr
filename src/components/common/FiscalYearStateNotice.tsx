/**
 * FiscalYearStateNotice — تنبيه موحَّد لحالات السنة المالية (CR-01).
 * يستبدل النصوص المتفرقة في Dashboard/MyShare/Disclosure.
 */
import { Info, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FY_STATE_COPY } from '@/constants/beneficiaryCopy';

type FYState = 'noPublished' | 'notStarted' | 'active' | 'closed';

interface Props {
  state: FYState;
  /** نص إضافي يُلصق بالنهاية (مثل تاريخ بدء السنة) */
  extra?: string;
  className?: string;
}

const VARIANT: Record<FYState, { border: string; bg: string; icon: typeof Info; iconCls: string }> = {
  noPublished: { border: 'border-warning/30', bg: 'bg-warning/5', icon: Info, iconCls: 'text-warning' },
  notStarted: { border: 'border-info/30', bg: 'bg-info/5', icon: Clock, iconCls: 'text-info' },
  active: { border: 'border-info/30', bg: 'bg-info/5', icon: Info, iconCls: 'text-info' },
  closed: { border: 'border-success/30', bg: 'bg-success/5', icon: CheckCircle2, iconCls: 'text-success' },
};

const FiscalYearStateNotice = ({ state, extra, className = '' }: Props) => {
  const copy = FY_STATE_COPY[state];
  const v = VARIANT[state];
  const Icon = v.icon;

  return (
    <Card className={`shadow-sm ${v.border} ${v.bg} ${className}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <Icon className={`w-5 h-5 ${v.iconCls} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm">{copy.title}</p>
            {copy.badge && (
              <Badge variant="outline" className="text-[11px]">{copy.badge}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {copy.body}
            {extra ? ` ${extra}` : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiscalYearStateNotice;
