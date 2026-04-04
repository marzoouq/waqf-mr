/**
 * جدول المصروفات لسطح المكتب
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trash2, Edit, Paperclip, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';
import ExpenseAttachments from './ExpenseAttachments';
import type { Expense } from '@/types/relations';

type SortField = 'expense_type' | 'amount' | 'date' | null;

interface ExpensesDesktopTableProps {
  items: Expense[];
  expenseInvoiceMap: Map<string, number>;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  onEdit: (item: Expense) => void;
  onDelete: (target: { id: string; name: string }) => void;
  isLocked: boolean;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) => {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
};

const ExpensesDesktopTable = ({ items, expenseInvoiceMap, expandedRow, setExpandedRow, onEdit, onDelete, isLocked, sortField, sortDir, onSort }: ExpensesDesktopTableProps) => (
  <div className="overflow-x-auto hidden md:block">
    <Table className="min-w-[700px]">
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="text-right w-8"></TableHead>
          <TableHead className="text-right cursor-pointer select-none" onClick={() => onSort('expense_type')}>
            <span className="inline-flex items-center gap-1">النوع <SortIcon field="expense_type" sortField={sortField} sortDir={sortDir} /></span>
          </TableHead>
          <TableHead className="text-right cursor-pointer select-none" onClick={() => onSort('amount')}>
            <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" sortField={sortField} sortDir={sortDir} /></span>
          </TableHead>
          <TableHead className="text-right cursor-pointer select-none" onClick={() => onSort('date')}>
            <span className="inline-flex items-center gap-1">التاريخ <SortIcon field="date" sortField={sortField} sortDir={sortDir} /></span>
          </TableHead>
          <TableHead className="text-right">العقار</TableHead>
          <TableHead className="text-right">المرفقات</TableHead>
          <TableHead className="text-right">الوصف</TableHead>
          <TableHead className="text-right">إجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const attachCount = expenseInvoiceMap.get(item.id) || 0;
          const isExpanded = expandedRow === item.id;
          return (
            <React.Fragment key={item.id}>
              <TableRow className={isExpanded ? 'border-b-0' : ''}>
                <TableCell className="p-1">
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setExpandedRow(isExpanded ? null : item.id)} aria-label={isExpanded ? 'طي' : 'توسيع'}>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{item.expense_type}</TableCell>
                <TableCell className="text-destructive font-medium">-{fmt(safeNumber(item.amount))} ر.س</TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.property?.property_number || '-'}</TableCell>
                <TableCell>
                  {attachCount > 0 ? <Badge variant="secondary" className="gap-1"><Paperclip className="w-3 h-3" />{attachCount}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(item)} disabled={isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete({ id: item.id, name: `مصروف ${item.expense_type}` })} disabled={isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow>
                  <TableCell colSpan={8} className="bg-muted/30 p-3 border-b">
                    <ExpenseAttachments expenseId={item.id} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default ExpensesDesktopTable;
