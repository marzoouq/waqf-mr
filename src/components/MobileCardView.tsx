import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2 } from 'lucide-react';

export interface CardField {
  label: string;
  value: React.ReactNode;
  className?: string;
}

interface MobileCardViewProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getTitle: (item: T) => React.ReactNode;
  getSubtitle?: (item: T) => React.ReactNode;
  getFields: (item: T) => CardField[];
  getBadge?: (item: T) => React.ReactNode;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  extraActions?: (item: T) => React.ReactNode;
  isLoading?: boolean;
  skeletonCount?: number;
}

function MobileCardView<T>({
  items,
  getKey,
  getTitle,
  getSubtitle,
  getFields,
  getBadge,
  onEdit,
  onDelete,
  extraActions,
}: MobileCardViewProps<T>) {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => (
        <Card key={getKey(item)} className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{getTitle(item)}</span>
                  {getBadge?.(item)}
                </div>
                {getSubtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{getSubtitle(item)}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {extraActions?.(item)}
                {onEdit && (
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {getFields(item).map((field, i) => (
                <div key={i} className={field.className}>
                  <p className="text-[10px] text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium">{field.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default MobileCardView;
