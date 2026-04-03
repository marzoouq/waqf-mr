/**
 * بطاقات المصروفات للموبايل
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Paperclip } from 'lucide-react';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';
import ExpenseAttachments from './ExpenseAttachments';

interface ExpenseItem {
  id: string;
  expense_type: string;
  amount: number;
  date: string;
  description: string | null;
  property?: { property_number: string } | null;
  [key: string]: unknown;
}

interface ExpensesMobileCardsProps {
  items: ExpenseItem[];
  expenseInvoiceMap: Map<string, number>;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit: (item: any) => void;
  onDelete: (target: { id: string; name: string }) => void;
  isLocked: boolean;
}

const ExpensesMobileCards = ({ items, expenseInvoiceMap, expandedRow, setExpandedRow, onEdit, onDelete, isLocked }: ExpensesMobileCardsProps) => (
  <div className="space-y-3 md:hidden px-3 py-2">
    {items.map((item) => {
      const attachCount = expenseInvoiceMap.get(item.id) || 0;
      return (
        <Card key={item.id} className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{item.expense_type}</span>
                  {attachCount > 0 && <Badge variant="secondary" className="gap-1 text-xs"><Paperclip className="w-3 h-3" />{attachCount}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(item)} disabled={isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete({ id: item.id, name: `مصروف ${item.expense_type}` })} disabled={isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><p className="text-[11px] text-muted-foreground">المبلغ</p><p className="text-sm font-medium text-destructive">-{fmt(safeNumber(item.amount))} ر.س</p></div>
              <div><p className="text-[11px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{item.property?.property_number || '-'}</p></div>
              {item.description && <div className="col-span-2"><p className="text-[11px] text-muted-foreground">الوصف</p><p className="text-sm text-muted-foreground">{item.description}</p></div>}
            </div>
            {expandedRow === item.id && <ExpenseAttachments expenseId={item.id} />}
            {attachCount > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                {expandedRow === item.id ? 'إخفاء المرفقات' : 'عرض المرفقات'}
              </Button>
            )}
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default ExpensesMobileCards;
