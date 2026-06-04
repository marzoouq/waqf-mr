/**
 * حوار تأكيد حذف عقد عند وجود فواتير معلقة.
 * يحلّ محل `window.confirm` في `lib/contracts/invoiceSync` (Batch 2E).
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  pendingCount: number;
  contractName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteContractWithPendingDialog({
  open, pendingCount, contractName, onOpenChange, onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد حذف العقد</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-right">
              <p>
                سيتم حذف العقد «{contractName}» مع {pendingCount} فاتورة معلقة مرتبطة به.
              </p>
              <p>هل تريد المتابعة؟</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
