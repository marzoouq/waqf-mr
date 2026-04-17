/**
 * #DRY — Dialog حذف موحّد للصفحات البسيطة
 * (PropertyDeleteDialog وإخوانه تبقى كما هي — منطق حذف خاص)
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName?: string;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

const ConfirmDeleteDialog = ({
  open, onOpenChange, targetName, onConfirm,
  title = 'هل أنت متأكد من الحذف؟',
  description,
  confirmLabel = 'تأكيد الحذف',
  isLoading = false,
}: ConfirmDeleteDialogProps) => {
  const desc = description ?? (
    targetName
      ? `سيتم حذف ${targetName} نهائياً ولا يمكن التراجع عن هذا الإجراء.`
      : 'لا يمكن التراجع عن هذا الإجراء.'
  );
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'جارٍ الحذف...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDeleteDialog;
