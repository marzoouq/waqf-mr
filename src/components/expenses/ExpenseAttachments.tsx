import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, FileText, Paperclip } from 'lucide-react';
import { useInvoices } from '@/hooks/data/invoices/useInvoices';
import { useExpenses } from '@/hooks/data/financial/expenses/useExpenses';
import { InvoiceViewer } from '@/components/invoices';
import VoucherList from './vouchers/VoucherList';

interface ExpenseAttachmentsProps {
  expenseId: string;
}

const ExpenseAttachments: React.FC<ExpenseAttachmentsProps> = ({ expenseId }) => {
  const { data: invoices = [] } = useInvoices();
  const { data: expenses = [] } = useExpenses();
  const expense = expenses.find((e) => e.id === expenseId);
  const attachments = invoices.filter((inv) => inv.expense_id === expenseId);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  return (
    <div className="py-3 px-6 bg-muted/20 space-y-4">
      {/* فواتير ZATCA المرفقة */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Paperclip className="w-3 h-3" />
          الفواتير ({attachments.length})
        </p>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد فواتير مرفقة</p>
        ) : (
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
        )}
      </div>

      {/* سندات الصرف الداخلية */}
      <div className="pt-2 border-t">
        <VoucherList
          expenseId={expenseId}
          expenseAmount={Number(expense?.amount || 0)}
          expenseDescription={expense?.description || expense?.expense_type}
        />
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
