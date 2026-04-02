/** جدول الفواتير للديسكتوب */
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Eye, Edit, Trash2, FileDown } from 'lucide-react';
import type { Invoice } from '@/hooks/data/useInvoices';

interface InvoicesDesktopTableProps {
  items: Invoice[];
  isLocked: boolean;
  generatePdfPending: boolean;
  typeLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  statusBadgeVariant: (status: string) => 'default' | 'destructive' | 'secondary' | 'outline';
  onViewFile: (file: { path: string; name: string | null }) => void;
  onGeneratePdf: (ids: string[]) => void;
  onPreview: (item: Invoice) => void;
  onEdit: (item: Invoice) => void;
  onDelete: (target: { id: string; name: string; file_path: string | null }) => void;
}

const InvoicesDesktopTable = ({
  items, isLocked, generatePdfPending,
  typeLabels, statusLabels, statusBadgeVariant,
  onViewFile, onGeneratePdf, onPreview, onEdit, onDelete,
}: InvoicesDesktopTableProps) => (
  <div className="overflow-x-auto">
    <Table className="min-w-[800px]">
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="text-right">النوع</TableHead>
          <TableHead className="text-right">رقم الفاتورة</TableHead>
          <TableHead className="text-right">المبلغ</TableHead>
          <TableHead className="text-right">التاريخ</TableHead>
          <TableHead className="text-right">العقار</TableHead>
          <TableHead className="text-right">الحالة</TableHead>
          <TableHead className="text-right">الملف</TableHead>
          <TableHead className="text-right">إجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{typeLabels[item.invoice_type] || item.invoice_type}</TableCell>
            <TableCell>{item.invoice_number || '-'}</TableCell>
            <TableCell className="font-medium">{fmt(safeNumber(item.amount))} ر.س</TableCell>
            <TableCell>{item.date}</TableCell>
            <TableCell>{item.property?.property_number || '-'}</TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(item.status)}>
                {statusLabels[item.status] || item.status}
              </Badge>
            </TableCell>
            <TableCell>
              {item.file_path ? (
                <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onViewFile({ path: item.file_path!, name: item.file_name })}>
                  <Eye className="w-4 h-4" /><span className="text-xs truncate max-w-[80px]">{item.file_name}</span>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="gap-1 text-warning" disabled={generatePdfPending} onClick={() => onGeneratePdf([item.id])}>
                  <FileDown className="w-4 h-4" /><span className="text-xs">توليد PDF</span>
                </Button>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onPreview(item)} aria-label="معاينة"><Eye className="w-4 h-4 text-primary" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)} disabled={isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })} className="text-destructive hover:text-destructive" disabled={isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default InvoicesDesktopTable;
