import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, ImageIcon } from 'lucide-react';
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, getInvoiceFileUrl } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import { useState } from 'react';

interface InvoiceGridViewProps {
  invoices: Invoice[];
  onEdit?: (invoice: Invoice) => void;
  readOnly?: boolean;
}

const InvoiceGridView: React.FC<InvoiceGridViewProps> = ({ invoices, onEdit, readOnly = false }) => {
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

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
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">لا توجد فواتير</p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {invoices.map((inv) => (
        <Card
          key={inv.id}
          className="group hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
          onClick={() => !readOnly && onEdit?.(inv)}
        >
          {/* Thumbnail / Icon area */}
          <div className="h-32 bg-muted/30 flex items-center justify-center border-b relative overflow-hidden">
            {isImage(inv.file_name) && inv.file_path ? (
              <>
                <img
                  src={getInvoiceFileUrl(inv.file_path)}
                  alt={inv.file_name || 'معاينة الفاتورة'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    e.currentTarget.style.display = 'none';
                    if (fallback) fallback.style.display = '';
                  }}
                />
                <ImageIcon className="w-12 h-12 text-muted-foreground/50" style={{ display: 'none' }} />
              </>
            ) : (
              <FileText className="w-12 h-12 text-muted-foreground/50" />
            )}
            {inv.file_path && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
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
              className="absolute top-2 right-2"
            >
              {INVOICE_STATUS_LABELS[inv.status] || inv.status}
            </Badge>
          </div>

          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
              </span>
              {inv.invoice_number && (
                <span className="text-xs text-muted-foreground">#{inv.invoice_number}</span>
              )}
            </div>
            <p className="text-lg font-bold text-primary">
              {Number(inv.amount).toLocaleString()} ر.س
            </p>
            <p className="text-xs text-muted-foreground">{inv.date}</p>
            {inv.property?.property_number && (
              <p className="text-xs text-muted-foreground">عقار: {inv.property.property_number}</p>
            )}
            {inv.file_name && (
              <p className="text-xs text-muted-foreground truncate" title={inv.file_name}>
                📎 {inv.file_name}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
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
