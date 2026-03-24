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
import type { UnitRow } from '@/hooks/data/useUnits';

interface DeleteUnitDialogProps {
  unit: UnitRow | null;
  onClose: () => void;
  onConfirm: () => void;
  relatedContractsCount?: number;
}

const DeleteUnitDialog = ({ unit, onClose, onConfirm, relatedContractsCount = 0 }: DeleteUnitDialogProps) => (
  <AlertDialog open={!!unit} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>حذف الوحدة</AlertDialogTitle>
        <AlertDialogDescription>
          هل أنت متأكد من حذف الوحدة "{unit?.unit_number}"؟
          {relatedContractsCount > 0
            ? ` هذه الوحدة مرتبطة بـ ${relatedContractsCount} عقد — سيتم إلغاء ربطها بالوحدة.`
            : ' لا توجد عقود مرتبطة بهذه الوحدة.'}
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
