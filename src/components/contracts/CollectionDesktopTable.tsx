/**
 * جدول التحصيل لسطح المكتب
 */
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import type { CollectionRow } from '@/hooks/page/admin/financial/useCollectionData';
import CollectionTableRow from './CollectionTableRow';

interface CollectionDesktopTableProps {
  rows: CollectionRow[];
  expectedLabel: string;
}

const CollectionDesktopTable = ({ rows, expectedLabel }: CollectionDesktopTableProps) => (
  <div className="overflow-x-auto hidden md:block">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="text-right">رقم العقد</TableHead>
          <TableHead className="text-right">المستأجر</TableHead>
          <TableHead className="text-right">العقار</TableHead>
          <TableHead className="text-right">{expectedLabel}</TableHead>
          <TableHead className="text-right">قيمة الدفعة</TableHead>
          <TableHead className="text-center">الدفعات</TableHead>
          <TableHead className="text-right">المحصّل</TableHead>
          <TableHead className="text-right">المتأخر</TableHead>
          <TableHead className="text-center">التقدم</TableHead>
          <TableHead className="text-center">الحالة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => <CollectionTableRow key={row.contract.id} row={row} />)}
      </TableBody>
    </Table>
  </div>
);

export default CollectionDesktopTable;
