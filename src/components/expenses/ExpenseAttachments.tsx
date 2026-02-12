import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, FileText, Paperclip } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';

interface ExpenseAttachmentsProps {
  expenseId: string;
}

const ExpenseAttachments: React.FC<ExpenseAttachmentsProps> = ({ expenseId }) => {
  const { data: invoices = [] } = useInvoices();
  const attachments = invoices.filter((inv) => inv.expense_id === expenseId);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  if (attachments.length === 0) {
    return (
      <div className="py-3 px-6 text-sm text-muted-foreground flex items-center gap-2">
        <Paperclip className="w-4 h-4" />
        لا توجد فواتير مرفقة لهذا المصروف
      </div>
    );
  }

  return (
    <div className="py-3 px-6 bg-muted/20 space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Paperclip className="w-3 h-3" />
        المرفقات ({attachments.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => (
          <Button
            key={att.id}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => att.file_path && setViewerFile({ path: att.file_path, name: att.file_name })}
          >
            <FileText className="w-3 h-3" />
            {att.file_name || 'مستند'}
            {att.file_path && <Eye className="w-3 h-3" />}
          </Button>
        ))}
      </div>
      <InvoiceViewer
        open={!!viewerFile}
        onOpenChange={(open) => !open && setViewerFile(null)}
        filePath={viewerFile?.path || null}
        fileName={viewerFile?.name || null}
      />
    </div>
  );
};

export default ExpenseAttachments;
