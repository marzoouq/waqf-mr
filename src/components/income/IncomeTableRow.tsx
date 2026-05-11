/**
 * صف واحد في جدول الإيرادات (Batch E memoization)
 */
import { memo } from 'react';
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import type { Income } from '@/types';

interface Props {
  item: Income;
  isLocked: boolean;
  onEdit: (item: Income) => void;
  onDelete: (target: { id: string; name: string }) => void;
}

const IncomeTableRow = memo(function IncomeTableRow({ item, isLocked, onEdit, onDelete }: Props) {
  return (
    <TableRow key={item.id}>
      <TableCell className="font-medium">{item.source}</TableCell>
      <TableCell className="text-success font-medium">+{fmt(safeNumber(item.amount))} ر.س</TableCell>
      <TableCell>{item.date}</TableCell>
      <TableCell>{item.property?.property_number || '-'}</TableCell>
      <TableCell className="text-muted-foreground">{item.notes || '-'}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} disabled={isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete({ id: item.id, name: `دخل ${item.source}` })} className="text-destructive hover:text-destructive" disabled={isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default IncomeTableRow;
