/**
 * نوافذ حوار صفحة الفواتير — حذف + عارض + معاينة + إنشاء من قالب
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InvoiceViewer, InvoicePreviewDialog, CreateInvoiceFromTemplate } from '@/components/invoices';
import type { InvoicePreviewData } from '@/components/invoices';
import type { Contract } from '@/types/database';

interface DeleteTarget {
  id: string;
  name: string;
  file_path?: string | null;
}

interface InvoicesPageDialogsProps {
  deleteTarget: DeleteTarget | null;
  setDeleteTarget: (v: DeleteTarget | null) => void;
  onConfirmDelete: () => void;
  viewerFile: { path: string; name: string | null } | null;
  setViewerFile: (v: { path: string; name: string | null } | null) => void;
  previewInvoice: InvoicePreviewData | null;
  setPreviewInvoice: (v: InvoicePreviewData | null) => void;
  templateOpen: boolean;
  setTemplateOpen: (v: boolean) => void;
  contracts: { id: string; tenant_name: string; contract_number: string }[];
  properties: { id: string; property_number: string }[];
  sellerInfo: {
    name: string;
    address: string;
    vatNumber: string;
    commercialReg: string;
    bankName: string;
    bankIBAN: string;
  };
  onSaveTemplate: (data: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
}

const InvoicesPageDialogs = ({
  deleteTarget, setDeleteTarget, onConfirmDelete,
  viewerFile, setViewerFile,
  previewInvoice, setPreviewInvoice,
  templateOpen, setTemplateOpen,
  contracts, properties, sellerInfo,
  onSaveTemplate, isSaving,
}: InvoicesPageDialogsProps) => (
  <>
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
          <AlertDialogDescription>سيتم حذف الفاتورة "{deleteTarget?.name}" نهائياً مع ملفها ولا يمكن التراجع.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <InvoiceViewer open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)} filePath={viewerFile?.path || null} fileName={viewerFile?.name || null} />
    <InvoicePreviewDialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)} invoice={previewInvoice} />
    <CreateInvoiceFromTemplate
      open={templateOpen}
      onOpenChange={setTemplateOpen}
      contracts={contracts}
      properties={properties}
      sellerInfo={sellerInfo}
      onSave={onSaveTemplate}
      isSaving={isSaving}
    />
  </>
);

export default InvoicesPageDialogs;
