/**
 * حوار تأكيد حذف بند من اللائحة
 */
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { BylawEntry } from '@/hooks/data/content/useBylaws';

interface DeleteDialogProps {
  deleteItem: BylawEntry | null;
  onClose: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export const BylawDeleteDialog = ({ deleteItem, onClose, onDelete, isPending }: DeleteDialogProps) => (
  <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>حذف البند</AlertDialogTitle>
        <AlertDialogDescription>
          هل أنت متأكد من حذف بند "{deleteItem?.chapter_title || deleteItem?.part_title}"؟ لا يمكن التراجع عن هذا الإجراء.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>إلغاء</AlertDialogCancel>
        <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          حذف
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
