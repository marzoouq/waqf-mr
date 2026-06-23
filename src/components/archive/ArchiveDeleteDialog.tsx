/**
 * Dialog تأكيد حذف وثيقة (يحذف row + ملف storage).
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { ArchivedDocument } from '@/types/archive';

interface Props {
  target: ArchivedDocument | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  pending: boolean;
}

const ArchiveDeleteDialog = ({ target, onClose, onConfirm, pending }: Props) => {
  if (!target) return null;
  return (
    <AlertDialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>حذف وثيقة</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف الوثيقة <strong>«{target.title}»</strong>؟
            <br />
            سيتم حذف الملف من التخزين نهائياً ولا يمكن استرجاعه.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); void onConfirm(); }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            حذف نهائي
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ArchiveDeleteDialog;
