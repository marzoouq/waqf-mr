/**
 * صف مستخدم واحد (سطح المكتب فقط) — مُستخرَج من UsersTable
 * مُغلَّف بـ memo لتقليل re-renders في جدول المستخدمين.
 */
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Edit, Trash2, CheckCircle, XCircle, Key, AlertTriangle } from 'lucide-react';
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
  isOrphaned: boolean;
  onConfirmEmail: (userId: string) => void;
  onEdit: (user: ManagedUser) => void;
  onPasswordChange: (userId: string) => void;
  onDelete: (user: { id: string; email: string }) => void;
}

const UserRow = memo(function UserRow({
  user, isSelf, pendingConfirmId, isOrphaned,
  onConfirmEmail, onEdit, onPasswordChange, onDelete,
}: Props) {
  return (
    <TableRow>
      <TableCell dir="ltr">
        <span className="flex items-center gap-1">
          {user.email}
          {isSelf && <Badge variant="outline" className="mr-2 text-xs">أنت</Badge>}
          {user.role === 'beneficiary' && isOrphaned && (
            <span title="مستفيد بدون ربط صحيح"><AlertTriangle className="w-4 h-4 text-destructive shrink-0" /></span>
          )}
        </span>
      </TableCell>
      <TableCell>{getRoleBadge(user.role)}</TableCell>
      <TableCell>
        {user.email_confirmed_at ? (
          <Badge className="bg-success/20 text-success gap-1"><CheckCircle className="w-3 h-3" />مفعل</Badge>
        ) : (
          <Badge className="bg-destructive/20 text-destructive gap-1"><XCircle className="w-3 h-3" />غير مفعل</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' }) : 'لم يسجل دخول'}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {!user.email_confirmed_at && (
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onConfirmEmail(user.id)} disabled={pendingConfirmId === user.id}>
              <CheckCircle className="w-3 h-3" />{pendingConfirmId === user.id ? 'جاري التفعيل...' : 'تفعيل'}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onEdit(user)}><Edit className="w-3 h-3" />تعديل</Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onPasswordChange(user.id)}><Key className="w-3 h-3" />كلمة المرور</Button>
          {!isSelf && (
            <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => onDelete({ id: user.id, email: user.email })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

export default UserRow;
