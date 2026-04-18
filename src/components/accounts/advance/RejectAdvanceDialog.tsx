/**
 * RejectAdvanceDialog — حوار رفض طلب السلفة مع سبب الرفض
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

const RejectAdvanceDialog = ({ open, rejectionReason, onReasonChange, onClose, onConfirm, isPending }: Props) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>رفض طلب السلفة</DialogTitle>
          <DialogDescription>يرجى إدخال سبب الرفض</DialogDescription>
        </DialogHeader>
        <Textarea
          id="advance-requests-tab-field-1"
          value={rejectionReason}
          onChange={e => onReasonChange(e.target.value)}
          placeholder="سبب الرفض..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!rejectionReason.trim() || isPending}>
            تأكيد الرفض
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectAdvanceDialog;
