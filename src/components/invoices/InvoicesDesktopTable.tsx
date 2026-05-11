/** جدول الفواتير للديسكتوب */
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import type { Invoice } from '@/hooks/data/invoices/useInvoices';
import InvoiceTableRow from './InvoiceTableRow';

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
  <div className="overflow-x-auto hidden md:block">
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
          <InvoiceTableRow
            key={item.id}
            item={item}
            isLocked={isLocked}
            generatePdfPending={generatePdfPending}
            typeLabels={typeLabels}
            statusLabels={statusLabels}
            statusBadgeVariant={statusBadgeVariant}
            onViewFile={onViewFile}
            onGeneratePdf={onGeneratePdf}
            onPreview={onPreview}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  </div>
);

export default InvoicesDesktopTable;
