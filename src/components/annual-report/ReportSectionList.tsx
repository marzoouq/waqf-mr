/**
 * قسم عناصر التقرير السنوي (إنجازات/تحديات/خطط)
 */
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { SectionType, AnnualReportItem } from '@/hooks/data/content/useAnnualReport';
import ReportItemCard from './ReportItemCard';

interface ReportSectionListProps {
  type: SectionType;
  items: AnnualReportItem[];
  onAdd: () => void;
  onEdit: (item: AnnualReportItem) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

const SECTION_LABELS: Record<string, string> = {
  achievement: 'إنجاز',
  challenge: 'تحدي',
  future_plan: 'خطة',
};

const ReportSectionList: React.FC<ReportSectionListProps> = ({
  type, items, onAdd, onEdit, onDelete, onReorder,
}) => {
  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        إضافة {SECTION_LABELS[type] || type}
      </Button>
      {items.length === 0 && (
        <p className="text-muted-foreground text-center py-8">لا توجد عناصر بعد</p>
      )}
      {items.map((item, idx) => (
        <ReportItemCard
          key={item.id}
          item={item}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          onMoveUp={() => onReorder(item.id, 'up')}
          onMoveDown={() => onReorder(item.id, 'down')}
        />
      ))}
    </div>
  );
};

export default ReportSectionList;
