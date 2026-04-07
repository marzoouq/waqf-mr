import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Link, IdCard } from 'lucide-react';
import { getNationalIdError } from '@/utils/format/validateNationalId';
import { IBAN_SA_REGEX, SAUDI_PHONE_REGEX } from '@/utils/validation';

export interface BeneficiaryFormData {
  name: string;
  share_percentage: string;
  phone: string;
  email: string;
  bank_account: string;
  notes: string;
  user_id: string;
  national_id: string;
}

interface AuthUser { id: string; email: string; }

interface BeneficiaryFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formData: BeneficiaryFormData;
  setFormData: (data: BeneficiaryFormData) => void;
  isEditing: boolean;
  isPending: boolean;
  availableUsers: AuthUser[];
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

const validateIBAN = (v: string) => !v || IBAN_SA_REGEX.test(v.replace(/\s/g, ''));

const BeneficiaryFormDialog = ({ isOpen, setIsOpen, formData, setFormData, isEditing, isPending, availableUsers, onSubmit, onReset }: BeneficiaryFormDialogProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'الاسم مطلوب';
    const pct = parseFloat(formData.share_percentage);
    if (!Number.isFinite(pct) || pct <= 0) newErrors.share_percentage = 'النسبة يجب أن تكون أكبر من صفر';
    if (formData.national_id) {
      const nidErr = getNationalIdError(formData.national_id);
      if (nidErr) newErrors.national_id = nidErr;
    }
    if (formData.bank_account && !validateIBAN(formData.bank_account)) newErrors.bank_account = 'صيغة IBAN غير صحيحة (SA + 22 رقم)';
    if (formData.phone && !SAUDI_PHONE_REGEX.test(formData.phone.trim())) newErrors.phone = 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSubmit(e);
  };

  const userOptions = [
    { value: '__none__', label: 'بدون ربط' },
    ...availableUsers.map(user => ({ value: user.id, label: user.email })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { onReset(); setErrors({}); } }}>
      <DialogTrigger asChild><Button className="gradient-primary gap-2"><Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة مستفيد</span></Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل المستفيد' : 'إضافة مستفيد جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل بيانات مستفيد</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
          <div className="space-y-2">
            <Label htmlFor="beneficiary-form-dialog-field-1">الاسم *</Label>
            <Input name="name" id="beneficiary-form-dialog-field-1" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="اسم المستفيد" maxLength={100} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiary-form-dialog-field-2">نسبة الحصة (%) *</Label>
            <Input name="share_percentage" id="beneficiary-form-dialog-field-2" type="number" step="0.01" min="0.01" value={formData.share_percentage} onChange={(e) => setFormData({ ...formData, share_percentage: e.target.value })} placeholder="7.14" />
            {errors.share_percentage && <p className="text-xs text-destructive">{errors.share_percentage}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiary-form-dialog-field-3">رقم الهاتف</Label>
            <Input name="phone" id="beneficiary-form-dialog-field-3" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" maxLength={15} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-2"><Label htmlFor="beneficiary-form-dialog-field-4">البريد الإلكتروني</Label><Input name="email" id="beneficiary-form-dialog-field-4" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" dir="ltr" maxLength={255} /></div>
          <div className="space-y-2">
            <Label htmlFor="beneficiary-form-dialog-field-5">رقم الحساب البنكي (IBAN)</Label>
            <Input name="bank_account" id="beneficiary-form-dialog-field-5" value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} placeholder="SA0000000000000000000000" dir="ltr" maxLength={24} />
            {errors.bank_account && <p className="text-xs text-destructive">{errors.bank_account}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiary-form-dialog-field-6" className="flex items-center gap-2"><IdCard className="w-4 h-4" />رقم الهوية الوطنية</Label>
            <Input name="national_id" id="beneficiary-form-dialog-field-6" value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '') })} placeholder="1234567890" dir="ltr" maxLength={10} />
            {errors.national_id && <p className="text-xs text-destructive">{errors.national_id}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiary-form-dialog-select-1" className="flex items-center gap-2"><Link className="w-4 h-4" />ربط بحساب مستخدم</Label>
            <NativeSelect id="beneficiary-form-dialog-select-1" value={formData.user_id || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, user_id: value === '__none__' ? '' : value })}
              options={userOptions}
            />
            <p className="text-xs text-muted-foreground">اختر حساب المستفيد لربطه بملفه الشخصي</p>
          </div>
          <div className="space-y-2"><Label htmlFor="beneficiary-form-dialog-field-7">ملاحظات</Label><Input name="notes" id="beneficiary-form-dialog-field-7" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" maxLength={500} /></div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>{isEditing ? 'تحديث' : 'إضافة'}</Button>
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); onReset(); setErrors({}); }}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BeneficiaryFormDialog;
