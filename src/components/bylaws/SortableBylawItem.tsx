/**
 * مكون بند اللائحة القابل للسحب والترتيب
 */
import { lazy, Suspense } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
const ReactMarkdown = lazy(() => import('react-markdown'));
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BylawEntry } from '@/hooks/data/useBylaws';

interface SortableBylawItemProps {
  item: BylawEntry;
  openEdit: (item: BylawEntry) => void;
  toggleVisibility: (item: BylawEntry) => void;
  onDelete: (item: BylawEntry) => void;
  isDragDisabled: boolean;
}

const SortableBylawItem = ({ item, openEdit, toggleVisibility, onDelete, isDragDisabled }: SortableBylawItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={item.id} className="border rounded-lg px-4 hover:border-primary/30 transition-colors">
        <AccordionTrigger className="hover:no-underline py-3">
          <div className="flex items-center gap-3 flex-1 text-right">
            {!isDragDisabled && (
              <div
                className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted text-muted-foreground"
                {...attributes}
                {...listeners}
                role="button"
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <Badge variant={item.is_visible ? 'default' : 'secondary'} className="shrink-0 min-w-14 justify-center">
              {item.part_number === 0 ? 'مقدمة' : `جزء ${item.part_number}`}
            </Badge>
            {item.chapter_number && (
              <Badge variant="outline" className="shrink-0 text-xs">
                فصل {item.chapter_number}
              </Badge>
            )}
            <span className="font-semibold text-sm flex-1">
              {item.chapter_title || item.part_title}
            </span>
            {!item.is_visible && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
                <EyeOff className="w-3 h-3 ml-1" /> مخفي
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-2 pb-4 space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-right leading-relaxed prose-headings:text-primary prose-strong:text-foreground" dir="rtl">
              <Suspense fallback={<div className="animate-pulse h-4 bg-muted rounded" />}>
                <ReactMarkdown>{item.content}</ReactMarkdown>
              </Suspense>
            </div>
            <div className="flex items-center justify-between pt-3 border-t print:hidden">
              <div className="flex items-center gap-3">
                <Switch
                  checked={item.is_visible}
                  onCheckedChange={() => toggleVisibility(item)}
                />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {item.is_visible ? 'ظاهر للمستفيدين' : 'مخفي عن المستفيدين'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onDelete(item)} className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">حذف</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(item)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تعديل</span>
                </Button>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default SortableBylawItem;
