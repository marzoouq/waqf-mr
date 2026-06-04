/**
 * Wrapper رقيق فوق ConfirmDeleteDialog — يحافظ على API الموجود في ContractsPage.
 */
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog';

interface ContractDeleteDialogProps {
  target: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ContractDeleteDialog({ target, onClose, onConfirm }: ContractDeleteDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={!!target}
      onOpenChange={(open) => !open && onClose()}
      targetName={target?.name}
      onConfirm={onConfirm}
    />
  );
}
