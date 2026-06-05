/**
 * Wrapper رقيق فوق ConfirmDeleteDialog — يحافظ على API الموجود في PropertiesPage.
 */
import ConfirmDeleteDialog from '@/components/common/feedback/ConfirmDeleteDialog';

interface DeleteTarget { id: string; name: string }

interface PropertyDeleteDialogProps {
  deleteTarget: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

const PropertyDeleteDialog = ({ deleteTarget, onClose, onConfirm }: PropertyDeleteDialogProps) => (
  <ConfirmDeleteDialog
    open={!!deleteTarget}
    onOpenChange={(open) => !open && onClose()}
    targetName={deleteTarget?.name}
    onConfirm={onConfirm}
  />
);

export default PropertyDeleteDialog;
