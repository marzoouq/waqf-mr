/** جدول الدخل للديسكتوب — مع تمرير افتراضي للبيانات الكبيرة */

import { VirtualTable } from '@/components/common';
import { TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { Income } from '@/types';
import type { SortField } from '@/hooks/page/admin/financial/useIncomePage';

import IncomeTableRow from './IncomeTableRow';

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
    <VirtualTable
      data={items}
      getKey={(item) => item.id}
      className="min-w-[650px]"
      ariaLabel="جدول الإيرادات"
      header={
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
      }
      renderRow={(item) => (
        <IncomeTableRow
          key={item.id}
          item={item}
          isLocked={isLocked}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    />
  </div>
);

export default IncomeDesktopTable;

