/**
 * بطاقة عنصر واحد في التقرير السنوي (عرض/تعديل/حذف)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import type { AnnualReportItem } from '@/hooks/useAnnualReport';

interface Props {
  item: AnnualReportItem;
  propertyName?: string;
  readOnly?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const ReportItemCard: React.FC<Props> = ({
  item, propertyName, readOnly, isFirst, isLast,
  onEdit, onDelete, onMoveUp, onMoveDown,
}) => {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {propertyName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{propertyName}</span>
              </div>
            )}
            <h4 className="font-semibold text-foreground">{item.title}</h4>
            {item.content && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {item.content}
              </p>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1 shrink-0">
              {!isFirst && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {!isLast && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportItemCard;
