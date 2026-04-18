/**
 * بطاقة مستخدم للجوال — مُستخرَجة من UsersTable
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2, CheckCircle, XCircle, Key } from 'lucide-react';
import type { ManagedUser } from '@/hooks/auth/useUserManagement';

const getRoleBadge = (role: string | null) => {
  switch (role) {
    case 'admin': return <Badge className="bg-primary/20 text-primary">ناظر</Badge>;
    case 'beneficiary': return <Badge className="bg-secondary/20 text-secondary">مستفيد</Badge>;
    case 'waqif': return <Badge className="bg-accent/20 text-accent-foreground">واقف</Badge>;
    case 'accountant': return <Badge className="bg-success/20 text-success">محاسب</Badge>;
    default: return <Badge variant="outline">بدون دور</Badge>;
  }
};

interface Props {
  user: ManagedUser;
  isSelf: boolean;
  pendingConfirmId: string | null;
  onConfirmEmail: (userId: string) => void;
  onEdit: (user: ManagedUser) => void;
  onPasswordChange: (userId: string) => void;
  onDelete: (user: { id: string; email: string }) => void;
}

export default function UserMobileCard({
  user, isSelf, pendingConfirmId,
  onConfirmEmail, onEdit, onPasswordChange, onDelete,
}: Props) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm" dir="ltr">{user.email}</span>
              {isSelf && <Badge variant="outline" className="text-xs">أنت</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {getRoleBadge(user.role)}
              {user.email_confirmed_at ? (
                <Badge className="bg-success/20 text-success gap-1 text-xs"><CheckCircle className="w-3 h-3" />مفعل</Badge>
              ) : (
                <Badge className="bg-destructive/20 text-destructive gap-1 text-xs"><XCircle className="w-3 h-3" />غير مفعل</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <p className="text-[11px] text-muted-foreground">آخر دخول</p>
            <p className="text-sm font-medium">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' }) : 'لم يسجل دخول'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">تاريخ الإنشاء</p>
            <p className="text-sm font-medium">{new Date(user.created_at).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })}</p>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap pt-1 border-t">
          {!user.email_confirmed_at && (
            <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => onConfirmEmail(user.id)} disabled={pendingConfirmId === user.id}>
              <CheckCircle className="w-3 h-3" />{pendingConfirmId === user.id ? 'جاري...' : 'تفعيل'}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => onEdit(user)}><Edit className="w-3 h-3" />تعديل</Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => onPasswordChange(user.id)}><Key className="w-3 h-3" />كلمة المرور</Button>
          {!isSelf && (
            <Button size="sm" variant="outline" className="gap-1 text-xs h-8 text-destructive hover:text-destructive" onClick={() => onDelete({ id: user.id, email: user.email })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
