/**
 * جدول سطح المكتب لعرض الفواتير — المستفيد
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Eye, FileText } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS } from '@/hooks/data/useInvoices';

interface InvoiceItem {
  id: string;
  invoice_type: string;
  invoice_number: string | null;
  amount: number;
  date: string;
  status: string;
  file_path: string | null;
  file_name: string | null;
  property?: { property_number: string } | null;
}

interface InvoicesViewDesktopTableProps {
  invoices: InvoiceItem[];
  statusBadgeVariant: (status: string) => 'default' | 'destructive' | 'secondary' | 'outline';
  onViewFile: (file: { path: string; name: string | null }) => void;
  searchQuery: string;
}

export default function InvoicesViewDesktopTable({ invoices, statusBadgeVariant, onViewFile, searchQuery }: InvoicesViewDesktopTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد فواتير'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">رقم الفاتورة</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">العقار</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">الملف</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}</TableCell>
              <TableCell>{item.invoice_number || '-'}</TableCell>
              <TableCell className="font-medium">{fmt(safeNumber(item.amount))} ر.س</TableCell>
              <TableCell>{fmtDate(item.date)}</TableCell>
              <TableCell>{item.property?.property_number || '-'}</TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(item.status)}>
                  {INVOICE_STATUS_LABELS[item.status] || item.status}
                </Badge>
              </TableCell>
              <TableCell>
                {item.file_path ? (
                  <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onViewFile({ path: item.file_path!, name: item.file_name })}>
                    <Eye className="w-4 h-4" /><span className="hidden sm:inline">عرض</span>
                  </Button>
                ) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
