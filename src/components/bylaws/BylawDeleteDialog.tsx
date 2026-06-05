/**
 * Wrapper رقيق فوق ConfirmDeleteDialog — يحافظ على API الموجود في BylawsPage.
 */
import ConfirmDeleteDialog from '@/components/common/feedback/ConfirmDeleteDialog';
import type { BylawEntry } from '@/hooks/data/content/useBylaws';

interface DeleteDialogProps {
  deleteItem: BylawEntry | null;
  onClose: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export const BylawDeleteDialog = ({ deleteItem, onClose, onDelete, isPending }: DeleteDialogProps) => {
  const name = deleteItem?.chapter_title || deleteItem?.part_title || '';
  return (
    <ConfirmDeleteDialog
      open={!!deleteItem}
      onOpenChange={(open) => !open && onClose()}
      title="حذف البند"
      description={`هل أنت متأكد من حذف بند "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      confirmLabel="حذف"
      onConfirm={onDelete}
      isLoading={isPending}
    />
  );
};
