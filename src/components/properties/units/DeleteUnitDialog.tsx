/** حوار تأكيد حذف وحدة */
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
import type { UnitRow } from '@/hooks/useUnits';

interface DeleteUnitDialogProps {
  unit: UnitRow | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteUnitDialog = ({ unit, onClose, onConfirm }: DeleteUnitDialogProps) => (
  <AlertDialog open={!!unit} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>حذف الوحدة</AlertDialogTitle>
        <AlertDialogDescription>
          هل أنت متأكد من حذف الوحدة "{unit?.unit_number}"؟ العقود المرتبطة بها ستبقى ولكن بدون ربط بوحدة.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row-reverse gap-2">
        <AlertDialogCancel>إلغاء</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          تأكيد الحذف
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteUnitDialog;
