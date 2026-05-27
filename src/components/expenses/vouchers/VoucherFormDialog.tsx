/**
 * نموذج إنشاء سند صرف داخلي — للناظر والمحاسب.
 * - يتطلب: اسم، هوية، جوال، وصف عمل، طريقة دفع.
 * - توقيع المستلم اختياري: يُلتقط رقمياً إن كان المستلم حاضراً بجهاز لمس،
 *   وإلا يُترك ليوقّع على النسخة المطبوعة من الـ PDF.
 * - يمنع المبلغ أن يتجاوز المصروف ويمنع الازدواجية على مستوى DB.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type VoucherPaymentMethod } from '@/hooks/data/financial/useDisbursementVouchers';
import { useCreateVoucherAction, useApproveVoucherAction } from '@/hooks/page/admin/financial/useVoucherActions';
import { VOUCHER_PAYMENT_METHODS } from '@/constants/entities';
import SignaturePad from './SignaturePad';
import { toast } from 'sonner';

interface VoucherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  expenseAmount: number;
  defaultDescription?: string;
}

const EMPTY = {
  recipient_name: '',
  recipient_id_number: '',
  recipient_phone: '',
  payment_method: 'cash' as VoucherPaymentMethod,
  transfer_reference: '',
  work_description: '',
  amount: 0,
  signature_data: '',
};

const VoucherFormDialog: React.FC<VoucherFormDialogProps> = ({
  open, onOpenChange, expenseId, expenseAmount, defaultDescription,
}) => {
  const [form, setForm] = useState({ ...EMPTY, amount: expenseAmount, work_description: defaultDescription || '' });
  const createMut = useCreateVoucherAction();
  const approveMut = useApproveVoucherAction();

  const reset = () => setForm({ ...EMPTY, amount: expenseAmount, work_description: defaultDescription || '' });

  const validate = (): boolean => {
    if (!form.recipient_name.trim()) { toast.error('أدخل اسم المستلم'); return false; }
    if (!form.recipient_id_number.trim()) { toast.error('أدخل رقم الهوية'); return false; }
    if (!form.recipient_phone.trim()) { toast.error('أدخل رقم الجوال'); return false; }
    if (!form.work_description.trim()) { toast.error('أدخل وصف الأعمال المنفذة'); return false; }
    if (form.amount <= 0) { toast.error('المبلغ يجب أن يكون أكبر من صفر'); return false; }
    if (form.amount > expenseAmount) { toast.error(`المبلغ يتجاوز قيمة المصروف (${expenseAmount} ر.س)`); return false; }
    if ((form.payment_method === 'bank_transfer' || form.payment_method === 'cheque') && !form.transfer_reference.trim()) {
      toast.error('أدخل رقم التحويل / الشيك'); return false;
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v-name">اسم المستلم *</Label>
              <Input id="v-name" value={form.recipient_name}
                onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="v-id">رقم الهوية *</Label>
              <Input id="v-id" value={form.recipient_id_number}
                onChange={(e) => setForm((f) => ({ ...f, recipient_id_number: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="v-phone">رقم الجوال *</Label>
              <Input id="v-phone" value={form.recipient_phone} inputMode="tel"
                onChange={(e) => setForm((f) => ({ ...f, recipient_phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="v-amount">المبلغ (ر.س) *</Label>
              <Input id="v-amount" type="number" step="0.01" min="0" max={expenseAmount}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              <p className="text-[11px] text-muted-foreground mt-1">المصروف: {expenseAmount} ر.س</p>
            </div>
            <div>
              <Label>طريقة الدفع *</Label>
              <Select value={form.payment_method}
                onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v as VoucherPaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(VOUCHER_PAYMENT_METHODS) as Array<[VoucherPaymentMethod, string]>).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="v-ref">رقم التحويل / الشيك</Label>
              <Input id="v-ref" value={form.transfer_reference}
                disabled={form.payment_method === 'cash' || form.payment_method === 'other'}
                onChange={(e) => setForm((f) => ({ ...f, transfer_reference: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label htmlFor="v-desc">الأعمال المنفذة *</Label>
            <Textarea id="v-desc" rows={3} value={form.work_description}
              onChange={(e) => setForm((f) => ({ ...f, work_description: e.target.value }))} />
          </div>

          <div>
            <Label>توقيع المستلم (اختياري)</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              اتركه فارغاً إن لم يكن المستلم حاضراً — سيُخصَّص سطر للتوقيع اليدوي على النسخة المطبوعة.
            </p>
            <SignaturePad value={form.signature_data}
              onChange={(d) => setForm((f) => ({ ...f, signature_data: d }))} />
          </div>

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
