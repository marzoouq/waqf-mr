/**
 * مودال تأكيد حذف عقار — مستخرج من PropertiesPage
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteTarget {
  id: string;
  name: string;
}

interface PropertyDeleteDialogProps {
  deleteTarget: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

const PropertyDeleteDialog = ({ deleteTarget, onClose, onConfirm }: PropertyDeleteDialogProps) => (
  <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
        <AlertDialogDescription>سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row-reverse gap-2">
        <AlertDialogCancel>إلغاء</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default PropertyDeleteDialog;
