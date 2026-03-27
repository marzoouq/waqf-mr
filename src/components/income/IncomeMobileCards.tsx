/** بطاقات الدخل على الموبايل */
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Income } from '@/types/database';

interface IncomeMobileCardsProps {
  items: Income[];
  isLocked: boolean;
  onEdit: (item: Income) => void;
  onDelete: (target: { id: string; name: string }) => void;
}

const IncomeMobileCards = ({ items, isLocked, onEdit, onDelete }: IncomeMobileCardsProps) => (
  <div className="space-y-3 md:hidden px-3 py-2">
    {items.map((item) => (
      <Card key={item.id} className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm">{item.source}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(item)} disabled={isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete({ id: item.id, name: `دخل ${item.source}` })} disabled={isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div><p className="text-[11px] text-muted-foreground">المبلغ</p><p className="text-sm font-medium text-success">+{fmt(safeNumber(item.amount))} ر.س</p></div>
            <div><p className="text-[11px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{item.property?.property_number || '-'}</p></div>
            {item.notes && <div className="col-span-2"><p className="text-[11px] text-muted-foreground">ملاحظات</p><p className="text-sm text-muted-foreground">{item.notes}</p></div>}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default IncomeMobileCards;
