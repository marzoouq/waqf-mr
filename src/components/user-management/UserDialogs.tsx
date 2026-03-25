/**
 * حوارات إدارة المستخدمين — تعديل، كلمة مرور، حذف
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Shield, Link2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import type { ManagedUser } from '@/hooks/auth/useUserManagement';

// ======================== تعديل المستخدم ========================
interface EditDialogProps {
  editingUser: ManagedUser | null;
  onClose: () => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editRole: string;
  setEditRole: (v: string) => void;
  onUpdateEmail: (data: { userId: string; email: string }) => void;
  onSetRole: (data: { userId: string; role: string }) => void;
  isEmailPending: boolean;
  isRolePending: boolean;
  isSelf: (id: string) => boolean;
  unlinkedBeneficiaries: { id: string; name: string }[];
  onLinkBeneficiary: (data: { beneficiaryId: string; userId: string }) => void;
}

export const UserEditDialog = ({
  editingUser, onClose, editEmail, setEditEmail, editRole, setEditRole,
  onUpdateEmail, onSetRole, isEmailPending, isRolePending, isSelf,
  unlinkedBeneficiaries, onLinkBeneficiary,
}: EditDialogProps) => (
  <Dialog open={!!editingUser} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>تعديل المستخدم</DialogTitle>
        <DialogDescription className="sr-only">تعديل بيانات المستخدم وصلاحياته</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-dialogs-field-1">البريد الإلكتروني</Label>
          <Input id="user-dialogs-field-1" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} dir="ltr" />
          <Button size="sm" className="gap-1" onClick={() => editingUser && onUpdateEmail({ userId: editingUser.id, email: editEmail })} disabled={isEmailPending || editEmail === editingUser?.email}>
            <Mail className="w-3 h-3" />تحديث البريد
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-dialogs-field-2">الدور</Label>
          <NativeSelect id="user-dialogs-field-2" value={editRole} onValueChange={setEditRole} placeholder="اختر الدور" options={[
            { value: 'admin', label: 'ناظر (Admin)' },
            { value: 'accountant', label: 'محاسب' },
            { value: 'beneficiary', label: 'مستفيد' },
            { value: 'waqif', label: 'واقف' },
          ]} />
          {editingUser && isSelf(editingUser.id) && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>لا يمكنك تغيير دورك الخاص لتجنب فقدان صلاحيات الإدارة.</AlertDescription>
            </Alert>
          )}
          <Button size="sm" className="gap-1" onClick={() => editingUser && editRole && onSetRole({ userId: editingUser.id, role: editRole })} disabled={isRolePending || (editingUser ? isSelf(editingUser.id) : false)}>
            <Shield className="w-3 h-3" />تحديث الدور
          </Button>
        </div>
        {editingUser && (editingUser.role === 'beneficiary' || editRole === 'beneficiary') && unlinkedBeneficiaries.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="user-dialogs-field-3" className="flex items-center gap-2"><Link2 className="w-4 h-4" />ربط بمستفيد</Label>
            <NativeSelect id="user-dialogs-field-3"
              value=""
              onValueChange={(beneficiaryId) => {
                if (beneficiaryId && editingUser) onLinkBeneficiary({ beneficiaryId, userId: editingUser.id });
              }}
              placeholder="اختر مستفيد للربط"
              options={unlinkedBeneficiaries.map(b => ({ value: b.id, label: b.name }))}
            />
            <p className="text-xs text-muted-foreground">اختر المستفيد لربطه بهذا الحساب (المستفيدون غير المربوطين فقط)</p>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

// ======================== كلمة المرور ========================
interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  passwordDialog: string | null;
  newPassword: string;
  setNewPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onSubmit: (data: { userId: string; password: string }) => void;
  isPending: boolean;
}

export const UserPasswordDialog = ({
  open, onClose, passwordDialog, newPassword, setNewPassword,
  showPassword, setShowPassword, onSubmit, isPending,
}: PasswordDialogProps) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>تغيير كلمة المرور</DialogTitle>
        <DialogDescription>أدخل كلمة مرور جديدة قوية للمستخدم</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="change-user-password">كلمة المرور الجديدة</Label>
          <div className="relative">
            <Input id="change-user-password" name="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" dir="ltr" minLength={8} className="pl-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-xs space-y-1 mt-1">
            <p className={newPassword.length >= 8 ? 'text-success' : 'text-muted-foreground'}>• 8 أحرف على الأقل {newPassword.length >= 8 && '✓'}</p>
            <p className={/[A-Za-z]/.test(newPassword) && /\d/.test(newPassword) ? 'text-success' : 'text-muted-foreground'}>• أحرف وأرقام معاً {/[A-Za-z]/.test(newPassword) && /\d/.test(newPassword) && '✓'}</p>
            <p className="text-muted-foreground">• تجنّب كلمات المرور الشائعة (مثل 12345678)</p>
          </div>
        </div>
        <Button className="w-full" onClick={() => passwordDialog && newPassword && onSubmit({ userId: passwordDialog, password: newPassword })} disabled={isPending || newPassword.length < 8}>
          {isPending ? 'جاري التحديث والتحقق...' : 'تحديث كلمة المرور'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

// ======================== حذف ========================
interface DeleteDialogProps {
  deleteTarget: { id: string; email: string } | null;
  onClose: () => void;
  onDelete: (userId: string) => void;
}

export const UserDeleteDialog = ({ deleteTarget, onClose, onDelete }: DeleteDialogProps) => (
  <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>تأكيد حذف المستخدم</AlertDialogTitle>
        <AlertDialogDescription>
          هل أنت متأكد من حذف المستخدم <strong dir="ltr">{deleteTarget?.email}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>إلغاء</AlertDialogCancel>
        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && onDelete(deleteTarget.id)}>
          حذف
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
