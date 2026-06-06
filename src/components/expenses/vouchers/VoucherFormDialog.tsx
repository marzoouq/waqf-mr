/**
 * نموذج إنشاء سند صرف داخلي — للناظر والمحاسب.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateVoucherAction, useApproveVoucherAction } from '@/hooks/page/admin/financial/useVoucherActions';
import { uiNotify } from '@/lib/notify';
import VoucherFormFields, { type VoucherFormState } from './VoucherFormFields';

interface VoucherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  expenseAmount: number;
  defaultDescription?: string;
}

const EMPTY: VoucherFormState = {
  recipient_name: '',
  recipient_id_number: '',
  recipient_phone: '',
  payment_method: 'cash',
  transfer_reference: '',
  work_description: '',
  amount: 0,
  signature_data: '',
};

const VoucherFormDialog: React.FC<VoucherFormDialogProps> = ({
  open, onOpenChange, expenseId, expenseAmount, defaultDescription,
}) => {
  const [form, setForm] = useState<VoucherFormState>({ ...EMPTY, amount: expenseAmount, work_description: defaultDescription || '' });
  const createMut = useCreateVoucherAction();
  const approveMut = useApproveVoucherAction();

  const reset = () => setForm({ ...EMPTY, amount: expenseAmount, work_description: defaultDescription || '' });

  const validate = (): boolean => {
    if (!form.recipient_name.trim()) { uiNotify.error('أدخل اسم المستلم'); return false; }
    if (!form.recipient_id_number.trim()) { uiNotify.error('أدخل رقم الهوية'); return false; }
    if (!form.recipient_phone.trim()) { uiNotify.error('أدخل رقم الجوال'); return false; }
    if (!form.work_description.trim()) { uiNotify.error('أدخل وصف الأعمال المنفذة'); return false; }
    if (form.amount <= 0) { uiNotify.error('المبلغ يجب أن يكون أكبر من صفر'); return false; }
    if (form.amount > expenseAmount) { uiNotify.error(`المبلغ يتجاوز قيمة المصروف (${expenseAmount} ر.س)`); return false; }
    if ((form.payment_method === 'bank_transfer' || form.payment_method === 'cheque') && !form.transfer_reference.trim()) {
      uiNotify.error('أدخل رقم التحويل / الشيك'); return false;
    }
    return true;
  };

  const buildPayload = () => ({
    expense_id: expenseId,
    amount: form.amount,
    recipient_name: form.recipient_name.trim(),
    recipient_id_number: form.recipient_id_number.trim(),
    recipient_phone: form.recipient_phone.trim(),
    payment_method: form.payment_method,
    transfer_reference: form.transfer_reference.trim(),
    work_description: form.work_description.trim(),
    signature_data: form.signature_data,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createMut.mutateAsync(buildPayload());
      reset();
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  const submitAndApprove = async () => {
    if (!validate()) return;
    try {
      const voucherId = await createMut.mutateAsync(buildPayload());
      await approveMut.mutateAsync(voucherId);
      reset();
      onOpenChange(false);
    } catch {
      /* toast handled in hooks */
    }
  };

  const isBusy = createMut.isPending || approveMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>سند صرف داخلي</DialogTitle>
          <DialogDescription>
            يُستخدم لتوثيق المصروفات النقدية بدون فاتورة ضريبية (عمالة يومية، أعمال صغيرة…).
            تُنشأ كمسودة، ثم تُعتمد لإصدار PDF يُطبع ويوقّع عليه المستلم ورقياً.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <VoucherFormFields form={form} setForm={setForm} expenseAmount={expenseAmount} />

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
              إصدار لاحقاً
            </Button>
            <Button type="submit" variant="secondary" disabled={isBusy}>
              {createMut.isPending && !approveMut.isPending ? 'جارٍ الحفظ…' : 'حفظ كمسودة'}
            </Button>
            <Button type="button" onClick={submitAndApprove} disabled={isBusy}>
              {approveMut.isPending ? 'جارٍ الاعتماد…' : 'حفظ واعتماد + PDF'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VoucherFormDialog;
