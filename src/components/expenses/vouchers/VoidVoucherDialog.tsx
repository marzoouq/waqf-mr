/**
 * حوار إلغاء سند صرف — مستخرج من VoucherList.
 * state سبب الإلغاء معزول داخل هذا الحوار.
 */
import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { uiNotify } from '@/lib/notify';
import type { Voucher } from '@/hooks/data/financial/distribution/useDisbursementVouchers';

interface Props {
  target: Voucher | null;
  onClose: () => void;
  onConfirm: (voucherId: string, reason: string, onDone: () => void) => void;
  isPending: boolean;
}

const VoidVoucherDialog: React.FC<Props> = ({ target, onClose, onConfirm, isPending }) => {
  const [voidReason, setVoidReason] = useState('');

  const handleClose = () => {
    setVoidReason('');
    onClose();
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>إلغاء سند الصرف</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم إلغاء سند {target?.voucher_number} ولا يمكن التراجع. أدخل سبب الإلغاء:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">سبب الإلغاء *</Label>
          <Textarea id="void-reason" rows={3} value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)} />
        </div>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!target) return;
              if (!voidReason.trim()) { uiNotify.error('سبب الإلغاء مطلوب'); return; }
              onConfirm(target.id, voidReason.trim(), () => { setVoidReason(''); });
            }}
          >
            {isPending ? 'جارٍ الإلغاء…' : 'تأكيد الإلغاء'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VoidVoucherDialog;
