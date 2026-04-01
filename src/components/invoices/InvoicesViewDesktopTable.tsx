/**
 * عرض الفواتير للمستفيد — جدول سطح المكتب (قراءة فقط)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS } from '@/hooks/data/useInvoices';
import { safeNumber } from '@/utils/safeNumber';
import { fmt, fmtDate } from '@/utils/format';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import TablePagination from '@/components/TablePagination';

interface InvoiceItem {
  id: string;
  invoice_type: string;
  invoice_number: string | null;
  description: string | null;
  amount: number;
  date: string;
  status: string;
  file_path: string | null;
  file_name: string | null;
  property?: { property_number: string } | null;
}

interface Props {
  invoices: InvoiceItem[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showAttachments: boolean;
  onViewFile: (path: string, name: string | null) => void;
  searchQuery: string;
  statusBadgeVariant: (status: string) => 'default' | 'destructive' | 'secondary' | 'outline';
  isLoading: boolean;
}

export default function InvoicesViewDesktopTable({
  invoices, currentPage, itemsPerPage, onPageChange,
  showAttachments, onViewFile, searchQuery, statusBadgeVariant, isLoading,
}: Props) {
  if (isLoading) {
    return (
      <Card className="shadow-sm hidden md:block">
        <CardContent className="p-4"><TableSkeleton rows={5} cols={5} /></CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="shadow-sm hidden md:block">
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد فواتير'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hidden md:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">البيان</TableHead>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العقار</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                {showAttachments && <TableHead className="text-right">الملف</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={item.description || '-'}>{item.description || '-'}</TableCell>
                  <TableCell>{item.invoice_number || '-'}</TableCell>
                  <TableCell className="font-medium">{fmt(safeNumber(item.amount))} ر.س</TableCell>
                  <TableCell>{fmtDate(item.date)}</TableCell>
                  <TableCell>{item.property?.property_number || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(item.status)}>
                      {INVOICE_STATUS_LABELS[item.status] || item.status}
                    </Badge>
                  </TableCell>
                  {showAttachments && (
                    <TableCell>
                      {item.file_path ? (
                        <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onViewFile(item.file_path!, item.file_name)}>
                          <Eye className="w-4 h-4" /><span className="hidden sm:inline">عرض</span>
                        </Button>
                      ) : '-'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination currentPage={currentPage} totalItems={invoices.length} itemsPerPage={itemsPerPage} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}
