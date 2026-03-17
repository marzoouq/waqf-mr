import { Card, CardContent } from '@/components/ui/card';
import { safeNumber } from '@/utils/safeNumber';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, ImageIcon, Calendar, Building2, Hash, Receipt } from 'lucide-react';
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import TablePagination from '@/components/TablePagination';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface InvoiceGridViewProps {
  invoices: Invoice[];
  onEdit?: (invoice: Invoice) => void;
  readOnly?: boolean;
}

const ITEMS_PER_PAGE = 12;

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  paid: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  pending: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  overdue: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  cancelled: { color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-muted' },
};

const InvoiceGridView: React.FC<InvoiceGridViewProps> = ({ invoices, onEdit, readOnly = false }) => {
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return invoices.slice(start, start + ITEMS_PER_PAGE);
  }, [invoices, currentPage]);

  const statusBadgeVariant = (status: string) => {
    if (status === 'paid') return 'default' as const;
    if (status === 'cancelled') return 'destructive' as const;
    return 'secondary' as const;
  };

  const isImage = (fileName: string | null) => {
    if (!fileName) return false;
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  };

  if (invoices.length === 0) {
    return (
      <div className="py-12 text-center">
        <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">لا توجد فواتير</p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {paginated.map((inv) => {
        const config = statusConfig[inv.status] || statusConfig.pending;
        return (
          <Card
            key={inv.id}
            className={cn(
              'group hover:shadow-lg transition-all duration-200 overflow-hidden border',
              config.border,
              !readOnly && 'cursor-pointer hover:-translate-y-0.5'
            )}
            onClick={() => !readOnly && onEdit?.(inv)}
          >
            {/* شريط الحالة العلوي */}
            <div className={cn('h-1', config.bg.replace('/10', ''))} />

            {/* منطقة المصغر / الأيقونة */}
            <div className="h-28 bg-gradient-to-b from-muted/40 to-muted/10 flex items-center justify-center relative overflow-hidden">
              {isImage(inv.file_name) && inv.file_path ? (
                <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-[10px] truncate max-w-[120px]">{inv.file_name}</span>
                </div>
              ) : (
                <div className={cn('rounded-full p-4', config.bg)}>
                  <FileText className={cn('w-8 h-8', config.color)} />
                </div>
              )}
              {inv.file_path && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerFile({ path: inv.file_path!, name: inv.file_name });
                  }}
                >
                  <Eye className="w-3 h-3" />
                  عرض
                </Button>
              )}
              <Badge
                variant={statusBadgeVariant(inv.status)}
                className="absolute top-2 right-2 text-[10px]"
              >
                {INVOICE_STATUS_LABELS[inv.status] || inv.status}
              </Badge>
            </div>

            <CardContent className="p-3 space-y-2">
              {/* نوع الفاتورة ورقمها */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold truncate">
                  {INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                </span>
                {inv.invoice_number && (
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                    {inv.invoice_number}
                  </span>
                )}
              </div>

              {/* المبلغ */}
              <p className={cn('text-lg font-bold', config.color)}>
                {safeNumber(inv.amount).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ر.س</span>
              </p>

              {/* تفاصيل صغيرة */}
              <div className="space-y-1 pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{inv.date}</span>
                </div>
                {inv.property?.property_number && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">عقار: {inv.property.property_number}</span>
                  </div>
                )}
                {inv.vat_amount > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Hash className="w-3 h-3 shrink-0" />
                    <span>ضريبة: {safeNumber(inv.vat_amount).toLocaleString()} ر.س</span>
                  </div>
                )}
              </div>

              {inv.file_name && (
                <p className="text-[10px] text-muted-foreground truncate bg-muted/30 px-2 py-1 rounded" title={inv.file_name}>
                  📎 {inv.file_name}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
      <TablePagination
        currentPage={currentPage}
        totalItems={invoices.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
      <InvoiceViewer
        open={!!viewerFile}
        onOpenChange={(open) => !open && setViewerFile(null)}
        filePath={viewerFile?.path || null}
        fileName={viewerFile?.name || null}
      />
    </>
  );
};

export default InvoiceGridView;
