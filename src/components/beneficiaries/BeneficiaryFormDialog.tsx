import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Link, IdCard } from 'lucide-react';

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

const BeneficiaryFormDialog = ({ isOpen, setIsOpen, formData, setFormData, isEditing, isPending, availableUsers, onSubmit, onReset }: BeneficiaryFormDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) onReset(); }}>
      <DialogTrigger asChild><Button className="gradient-primary gap-2"><Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة مستفيد</span></Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل المستفيد' : 'إضافة مستفيد جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل بيانات مستفيد</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
          <div className="space-y-2"><Label>الاسم *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="اسم المستفيد" /></div>
          <div className="space-y-2"><Label>نسبة الحصة (%) *</Label><Input type="number" step="0.01" value={formData.share_percentage} onChange={(e) => setFormData({ ...formData, share_percentage: e.target.value })} placeholder="7.14" /></div>
          <div className="space-y-2"><Label>رقم الهاتف</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" /></div>
          <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" dir="ltr" /></div>
          <div className="space-y-2"><Label>رقم الحساب البنكي</Label><Input value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} placeholder="SA..." dir="ltr" /></div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><IdCard className="w-4 h-4" />رقم الهوية الوطنية</Label>
            <Input value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} placeholder="1234567890" dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Link className="w-4 h-4" />ربط بحساب مستخدم</Label>
            <Select
              value={formData.user_id || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, user_id: value === '__none__' ? '' : value })}
            >
              <SelectTrigger dir="ltr">
                <SelectValue placeholder="اختر مستخدم للربط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون ربط</SelectItem>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">اختر حساب المستفيد لربطه بملفه الشخصي</p>
          </div>
          <div className="space-y-2"><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>{isEditing ? 'تحديث' : 'إضافة'}</Button>
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); onReset(); }}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BeneficiaryFormDialog;
