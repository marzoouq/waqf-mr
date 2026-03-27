/** جدول الدخل للديسكتوب */
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Edit, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { Income } from '@/types/database';
import type { SortField } from '@/hooks/page/useIncomePage';

interface IncomeDesktopTableProps {
  items: Income[];
  isLocked: boolean;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onEdit: (item: Income) => void;
  onDelete: (target: { id: string; name: string }) => void;
}

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) => {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
};

const IncomeDesktopTable = ({ items, isLocked, sortField, sortDir, onSort, onEdit, onDelete }: IncomeDesktopTableProps) => (
  <div className="overflow-x-auto hidden md:block">
    <Table className="min-w-[650px]">
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="text-right cursor-pointer select-none" onClick={() => onSort('source')}>
            <span className="inline-flex items-center gap-1">المصدر <SortIcon field="source" sortField={sortField} sortDir={sortDir} /></span>
          </TableHead>
          <TableHead className="text-right cursor-pointer select-none" onClick={() => onSort('amount')}>
            <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" sortField={sortField} sortDir={sortDir} /></span>
          </TableHead>
          <TableHead className="text-right cursor-pointer select-none" onClick={() => onSort('date')}>
            <span className="inline-flex items-center gap-1">التاريخ <SortIcon field="date" sortField={sortField} sortDir={sortDir} /></span>
          </TableHead>
          <TableHead className="text-right">العقار</TableHead>
          <TableHead className="text-right">ملاحظات</TableHead>
          <TableHead className="text-right">إجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
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
        ))}
      </TableBody>
    </Table>
  </div>
);

export default IncomeDesktopTable;
