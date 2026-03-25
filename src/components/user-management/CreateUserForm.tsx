/**
 * نموذج إنشاء مستخدم جديد
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateForm {
  email: string;
  password: string;
  role: string;
  nationalId: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateForm;
  setForm: (form: CreateForm) => void;
  onSubmit: (data: CreateForm) => void;
  isPending: boolean;
}

const CreateUserForm = ({ open, onOpenChange, form, setForm, onSubmit, isPending }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button className="gradient-primary gap-2">
        <UserPlus className="w-4 h-4" />
        إنشاء مستخدم
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
        <DialogDescription className="sr-only">نموذج إنشاء حساب مستخدم جديد</DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\d{10}$/.test(form.nationalId)) {
            toast.error('رقم الهوية يجب أن يتكون من 10 أرقام بالضبط');
            return;
          }
          if (form.password.length < 8) {
            toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return;
          }
          onSubmit(form);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="create-user-form-field-1">اسم المستخدم</Label>
          <Input id="create-user-form-field-1" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="أدخل اسم المستخدم" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-user-form-field-2">البريد الإلكتروني</Label>
          <Input id="create-user-form-field-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" dir="ltr" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-user-password">كلمة المرور</Label>
          <Input id="create-user-password" name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" dir="ltr" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-user-form-field-3">رقم الهوية الوطنية</Label>
          <Input id="create-user-form-field-3"
            type="text"
            value={form.nationalId}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              if (v.length <= 10) setForm({ ...form, nationalId: v });
            }}
            placeholder="1234567890" dir="ltr" required maxLength={10} inputMode="numeric" pattern="[0-9]{10}"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-user-form-field-4">الدور</Label>
          <NativeSelect id="create-user-form-field-4" value={form.role} onValueChange={(v) => setForm({ ...form, role: v })} options={[
            { value: 'admin', label: 'ناظر (Admin)' },
            { value: 'accountant', label: 'محاسب' },
            { value: 'beneficiary', label: 'مستفيد' },
            { value: 'waqif', label: 'واقف' },
          ]} />
        </div>
        <Button type="submit" className="w-full gradient-primary" disabled={isPending}>
          {isPending ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
        </Button>
      </form>
    </DialogContent>
  </Dialog>
);

export default CreateUserForm;
