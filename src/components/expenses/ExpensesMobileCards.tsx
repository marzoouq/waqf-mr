/**
 * بطاقات المصروفات للموبايل
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Paperclip } from 'lucide-react';
import { safeNumber } from '@/utils/format/safeNumber';
import { fmt } from '@/utils/format/format';
import ExpenseAttachments from './ExpenseAttachments';
import type { Expense } from '@/types/relations';

interface ExpensesMobileCardsProps {
  items: Expense[];
  expenseInvoiceMap: Map<string, number>;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  onEdit: (item: Expense) => void;
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
                <div className="font-bold text-sm text-foreground" title={item.description || item.expense_type}>
                  {item.description || item.expense_type}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {item.description && <Badge variant="outline" className="text-[10px] font-normal">{item.expense_type}</Badge>}
                  {attachCount > 0 && <Badge variant="secondary" className="gap-1 text-xs"><Paperclip className="w-3 h-3" />{attachCount}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(item)} disabled={isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete({ id: item.id, name: `مصروف ${item.expense_type}` })} disabled={isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><p className="text-[11px] text-muted-foreground">المبلغ</p><p className="text-sm font-medium text-destructive">-{fmt(safeNumber(item.amount))} ر.س</p></div>
              <div><p className="text-[11px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{item.property?.property_number || '-'}</p></div>
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
