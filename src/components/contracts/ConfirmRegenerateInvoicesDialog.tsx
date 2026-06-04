/**
 * حوار تأكيد إعادة توليد الفواتير عند وجود فواتير مدفوعة.
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
  paidCount: number;
  pendingCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmRegenerateInvoicesDialog({
  open, paidCount, pendingCount, onOpenChange, onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد تعديل العقد</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-right">
              <p>هذا العقد لديه {paidCount} فاتورة مدفوعة محفوظة (لن تُمسّ).</p>
              <p>
                {pendingCount > 0
                  ? `سيتم حذف ${pendingCount} فاتورة معلقة وإعادة توليدها وفق القيم الجديدة.`
                  : 'سيتم توليد فواتير جديدة للفترات المتبقية.'}
              </p>
              <p>هل تريد المتابعة؟</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>متابعة</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
