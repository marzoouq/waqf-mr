/**
 * قسم حالة العقارات في التقرير السنوي
 * يعرض تقارير العقارات (صيانة مكتملة/مطلوبة + إنجازات + متبقي)
 */
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ReportItemCard from './ReportItemCard';
import type { AnnualReportItem } from '@/hooks/useAnnualReport';

interface Property {
  id: string;
  property_number: string;
  location: string;
}

interface Props {
  items: AnnualReportItem[];
  properties: Property[];
  readOnly?: boolean;
  onAdd?: () => void;
  onEdit?: (item: AnnualReportItem) => void;
  onDelete?: (id: string) => void;
  onReorder?: (id: string, direction: 'up' | 'down') => void;
}

const PropertyStatusSection: React.FC<Props> = ({
  items, properties, readOnly, onAdd, onEdit, onDelete, onReorder,
}) => {
  const propMap = new Map(properties.map(p => [p.id, p]));

  if (items.length === 0 && readOnly) {
    return <p className="text-muted-foreground text-center py-8">لا توجد تقارير عقارات لهذه السنة</p>;
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          إضافة تقرير عقار
        </Button>
      )}
      {items.map((item, idx) => {
        const prop = item.property_id ? propMap.get(item.property_id) : undefined;
        return (
          <ReportItemCard
            key={item.id}
            item={item}
            propertyName={prop ? `${prop.property_number} — ${prop.location}` : undefined}
            readOnly={readOnly}
            isFirst={idx === 0}
            isLast={idx === items.length - 1}
            onEdit={() => onEdit?.(item)}
            onDelete={() => onDelete?.(item.id)}
            onMoveUp={() => onReorder?.(item.id, 'up')}
            onMoveDown={() => onReorder?.(item.id, 'down')}
          />
        );
      })}
    </div>
  );
};

export default PropertyStatusSection;
