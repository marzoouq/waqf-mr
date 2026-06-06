import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VOUCHER_PAYMENT_METHODS } from '@/constants/entities';
import { type VoucherPaymentMethod } from '@/hooks/data/financial/distribution/useDisbursementVouchers';
import SignaturePad from './SignaturePad';

export interface VoucherFormState {
  recipient_name: string;
  recipient_id_number: string;
  recipient_phone: string;
  payment_method: VoucherPaymentMethod;
  transfer_reference: string;
  work_description: string;
  amount: number;
  signature_data: string;
}

interface Props {
  form: VoucherFormState;
  setForm: React.Dispatch<React.SetStateAction<VoucherFormState>>;
  expenseAmount: number;
}

const VoucherFormFields = ({ form, setForm, expenseAmount }: Props) => (
  <>
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
  </>
);

export default VoucherFormFields;
